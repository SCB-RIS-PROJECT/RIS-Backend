import { pinoLogger as logger } from "hono-pino";
import pino from "pino";
import pretty from "pino-pretty";
import env from "@/config/env";

export const loggerPino = pino(
    {
        level: env.LOG_LEVEL || "info",
    },
    env.NODE_ENV === "production" ? undefined : pretty()
);

export const pinoLogger = logger({
    pino: loggerPino,
});
