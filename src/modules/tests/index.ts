import { Elysia, t } from "elysia";
import { generateTest } from "./services/generator";
import {
  startTest,
  getTestState,
  submitResponse,
  advanceSection,
} from "./services/runner";
import { successResponse, errorResponse } from "../../common/response";

export const testsRoutes = new Elysia({ prefix: "/tests" })
  // 1. Create a Test (Generates random paper)
  .post(
    "/create",
    async ({ body }) => {
      try {
        const testId = await generateTest(body.type as "PCM" | "PCB");
        return successResponse({ testId }, "Test generated successfully");
      } catch (e) {
        return errorResponse("Failed to generate test", e);
      }
    },
    {
      body: t.Object({
        type: t.Union([t.Literal("PCM"), t.Literal("PCB")]),
      }),
    },
  )

  // 2. Start Attempt
  .post(
    "/start",
    async ({ body }) => {
      try {
        const attemptId = await startTest(body.testId, body.userId);
        return successResponse({ attemptId }, "Test attempt started");
      } catch (e) {
        return errorResponse("Failed to start test", e);
      }
    },
    {
      body: t.Object({
        testId: t.String(),
        userId: t.String(),
      }),
    },
  )

  // 3. Get State (Polling / Load)
  .get("/state/:attemptId", async ({ params }) => {
    try {
      const state = await getTestState(params.attemptId);
      return successResponse(state);
    } catch (e) {
      return errorResponse("Failed to get state", e);
    }
  })

  // 4. Submit Answer (Autosave)
  .post(
    "/response",
    async ({ body }) => {
      try {
        await submitResponse(body.attemptId, body.questionId, body.optionOrder);
        return successResponse(null, "Saved");
      } catch (e) {
        return errorResponse("Failed to save response", e);
      }
    },
    {
      body: t.Object({
        attemptId: t.String(),
        questionId: t.String(),
        optionOrder: t.Number(),
      }),
    },
  )

  // 5. Force Submit Section (e.g. User clicks "Submit Section")
  .post(
    "/submit-section",
    async ({ body }) => {
      try {
        await advanceSection(body.attemptId);
        return successResponse(null, "Section submitted");
      } catch (e) {
        return errorResponse("Failed to submit section", e);
      }
    },
    {
      body: t.Object({
        attemptId: t.String(),
      }),
    },
  );
