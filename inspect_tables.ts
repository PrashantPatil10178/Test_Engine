import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.OLDDATABASE_URL,
});

async function inspectTable(tableName: string) {
  const res = await pool.query(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1`,
    [tableName],
  );
  console.log(`\nTable: ${tableName}`);
  console.table(
    res.rows.map((row) => ({ name: row.column_name, type: row.data_type })),
  );
}

async function inspect() {
  try {
    await inspectTable("Subject");
    await inspectTable("QuestionBankChapter");
    await inspectTable("QuestionBankQuestion");
    await inspectTable("QuestionBankOption");
    await inspectTable("Course"); // Just in case
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

inspect();
