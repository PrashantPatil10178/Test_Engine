// src/modules/tests/services/runner.ts
import { db } from "../../../../db/client";
import {
  tests,
  testAttempts,
  questions,
  options,
  subjects,
} from "../../../../db/schema";
import { eq, inArray, sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";

export const startTest = async (testId: string, userId: string) => {
  // Check if user already has active attempt? (Optional)
  const attemptId = uuidv7();
  await db.insert(testAttempts).values({
    id: attemptId,
    testId,
    userId,
    status: "IN_PROGRESS",
  });
  return attemptId;
};

export const getTestState = async (attemptId: string) => {
  const attempt = await db.query.testAttempts.findFirst({
    where: eq(testAttempts.id, attemptId),
    with: {
      // test relation if defined
    },
  });
  if (!attempt) throw new Error("Attempt not found");

  const test = await db.query.tests.findFirst({
    where: eq(tests.id, attempt.testId),
  });
  if (!test) throw new Error("Test not found");

  const sectionIdx = attempt.currentSectionIndex;
  const sections = test.questionSet as any[]; // Typed jsonb

  if (sectionIdx >= sections.length) {
    return {
      status: "COMPLETED",
      score: attempt.score,
      analytics: attempt.analytics,
    };
  }

  const currentSection = sections[sectionIdx];

  // Check Timer logic
  const startTime = new Date(attempt.sectionStartTime!);
  const now = new Date();
  const elapsedMinutes = (now.getTime() - startTime.getTime()) / 60000;

  if (elapsedMinutes > currentSection.timeLimit) {
    // Auto-submit section logic here (transition next section)
    // For simplicity, we just return 'SECTION_EXPIRED' flag for frontend to trigger submit
    // or auto-advance on backend immediately.
    await advanceSection(attemptId);
    return getTestState(attemptId); // Recursively get next state
  }

  // Fetch Question Details (without correct answer)
  const qIds = currentSection.questions as string[];

  // Fetch Only IDs and Text, Options
  const qs = await db.query.questions.findMany({
    where: inArray(questions.id, qIds),
    columns: {
      id: true,
      questionText: true,
      // NO correctOptionOrder
    },
  });

  // Fetch Options
  const opt = await db
    .select()
    .from(options)
    .where(inArray(options.questionId, qIds));

  // Map questions with options (shuffle options if needed, but we rely on order)
  const mappedQs = qs.map((q) => ({
    id: q.id,
    text: q.questionText,
    options: opt
      .filter((o) => o.questionId === q.id)
      .map((o) => ({ id: o.id, text: o.optionText, order: o.order })),
  }));

  // Sort mappedQs to match the random order in `currentSection.questions`
  const orderMap = new Map(qIds.map((id, index) => [id, index]));
  mappedQs.sort(
    (a, b) => (orderMap.get(a.id) || 0) - (orderMap.get(b.id) || 0),
  );

  return {
    status: "IN_PROGRESS",
    sectionIndex: sectionIdx,
    timeLeft: Math.max(0, currentSection.timeLimit - elapsedMinutes),
    questions: mappedQs,
    responses: attempt.responses,
  };
};

export const submitResponse = async (
  attemptId: string,
  questionId: string,
  optionOrder: number,
) => {
  // Autosave response
  // Using jsonb_set or just fetching, merging, updating.
  // Drizzle update with jsonb merge:

  const attempt = await db.query.testAttempts.findFirst({
    where: eq(testAttempts.id, attemptId),
  });
  if (!attempt) throw new Error("Not found");

  const newResponses = {
    ...(attempt.responses as object),
    [questionId]: optionOrder,
  };

  await db
    .update(testAttempts)
    .set({ responses: newResponses })
    .where(eq(testAttempts.id, attemptId));

  return { success: true };
};

export const advanceSection = async (attemptId: string) => {
  const attempt = await db.query.testAttempts.findFirst({
    where: eq(testAttempts.id, attemptId),
  });
  if (!attempt) return;

  const test = await db.query.tests.findFirst({
    where: eq(tests.id, attempt.testId),
  });
  const sections = test!.questionSet as any[];

  const nextIdx = attempt.currentSectionIndex + 1;

  if (nextIdx >= sections.length) {
    // Submit Test
    await calculateScore(attemptId);
    await db
      .update(testAttempts)
      .set({
        status: "COMPLETED",
        submittedAt: new Date(),
      })
      .where(eq(testAttempts.id, attemptId));
  } else {
    await db
      .update(testAttempts)
      .set({
        currentSectionIndex: nextIdx,
        sectionStartTime: new Date(),
      })
      .where(eq(testAttempts.id, attemptId));
  }
};

async function calculateScore(attemptId: string) {
  // Evaluation Logic
  const attempt = await db.query.testAttempts.findFirst({
    where: eq(testAttempts.id, attemptId),
  });
  const test = await db.query.tests.findFirst({
    where: eq(tests.id, attempt!.testId),
  });

  const responses = attempt!.responses as Record<string, number>;
  const allQIds = Object.keys(responses);

  if (allQIds.length === 0) {
    await db
      .update(testAttempts)
      .set({ score: 0 })
      .where(eq(testAttempts.id, attemptId));
    return;
  }

  // Fetch correct answers
  const qData = await db.query.questions.findMany({
    where: inArray(questions.id, allQIds), // Warning: if user didn't answer some, we skip them here.
    // Need to fetch ALL questions in test to calculate unattempted too?
    // For score, only answered matters (no negative marking).
    columns: { id: true, correctOptionOrder: true, subjectId: true }, // Need subject to know marks
    // Actually marks depend on Subject Code. Need to join subject.
  });

  // We need subject Code to know marks (Maths=2, others=1)
  // qData needs to stick to schema.
  // Let's assume we fetch subject separately or join.
  // Simpler: Fetch all subjects once and map.

  const subjs = await db
    .select({ id: subjects.id, code: subjects.code })
    .from(subjects);
  const subMap = new Map(subjs.map((s) => [s.id, s.code]));

  let totalScore = 0;

  for (const q of qData) {
    const userAns = responses[q.id];
    if (userAns === q.correctOptionOrder) {
      const code = subMap.get(q.subjectId);
      const marks = code === "MATHS_1" || code === "MATHS_2" ? 2 : 1;
      totalScore += marks;
    }
  }

  await db
    .update(testAttempts)
    .set({ score: totalScore })
    .where(eq(testAttempts.id, attemptId));
}
