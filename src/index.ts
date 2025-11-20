import { Hono } from "hono";
import { configCors } from "@/config/cors";
import env from "@/config/env";
import { pinoLogger } from "@/config/log";

const app = new Hono();

// log
app.use("*", pinoLogger);

// cors
app.use("*", configCors);

app.get("/", (c) => {
    return c.text("Hello Hono!");
});

export default {
    port: env.PORT,
    fetch: app.fetch,
};
