import { db } from "../db/client";
import { sql } from "drizzle-orm";

async function reset() {
  console.log("Resetting database...");
  try {
    await db.execute(sql`DROP SCHEMA public CASCADE;`);
    await db.execute(sql`CREATE SCHEMA public;`);
    await db.execute(sql`GRANT ALL ON SCHEMA public TO postgres;`);
    await db.execute(sql`GRANT ALL ON SCHEMA public TO public;`);
    console.log("Database reset successfully.");
  } catch (e) {
    console.error("Failed to reset database:", e);
    process.exit(1);
  }
  process.exit(0);
}

reset();
