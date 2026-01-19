import { Pool } from "pg";

export const legacyDb = new Pool({
  connectionString: process.env.OLDDATABASE_URL,
});
