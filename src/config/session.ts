import { eq, type InferSelectModel } from "drizzle-orm";
import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import env from "@/config/env";
import db from "@/database/db";
import { sessionTable } from "@/database/schemas/schema-session";
import { decrypt, encrypt } from "@/lib/crypto";

const SESSION_COOKIE_NAME = env.SESSION_COOKIE_NAME;
const SESSION_TTL_MS = env.SESSION_LIFETIME_MS;

interface SessionData {
    userId: string;
    ip?: string;
    userAgent?: string;
}

export async function createSession(data: SessionData): Promise<string> {
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    const [result] = await db
        .insert(sessionTable)
        .values({
            id_user: data.userId,
            ip: data.ip || null,
            user_agent: data.userAgent || null,
            expires_at: expiresAt,
        })
        .returning();

    const sessionId = encrypt(result.id);

    return sessionId;
}

export async function getSession(sessionId: string): Promise<null | InferSelectModel<typeof sessionTable>> {
    const decryptedId = decrypt(sessionId);

    if (!decryptedId) return null;

    const [session] = await db.select().from(sessionTable).where(eq(sessionTable.id, decryptedId)).limit(1);

    if (!session) return null;

    if (new Date() > session.expires_at) {
        await db.delete(sessionTable).where(eq(sessionTable.id, decryptedId));
        return null;
    }

    return session;
}

export async function updateSession(sessionId: string): Promise<null | InferSelectModel<typeof sessionTable>> {
    const decryptedId = decrypt(sessionId);
    const newExpiresAt = new Date(Date.now() + SESSION_TTL_MS);

    if (!decryptedId) return null;

    const [session] = await db
        .update(sessionTable)
        .set({ expires_at: newExpiresAt })
        .where(eq(sessionTable.id, decryptedId))
        .returning();

    return session ?? null;
}

export async function destroySession(sessionId: string): Promise<void> {
    const decryptedId = decrypt(sessionId);

    if (!decryptedId) return;

    await db.delete(sessionTable).where(eq(sessionTable.id, decryptedId));
}

export function setSessionCookie(c: Context, sessionId: string): void {
    setCookie(c, SESSION_COOKIE_NAME, sessionId, {
        path: "/",
        secure: false,
        httpOnly: true,
        sameSite: "None",
        maxAge: SESSION_TTL_MS / 1000,
        expires: new Date(Date.now() + SESSION_TTL_MS),
    });
}

export function getSessionCookie(c: Context): string | undefined {
    return getCookie(c, SESSION_COOKIE_NAME);
}

export function clearSessionCookie(c: Context): void {
    deleteCookie(c, SESSION_COOKIE_NAME, { path: "/" });
}
