import { db } from "../../../db/client";
import { subjects, standards } from "../../../db/schema";
import { eq, and } from "drizzle-orm";
import { log } from "../../common/logger";

export const getSubjectsService = async (standard?: "STD_11" | "STD_12") => {
  log.db("Fetching Subjects", { standard });
  if (standard) {
    const stdRecord = await db.query.standards.findFirst({
      where: eq(standards.standard, standard),
    });

    if (!stdRecord) return [];

    return await db.query.subjects.findMany({
      where: eq(subjects.standardId, stdRecord.id),
      orderBy: (subjects, { asc }) => [asc(subjects.order)],
    });
  }

  return await db.query.subjects.findMany({
    orderBy: (subjects, { asc }) => [asc(subjects.order)],
    with: {
      // We can infer standard if needed, or join
    },
  });
};
