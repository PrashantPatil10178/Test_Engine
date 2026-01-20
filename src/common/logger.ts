import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      }
    : undefined,
});

export const log = {
  info: (msg: string, context?: any) => logger.info(context || {}, msg),
  error: (msg: string, err?: any) => logger.error({ err }, msg),
  warn: (msg: string, context?: any) => logger.warn(context || {}, msg),
  db: (msg: string, context?: any) =>
    logger.info({ ...context, type: "DB" }, `[DB] ${msg}`),
  req: (msg: string, context?: any) =>
    logger.info({ ...context, type: "HTTP" }, `[REQ] ${msg}`),
};
