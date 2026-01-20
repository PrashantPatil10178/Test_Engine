import { v7 as uuidv7 } from "uuid";

// Replaced CUID with UUID v7 for Postgres performance
export const cuid = () => uuidv7();

export function mapStandard(std: string | number) {
  const s = String(std).trim();
  if (s === "11") return "STD_11";
  if (s === "12") return "STD_12";
  throw new Error(`Invalid standard: ${std}`);
}

export function mapSubjectCode(standard: string | number, subject: string) {
  const s = subject.trim().toLowerCase();
  const std = String(standard).trim();

  if (s === "biology") return "BIO";
  if (s === "chemistry") return "CHEM";
  if (s === "physics") return "PHYS";

  if (s === "maths" || s === "maths-1") return "MATHS_1";
  if (s === "maths-2") return "MATHS_2";

  throw new Error(`Invalid subject mapping: ${standard} / ${subject}`);
}

export function mapDifficulty(d: any) {
  const diff = String(d).toLowerCase().trim();
  if (diff === "easy") return "EASY";
  if (diff === "medium") return "MEDIUM";
  if (diff === "hard") return "HARD";
  throw new Error(`Invalid difficulty: ${d}`);
}
