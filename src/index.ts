import { Hono } from "hono";
import corsMiddleware from "@/config/cors";
import env from "@/config/env";
import { PinoLogger } from "@/config/log";

const app = new Hono();

// logger
app.use("*", PinoLogger());

// cors
app.use("*", corsMiddleware);

app.get("/", (c) => {
    return c.text("Hello Hono!");
});

export default {
    port: env.PORT,
    fetch: app.fetch,
};
