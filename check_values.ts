import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.OLDDATABASE_URL,
});

async function checkValues() {
  try {
    const stds = await pool.query(
      `SELECT DISTINCT standard FROM "QuestionBankChapter"`,
    );
    console.log(
      "Standards:",
      stds.rows.map((r) => r.standard),
    );

    // Subject is just 'subject' column in QuestionBankChapter based on inspect output
    // (Wait, inspect showed 'subject' (text), 'standard' (text))
    const subjs = await pool.query(
      `SELECT DISTINCT subject FROM "QuestionBankChapter"`,
    );
    console.log(
      "Subjects:",
      subjs.rows.map((r) => r.subject),
    );

    const diffs = await pool.query(
      `SELECT DISTINCT "difficultyLevel" FROM "QuestionBankQuestion"`,
    );
    console.log(
      "Difficulties:",
      diffs.rows.map((r) => r.difficultyLevel),
    );
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

checkValues();
