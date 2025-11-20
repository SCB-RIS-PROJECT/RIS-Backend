import { requestId } from "hono/request-id";
import { notFound, onError, serveEmojiFavicon } from "stoker/middlewares";
import { configCors } from "@/config/cors";
import createRouter from "@/config/create-router";
import { pinoLogger } from "@/config/log";

export default function createApp() {
    const app = createRouter();

    app.use("*", configCors);
    app.use("*", pinoLogger);
    app.use("*", requestId());
    app.use("*", serveEmojiFavicon("🚀"));

    app.notFound(notFound);
    app.onError(onError);

    return app;
}
