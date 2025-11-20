// biome-ignore-all lint/style/useNodejsImportProtocol: <because of crypto module>

import crypto from "crypto";
import env from "@/config/env";

const SESSION_SECRET = env.SESSION_SECRET;
const KEY = crypto.createHash("sha256").update(SESSION_SECRET).digest(); // 32 bytes
const IV_LENGTH = 12; //12 byte recommended AES-GCM

export function base64urlEncode(buf: Buffer): string {
    return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function base64urlDecode(str: string): Buffer {
    str = str.replace(/-/g, "+").replace(/_/g, "/");
    const pad = 4 - (str.length % 4);
    if (pad !== 4) {
        str += "=".repeat(pad);
    }
    return Buffer.from(str, "base64");
}

export function encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);

    const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();

    const buf = Buffer.concat([iv, tag, encrypted]);
    return base64urlEncode(buf);
}

export function decrypt(token: string): string | null {
    try {
        const buf = base64urlDecode(token);
        const iv = buf.subarray(0, IV_LENGTH);
        const tag = buf.subarray(IV_LENGTH, IV_LENGTH + 16); // tag 16 byte
        const ciphertext = buf.subarray(IV_LENGTH + 16);

        const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
        decipher.setAuthTag(tag);

        const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

        return decrypted.toString("utf8");
    } catch {
        return null;
    }
}

export async function hashPassword(password: string): Promise<string> {
    return await Bun.password.hash(password, {
        algorithm: "bcrypt",
        cost: 10,
    });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return await Bun.password.verify(password, hash);
}
