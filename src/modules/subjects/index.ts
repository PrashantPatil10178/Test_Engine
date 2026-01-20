import { Elysia, t } from "elysia";
import { getSubjectsService } from "./service";
import { successResponse, errorResponse } from "../../common/response";

export const subjectsRoutes = new Elysia({ prefix: "/subjects" }).get(
  "/",
  async ({ query }) => {
    try {
      const standard = query.standard as "STD_11" | "STD_12" | undefined;
      const data = await getSubjectsService(standard);
      return successResponse(data);
    } catch (e) {
      return errorResponse("Failed to fetch subjects", e);
    }
  },
  {
    query: t.Object({
      standard: t.Optional(t.Union([t.Literal("STD_11"), t.Literal("STD_12")])),
    }),
  },
);
