import {
  pgTable,
  pgEnum,
  text,
  integer,
  timestamp,
  unique,
  index,
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
  id: text("id").primaryKey(),
  standard: standardEnum("standard").notNull().unique(),
  order: integer("order").notNull(),
});

export const subjects = pgTable(
  "subjects",
  {
    id: text("id").primaryKey(),
    code: subjectCodeEnum("code").notNull(),
    order: integer("order").notNull(),

    standardId: text("standard_id")
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
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    order: integer("order").notNull(),

    subjectId: text("subject_id")
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
    id: text("id").primaryKey(),

    chapterId: text("chapter_id")
      .notNull()
      .references(() => chapters.id, { onDelete: "cascade" }),

    subjectId: text("subject_id")
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
    id: text("id").primaryKey(),

    questionId: text("question_id")
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
