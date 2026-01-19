import { db } from "../db/client";
import { legacyDb } from "../db/legacy-db";
import { eq } from "drizzle-orm";

import {
  standards,
  subjects,
  chapters,
  questions,
  options,
} from "../db/schema";

import { cuid, mapStandard, mapSubjectCode, mapDifficulty } from "./helpers";

// 🧩 STEP 2: MIGRATION STATE (ID MAPS)
const standardMap = new Map<string, string>(); // '11', '12' -> id
const subjectMap = new Map<string, string>(); // 'BIO_STD_11' -> id
const chapterMap = new Map<number, string>(); //  originalId -> id
const questionMap = new Map<number, string>(); // originalId -> id

/**
 * Creates unique key for subject map
 */
const getSubjectKey = (code: string, standardId: string) =>
  `${code}_${standardId}`;

// 🧩 STEP 3: MIGRATE STANDARDS
async function migrateStandards() {
  const data = [
    { id: cuid(), standard: "STD_11" as const, order: 1 },
    { id: cuid(), standard: "STD_12" as const, order: 2 },
  ];

  await db.insert(standards).values(data).onConflictDoNothing();

  const allStandards = await db.select().from(standards);

  for (const s of allStandards) {
    if (s.standard === "STD_11") standardMap.set("11", s.id);
    if (s.standard === "STD_12") standardMap.set("12", s.id);
  }

  console.log("✅ Standards migrated");
}

// 🧩 STEP 4: MIGRATE SUBJECTS
async function migrateSubjects() {
  // Extract subjects from QuestionBankChapter as there is no reliable Subject table
  const legacySubjects = await legacyDb.query(`
    SELECT DISTINCT subject, standard
    FROM "QuestionBankChapter"
    WHERE subject IS NOT NULL AND standard IS NOT NULL
  `);

  let orderCounter = 1;

  for (const row of legacySubjects.rows) {
    const stdId = standardMap.get(row.standard);
    if (!stdId) {
      console.warn(
        `Skipping subject ${row.subject} for unknown standard ${row.standard}`,
      );
      continue;
    }

    try {
      const code = mapSubjectCode(row.standard, row.subject);
      const mapKey = getSubjectKey(code, stdId);

      if (subjectMap.has(mapKey)) continue;

      // Check if DB already has it
      const existingSubject = await db.query.subjects.findFirst({
        where: (t, { and, eq }) =>
          and(eq(t.code, code as any), eq(t.standardId, stdId)),
      });

      if (existingSubject) {
        subjectMap.set(mapKey, existingSubject.id);
        continue;
      }

      const id = cuid();
      await db.insert(subjects).values({
        id,
        code: code as any, // Cast because helper returns string
        order: orderCounter++,
        standardId: stdId,
      });

      subjectMap.set(mapKey, id);
    } catch (e) {
      console.warn(`Skipping subject ${row.subject}: ${(e as Error).message}`);
    }
  }

  console.log("✅ Subjects migrated");
}

// 🧩 STEP 5: MIGRATE CHAPTERS
async function migrateChapters() {
  const legacyChapters = await legacyDb.query(`
    SELECT "originalId", "name", "subject", "standard"
    FROM "QuestionBankChapter"
  `);

  for (const row of legacyChapters.rows) {
    const id = cuid();
    const stdId = standardMap.get(row.standard);

    if (!stdId) {
      // console.warn(`Skipping chapter ${row.name} (OriginalID: ${row.originalId}) - No Standard ID`);
      continue;
    }

    try {
      const code = mapSubjectCode(row.standard, row.subject);
      const subjectKey = getSubjectKey(code, stdId);
      const subjectId = subjectMap.get(subjectKey);

      if (!subjectId) {
        // console.warn(`Skipping chapter ${row.name} (OriginalID: ${row.originalId}) - Subject ${row.subject} not found in map`);
        continue;
      }

      // Check if chapter already exists (by name and subject)
      // This prevents duplicate key errors on unique constraint (subjectId, name)
      const existingChapter = await db.query.chapters.findFirst({
        where: (t, { and, eq }) =>
          and(
            eq(t.subjectId, subjectId),
            eq(t.name, row.name ? row.name.trim() : "Untitled Chapter"),
          ),
      });

      if (existingChapter) {
        chapterMap.set(row.originalId, existingChapter.id);
        continue;
      }

      await db.insert(chapters).values({
        id,
        name: row.name ? row.name.trim() : "Untitled Chapter",
        order: 1, // Default to 1
        subjectId: subjectId,
      });

      chapterMap.set(row.originalId, id);
    } catch (e) {
      console.warn(`Skipping chapter ${row.name}: ${(e as Error).message}`);
    }
  }

  console.log("✅ Chapters migrated");
}

// 🧩 STEP 6: MIGRATE QUESTIONS + OPTIONS (CORE)
async function migrateQuestions() {
  console.log("⏳ Pre-fetching metadata for fast lookups...");
  
  // 1. Map Subject -> Standard
  // direct DB select avoiding relations dependency
  const allSubjects = await db.select({ id: subjects.id, standardId: subjects.standardId }).from(subjects);
  const subjectStandardMap = new Map<string, string>();
  for (const s of allSubjects) subjectStandardMap.set(s.id, s.standardId);

  // 2. Map Chapter -> Subject
  // We actually need mapping for New Chapter IDs that we just inserted.
  // We can query the DB for them.
  const allNewChapters = await db.select({ id: chapters.id, subjectId: chapters.subjectId }).from(chapters);
  const newChapterSubjectMap = new Map<string, string>();
  for (const c of allNewChapters) newChapterSubjectMap.set(c.id, c.subjectId);

  console.log("✅ Metadata lookup maps built.");

  let successCount = 0;
  let skippedCount = 0;
  let offset = 0;
  const BATCH_SIZE = 100;
  
  console.log("🚀 Starting question migration loop...");

  // Determine standard ID for "11" once
  const std11Id = standardMap.get("11");

  while (true) {
      // console.log(`⏳ Fetching batch of ${BATCH_SIZE} questions (Offset: ${offset})...`);
      
      const legacyQuestions = await legacyDb.query(`
        SELECT *
        FROM "QuestionBankQuestion"
        ORDER BY "id" ASC
        LIMIT $1 OFFSET $2
      `, [BATCH_SIZE, offset]);

      if (legacyQuestions.rows.length === 0) {
          break; // No more questions
      }

      for (const q of legacyQuestions.rows) {
        if (!q.chapterOriginalId) {
            skippedCount++;
            continue;
        }

        let legacyOptions;
        try {
            legacyOptions = await legacyDb.query(
            `SELECT * FROM "QuestionBankOption" WHERE "questionOriginalId" = $1 ORDER BY "order" ASC`,
            [q.originalId],
            );
        } catch (e) {
            console.error(`Failed to fetch options for Q ${q.id}:`, e);
            skippedCount++;
            continue;
        }

        if (legacyOptions.rows.length !== 4) {
            skippedCount++;
            continue;
        }

        // Sanitize options: Ensure 'order' is present. Fallback to index + 1 if null.
        const sanitizedOptions = legacyOptions.rows.map((o, idx) => ({
            ...o,
            order: o.order != null ? o.order : idx + 1
        }));

        const correctOption = sanitizedOptions.find((o) => o.isCorrect);

        if (!correctOption) {
            skippedCount++;
            continue;
        }

        if (!chapterMap.has(q.chapterOriginalId)) {
            skippedCount++;
            continue;
        }

        const newChapterId = chapterMap.get(q.chapterOriginalId)!;

        // Resolve Subject and Standard from Maps (Memory lookup - Fast & Safe)
        const subjectId = newChapterSubjectMap.get(newChapterId);
        if (!subjectId) {
            skippedCount++;
            continue; 
        }

        const standardId = subjectStandardMap.get(subjectId);
        if (!standardId) {
            skippedCount++;
            continue;
        }

        const standardEnum = std11Id === standardId ? "STD_11" : "STD_12";

        const questionId = cuid();

        try {
            await db.insert(questions).values({
                id: questionId,
                chapterId: newChapterId,
                subjectId: subjectId,
                standard: standardEnum as any,
                difficulty: mapDifficulty(q.difficultyLevel || "medium") as any,
                questionText: q.questionText || "",
                solution: q.solution || null,
                correctOptionOrder: correctOption.order,
            });

            questionMap.set(q.originalId, questionId);

            for (const o of sanitizedOptions) {
                await db.insert(options).values({
                    id: cuid(),
                    questionId,
                    order: o.order,
                    optionText: o.optionText || "",
                });
            }
            successCount++;
        } catch (error) {
            console.error(`Failed to insert question ${q.id}:`, error);
            skippedCount++;
        }
      }
      
      offset += BATCH_SIZE;
      console.log(`🚀 ${offset} questions processed... options migrated ..!!`);
  }

  console.log(
    `✅ Questions & Options migrated. Success: ${successCount}, Skipped: ${skippedCount}`,
  );
}

// 🧩 STEP 7: RUN EVERYTHING SAFELY
async function runMigration() {
  try {
    console.log("🚀 Starting MHT-CET migration...");

    await migrateStandards();
    await migrateSubjects();
    await migrateChapters();
    await migrateQuestions();

    console.log("🎉 MIGRATION COMPLETED SUCCESSFULLY");
    process.exit(0);
  } catch (err) {
    console.error("💥 MIGRATION FAILED");
    console.error(err);
    process.exit(1);
  }
}

runMigration();
