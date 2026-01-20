import {
  pgTable,
  text,
  integer,
  timestamp,
  jsonb,
  boolean,
  uuid,
} from "drizzle-orm/pg-core";
import { v7 as uuidv7 } from "uuid";

export const tests = pgTable("tests", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  type: text("type").notNull(), // 'PCM' or 'PCB'

  // Store generated question IDs per section to ensure immutability
  // Structure: { section1: [qIds...], section2: [qIds...] }
  questionSet: jsonb("question_set").notNull(),

  createdAt: timestamp("created_at").defaultNow(),
});

export const testAttempts = pgTable("test_attempts", {
  id: text("id").primaryKey(),
  testId: text("test_id")
    .references(() => tests.id)
    .notNull(),
  userId: text("user_id").notNull(), // Assuming user system exists or will exist

  status: text("status").notNull(), // 'IN_PROGRESS', 'COMPLETED'

  // Tracking current section
  currentSectionIndex: integer("current_section_index").default(0).notNull(),
  sectionStartTime: timestamp("section_start_time").defaultNow(),

  // User responses: { questionId: selectedOptionOrder }
  responses: jsonb("responses").default({}).notNull(),

  score: integer("score"),
  analytics: jsonb("analytics"), // Store comprehensive report

  createdAt: timestamp("created_at").defaultNow(),
  submittedAt: timestamp("submitted_at"),
});
