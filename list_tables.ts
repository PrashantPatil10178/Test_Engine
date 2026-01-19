import { Pool } from "pg";

console.log("Connecting to:", process.env.OLDDATABASE_URL);

const pool = new Pool({
  connectionString: process.env.OLDDATABASE_URL,
});

async function listTables() {
  try {
    const res = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
    );
    console.log(
      "Tables found:",
      res.rows.map((r) => r.table_name),
    );
  } catch (err) {
    console.error("Error connecting to legacy DB:", err);
  } finally {
    await pool.end();
  }
}

listTables();
