CREATE TYPE "public"."difficulty" AS ENUM('EASY', 'MEDIUM', 'HARD');--> statement-breakpoint
CREATE TYPE "public"."standard" AS ENUM('STD_11', 'STD_12');--> statement-breakpoint
CREATE TYPE "public"."subject_code" AS ENUM('BIO', 'CHEM', 'PHYS', 'MATHS_1', 'MATHS_2');--> statement-breakpoint
CREATE TABLE "chapters" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"order" integer NOT NULL,
	"subject_id" text NOT NULL,
	CONSTRAINT "chapters_subject_id_name_unique" UNIQUE("subject_id","name")
);
--> statement-breakpoint
CREATE TABLE "options" (
	"id" text PRIMARY KEY NOT NULL,
	"question_id" text NOT NULL,
	"order" integer NOT NULL,
	"option_text" text NOT NULL,
	CONSTRAINT "options_question_id_order_unique" UNIQUE("question_id","order")
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" text PRIMARY KEY NOT NULL,
	"chapter_id" text NOT NULL,
	"subject_id" text NOT NULL,
	"standard" "standard" NOT NULL,
	"difficulty" "difficulty" NOT NULL,
	"question_text" text NOT NULL,
	"solution" text,
	"correct_option_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "standards" (
	"id" text PRIMARY KEY NOT NULL,
	"standard" "standard" NOT NULL,
	"order" integer NOT NULL,
	CONSTRAINT "standards_standard_unique" UNIQUE("standard")
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" text PRIMARY KEY NOT NULL,
	"code" "subject_code" NOT NULL,
	"order" integer NOT NULL,
	"standard_id" text NOT NULL,
	CONSTRAINT "subjects_standard_id_code_unique" UNIQUE("standard_id","code")
);
--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "options" ADD CONSTRAINT "options_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_standard_id_standards_id_fk" FOREIGN KEY ("standard_id") REFERENCES "public"."standards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chapters_subject_id_index" ON "chapters" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "options_question_id_index" ON "options" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "questions_chapter_id_index" ON "questions" USING btree ("chapter_id");--> statement-breakpoint
CREATE INDEX "questions_subject_id_index" ON "questions" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "questions_standard_difficulty_index" ON "questions" USING btree ("standard","difficulty");--> statement-breakpoint
CREATE INDEX "subjects_standard_id_index" ON "subjects" USING btree ("standard_id");