import {
  pgTable,
  pgEnum,
  text,
  integer,
  timestamp,
  unique,
  index,
  jsonb,
  uuid,
} from "drizzle-orm/pg-core";

//ENUMS
export const standardEnum = pgEnum("standard", ["STD_11", "STD_12"]);

export const subjectCodeEnum = pgEnum("subject_code", [
  "BIO",
  "CHEM",
  "PHYS",
  "MATHS_1",
  "MATHS_2",
]);

export const difficultyEnum = pgEnum("difficulty", ["EASY", "MEDIUM", "HARD"]);

export const standards = pgTable("standards", {
  id: uuid("id").primaryKey().defaultRandom(),
  standard: standardEnum("standard").notNull().unique(),
  order: integer("order").notNull(),
});

export const subjects = pgTable(
  "subjects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: subjectCodeEnum("code").notNull(),
    order: integer("order").notNull(),

    standardId: uuid("standard_id")
      .notNull()
      .references(() => standards.id, { onDelete: "cascade" }),
  },
  (t) => ({
    standardCodeUnique: unique().on(t.standardId, t.code),
    standardIdx: index().on(t.standardId),
  }),
);
export const chapters = pgTable(
  "chapters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    order: integer("order").notNull(),

    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
  },
  (t) => ({
    subjectNameUnique: unique().on(t.subjectId, t.name),
    subjectIdx: index().on(t.subjectId),
  }),
);

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    chapterId: uuid("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),

    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id),

    // 🔥 denormalized for performance
    standard: standardEnum("standard").notNull(),

    difficulty: difficultyEnum("difficulty").notNull(),

    questionText: text("question_text").notNull(),
    solution: text("solution"),

    correctOptionOrder: integer("correct_option_order").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    chapterIdx: index().on(t.chapterId),
    subjectIdx: index().on(t.subjectId),
    stdDifficultyIdx: index().on(t.standard, t.difficulty),
  }),
);
export const options = pgTable(
  "options",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),

    order: integer("order").notNull(), // 1–4
    optionText: text("option_text").notNull(),
  },
  (t) => ({
    questionOrderUnique: unique().on(t.questionId, t.order),
    questionIdx: index().on(t.questionId),
  }),
);

// --- TEST ENGINE TABLES ---

export const tests = pgTable("tests", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull(), // 'PCM' or 'PCB'

  // Store generated question IDs per section to ensure immutability
  // Structure: { section1: [qIds...], section2: [qIds...] }
  questionSet: jsonb("question_set").notNull(),

  createdAt: timestamp("created_at").defaultNow(),
});

export const testAttempts = pgTable("test_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  testId: uuid("test_id")
    .references(() => tests.id)
    .notNull(),
  userId: text("user_id").notNull(), // Assuming user system exists or will exist

  status: text("status").notNull(), // 'IN_PROGRESS', 'COMPLETED'

  // Tracking current section
  currentSectionIndex: integer("current_section_index").default(0).notNull(),
  sectionStartTime: timestamp("section_start_time").defaultNow(), // When the *current* section was started

  // User responses: { questionId: selectedOptionOrder }
  responses: jsonb("responses").default({}).notNull(),

  score: integer("score"),
  analytics: jsonb("analytics"), // Store comprehensive report

  createdAt: timestamp("created_at").defaultNow(),
  submittedAt: timestamp("submitted_at"),
});
