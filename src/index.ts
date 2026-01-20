import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { cors } from "@elysiajs/cors";
import { subjectsRoutes } from "./modules/subjects";
import { chaptersRoutes } from "./modules/chapters";
import { questionsRoutes } from "./modules/questions";
import { testsRoutes } from "./modules/tests";

const app = new Elysia()
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
  .get("/", () => "MHT-CET API is running! 🚀")
  .use(subjectsRoutes)
  .use(chaptersRoutes)
  .use(questionsRoutes)
  .use(testsRoutes)
  .listen(process.env.PORT || 3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
