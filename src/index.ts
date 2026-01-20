import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { cors } from "@elysiajs/cors";
import { subjectsRoutes } from "./modules/subjects";
import { chaptersRoutes } from "./modules/chapters";
import { questionsRoutes } from "./modules/questions";
import { testsRoutes } from "./modules/tests";
import { log } from "./common/logger";

const app = new Elysia()
  .onRequest(({ request }) => {
    log.req(`${request.method} ${request.url}`);
  })
  .use(
    swagger({
      documentation: {
        info: {
          title: "MHT-CET Exam Engine API",
          version: "1.0.0",
        },
      },
    }),
  )
  .use(cors())
  .get("/", () => {
    return {
      message: "Running",
    };
  })
  .use(subjectsRoutes)
  .use(chaptersRoutes)
  .use(questionsRoutes)
  .use(testsRoutes)
  .onError(({ code, error, request }) => {
    log.error(`Error in ${request.method} ${request.url}`, {
      code,
      error: error.message,
    });
  })
  .listen(process.env.PORT || 3000);

log.info(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
