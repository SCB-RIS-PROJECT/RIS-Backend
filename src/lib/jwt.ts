import jwt from "jsonwebtoken";
import env from "@/config/env";

export interface JwtPayload {
    userId: string;
    email: string;
}

/**
 * Generate JWT token
 */
export function generateToken(payload: JwtPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, {
        expiresIn: env.JWT_EXPIRES_IN,
        issuer: "ris-api",
        audience: "ris-client",
    });
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JwtPayload | null {
    try {
        const decoded = jwt.verify(token, env.JWT_SECRET, {
            issuer: "ris-api",
            audience: "ris-client",
        }) as JwtPayload;

        return decoded;
    } catch (error) {
        return null;
    }
}

/**
 * Decode JWT token without verification (for debugging)
 */
export function decodeToken(token: string): JwtPayload | null {
    try {
        return jwt.decode(token) as JwtPayload;
    } catch (error) {
        return null;
    }
}
