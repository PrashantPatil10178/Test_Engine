import { db } from "../../../db/client";
import { chapters } from "../../../db/schema";
import { eq } from "drizzle-orm";

export const getChaptersService = async (subjectId: string) => {
  return await db.query.chapters.findMany({
    where: eq(chapters.subjectId, subjectId),
    orderBy: (chapters, { asc }) => [asc(chapters.order)],
  });
};

export const getChapterByName = async (chapterName: string) => {
  return await db.query.chapters.findFirst({
    where: eq(chapters.name, chapterName),
  });
};
