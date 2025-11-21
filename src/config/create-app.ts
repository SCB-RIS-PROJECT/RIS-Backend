import { requestId } from "hono/request-id";
import { notFound, onError, serveEmojiFavicon } from "stoker/middlewares";
import { configCors } from "@/config/cors";
import createRouter from "@/config/create-router";
import { pinoLogger } from "@/config/log";
import { rateLimitPresets } from "@/middleware/rate-limit.middleware";

export default function createApp(options?: { skipRateLimit?: boolean }) {
    const app = createRouter();

    app.use("*", configCors);
    app.use("*", pinoLogger);
    app.use("*", requestId());

    // Skip rate limiting in test environment if specified
    if (!options?.skipRateLimit) {
        app.use("*", rateLimitPresets.api());
        app.use("/api/auth/*", rateLimitPresets.auth());
    }

    app.use("*", serveEmojiFavicon("🚀"));

    app.notFound(notFound);
    app.onError(onError);

    return app;
}
