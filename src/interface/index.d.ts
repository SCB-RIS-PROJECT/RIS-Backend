// biome-ignore-all lint/complexity/noBannedTypes: <because types are needed>

import type { OpenAPIHono, RouteConfig, RouteHandler } from "@hono/zod-openapi";
import type { Schema } from "hono";
import type { PinoLogger } from "hono-pino";
import type { UserWithRolesAndPermissions } from "@/interface/user.interface";

export interface AppBindings {
    Variables: {
        logger: PinoLogger;
        user?: UserWithRolesAndPermissions;
    };
}

export type AppOpenAPI<S extends Schema = {}> = OpenAPIHono<AppBindings, S>;

export type AppRouteHandler<R extends RouteConfig> = RouteHandler<R, AppBindings>;

export type Meta = {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
    has_next_page: boolean;
    has_prev_page: boolean;
};
