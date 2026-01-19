import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.OLDDATABASE_URL,
});

async function sampleData() {
  try {
    const chapters = await pool.query(
      `SELECT * FROM "QuestionBankChapter" LIMIT 3`,
    );
    console.log("Chapters:", chapters.rows);

    const questions = await pool.query(
      `SELECT * FROM "QuestionBankQuestion" LIMIT 3`,
    );
    console.log("Questions:", questions.rows);

    if (questions.rows.length > 0) {
      const qOriginalId = questions.rows[0].originalId;
      const qId = questions.rows[0].id;

      console.log(
        `Checking options for Question ID ${qId} / OriginalID ${qOriginalId}`,
      );

      const optionsById = await pool.query(
        `SELECT * FROM "QuestionBankOption" WHERE "questionOriginalId" = $1`,
        [qId],
      );
      console.log("Options (by ID match):", optionsById.rows.length);

      const optionsByOriginalId = await pool.query(
        `SELECT * FROM "QuestionBankOption" WHERE "questionOriginalId" = $1`,
        [qOriginalId],
      );
      console.log(
        "Options (by OriginalID match):",
        optionsByOriginalId.rows.length,
      );
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

sampleData();
