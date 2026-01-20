import { db } from "../../../db/client";
import { questions, options } from "../../../db/schema";
import { eq, and, sql } from "drizzle-orm";

type GetQuestionsParams = {
  chapterId?: string;
  subjectId?: string; // For full subject tests
  limit?: number;
  offset?: number;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
};

export const getQuestionsService = async ({
  chapterId,
  subjectId,
  limit = 20,
  offset = 0,
  difficulty,
}: GetQuestionsParams) => {
  const whereConditions = [];
  if (chapterId) whereConditions.push(eq(questions.chapterId, chapterId));
  if (subjectId) whereConditions.push(eq(questions.subjectId, subjectId));
  if (difficulty) whereConditions.push(eq(questions.difficulty, difficulty));

  const data = await db.query.questions.findMany({
    where: and(...whereConditions),
    limit: limit,
    offset: offset,
    with: {
      // Fetch options so frontend can render them
      // IMPORTANT: Never send correctOptionOrder to frontend in 'Practice' mode usually,
      // but for simple engine we might send it and hide in UI, or check on backend.
      // MHT-CET context: usually we submit answers.
      // Let's verify schema: `options` table linked to `questions`.
      // We cannot easily 'include' options via drizzle query builder if relation isn't defined in `schema.ts`.
      // Relations ARE defined in schema.ts? I should check.
    },
  });

  // Since relations might NOT be defined in the schema file I read earlier (it had table definitions but maybe not `relations` export),
  // let's do manual fetch or ensure relations exist.
  // The provided schema.ts showed `pgTable` but I didn't see `relations` from `drizzle-orm/relations`.
  // I will fetch options manually for now to be safe, or just return questions and let frontend fetch options (bad perf).
  // Better: Fetch options in a separate query if relations are missing.

  // Let's assume user wants options.
  const questionIds = data.map((q) => q.id);
  if (questionIds.length === 0) return [];

  const optionsData = await db
    .select()
    .from(options)
    .where(sql`${options.questionId} IN ${questionIds}`);

  // Merge
  return data.map((q) => ({
    ...q,
    options: optionsData
      .filter((o) => o.questionId === q.id)
      .sort((a, b) => a.order - b.order),
  }));
};
