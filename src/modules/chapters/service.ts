import { db } from "../../../db/client";
import { chapters } from "../../../db/schema";
import { eq } from "drizzle-orm";
import { log } from "../../common/logger";

export const getChaptersService = async (subjectId: string) => {
  log.db("Fetching Chapters for Subject", { subjectId });
  return await db.query.chapters.findMany({
    where: eq(chapters.subjectId, subjectId),
    orderBy: (chapters, { asc }) => [asc(chapters.order)],
  });
};

export const getChapterByName = async (chapterName: string) => {
  log.db("Fetching Chapter by Name", { chapterName });
  return await db.query.chapters.findFirst({
    where: eq(chapters.name, chapterName),
  });
};
