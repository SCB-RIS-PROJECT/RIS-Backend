import { Hono } from "hono";
import env from "@/config/env";
import { PinoLogger } from "@/config/log";

const app = new Hono();

app.use(PinoLogger());

app.get("/", (c) => {
    return c.text("Hello Hono!");
});

export default {
    port: env.PORT,
    fetch: app.fetch,
};
