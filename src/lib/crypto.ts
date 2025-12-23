// biome-ignore-all lint/style/useNodejsImportProtocol: <because of crypto module>

/**
 * Crypto utilities for password hashing
 * Note: encrypt/decrypt functions removed as session-based auth is deprecated in favor of JWT
 */

export async function hashPassword(password: string): Promise<string> {
    return await Bun.password.hash(password, {
        algorithm: "bcrypt",
        cost: 10,
    });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return await Bun.password.verify(password, hash);
}
