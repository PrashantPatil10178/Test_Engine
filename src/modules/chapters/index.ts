import { Elysia, t } from "elysia";
import { getChaptersService } from "./service";
import { successResponse, errorResponse } from "../../common/response";

export const chaptersRoutes = new Elysia({ prefix: "/chapters" }).get(
  "/",
  async ({ query }) => {
    try {
      const data = await getChaptersService(query.subjectId);
      return successResponse(data);
    } catch (e) {
      return errorResponse("Failed to fetch chapters", e);
    }
  },
  {
    query: t.Object({
      subjectId: t.String(),
    }),
  },
);
