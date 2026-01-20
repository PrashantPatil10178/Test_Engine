import { Elysia, t } from "elysia";
import { getQuestionsService } from "./service";
import { successResponse, errorResponse } from "../../common/response";

export const questionsRoutes = new Elysia({ prefix: "/questions" }).get(
  "/",
  async ({ query }) => {
    try {
      const data = await getQuestionsService({
        chapterId: query.chapterId,
        subjectId: query.subjectId,
        limit: query.limit ? parseInt(query.limit) : 20,
        offset: query.offset ? parseInt(query.offset) : 0,
        difficulty: query.difficulty as any,
      });
      return successResponse(data);
    } catch (e) {
      return errorResponse("Failed to fetch questions", e);
    }
  },
  {
    query: t.Object({
      chapterId: t.Optional(t.String()),
      subjectId: t.Optional(t.String()),
      limit: t.Optional(t.String()), // Query params come as strings usually
      offset: t.Optional(t.String()),
      difficulty: t.Optional(
        t.Union([t.Literal("EASY"), t.Literal("MEDIUM"), t.Literal("HARD")]),
      ),
    }),
  },
);
