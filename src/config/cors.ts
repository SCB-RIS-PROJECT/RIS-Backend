import { cors } from "hono/cors";
import env from "@/config/env";

const ENV_ORIGINS = env.ALLOWED_ORIGINS;
const ALLOWED_ORIGINS = ENV_ORIGINS.split(",").map((origin) => origin.trim());
const ALLOWED_METHODS = ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"];
const ALLOWED_HEADERS = [
    "Content-Type",
    "X-CSRF-Token",
    "X-Requested-With",
    "Accept",
    "Accept-Version",
    "Content-Length",
    "Content-MD5",
    "Date",
    "X-Api-Version",
    "Authorization",
    "X-Default-Locale",
];

export const configCors = cors({
    origin: ALLOWED_ORIGINS,
    allowHeaders: ALLOWED_HEADERS,
    allowMethods: ALLOWED_METHODS,
    credentials: true,
});
