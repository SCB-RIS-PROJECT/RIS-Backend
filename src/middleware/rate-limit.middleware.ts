import env from "@/config/env";
import type { Context, MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";

interface RateLimitOptions {
	/**
	 * Maximum number of requests allowed within the time window
	 * @default 100
	 */
	maxRequests?: number;

	/**
	 * Time window in milliseconds
	 * @default 60000 (1 minute)
	 */
	windowMs?: number;

	/**
	 * Custom message to return when rate limit is exceeded
	 * @default "Too many requests, please try again later."
	 */
	message?: string;

	/**
	 * Status code to return when rate limit is exceeded
	 * @default 429
	 */
	statusCode?: number;

	/**
	 * Function to generate a unique key for each client
	 * @default Uses IP address from headers or connection
	 */
	keyGenerator?: (c: Context) => string;

	/**
	 * Skip rate limiting for certain requests
	 * @default undefined
	 */
	skip?: (c: Context) => boolean;

	/**
	 * Custom handler when rate limit is exceeded
	 * @default undefined
	 */
	handler?: (c: Context) => Response | Promise<Response>;
}

interface RateLimitRecord {
	count: number;
	resetTime: number;
}

class RateLimitStore {
	private store: Map<string, RateLimitRecord> = new Map();
	private cleanupInterval: Timer | null = null;

	constructor() {
		// Clean up expired entries every minute
		this.cleanupInterval = setInterval(() => {
			this.cleanup();
		}, 60000);
	}

	get(key: string): RateLimitRecord | undefined {
		return this.store.get(key);
	}

	set(key: string, record: RateLimitRecord): void {
		this.store.set(key, record);
	}

	delete(key: string): void {
		this.store.delete(key);
	}

	cleanup(): void {
		const now = Date.now();
		for (const [key, record] of Array.from(this.store.entries())) {
			if (record.resetTime < now) {
				this.store.delete(key);
			}
		}
	}

	clear(): void {
		this.store.clear();
	}

	destroy(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = null;
		}
		this.clear();
	}
}

// Global store instance
const globalStore = new RateLimitStore();

/**
 * Default key generator - extracts IP address from request
 */
function defaultKeyGenerator(c: Context): string {
	// Try to get IP from various headers (for proxies/load balancers)
	const forwarded = c.req.header("x-forwarded-for");
	if (forwarded) {
		return forwarded.split(",")[0].trim();
	}

	const realIp = c.req.header("x-real-ip");
	if (realIp) {
		return realIp;
	}

	// Fallback to a generic identifier
	return "unknown";
}

/**
 * Rate limit middleware for Hono
 *
 * @example
 * ```ts
 * // Basic usage with defaults (100 requests per minute)
 * app.use('*', rateLimitMiddleware());
 *
 * // Custom configuration
 * app.use('*', rateLimitMiddleware({
 *   maxRequests: 50,
 *   windowMs: 15 * 60 * 1000, // 15 minutes
 *   message: 'Too many requests from this IP'
 * }));
 *
 * // Apply to specific routes
 * app.use('/api/*', rateLimitMiddleware({
 *   maxRequests: 30,
 *   windowMs: 60000
 * }));
 * ```
 */
export function rateLimitMiddleware(
	options: RateLimitOptions = {},
): MiddlewareHandler {
	const {
		maxRequests = env.RATE_LIMIT_MAX,
		windowMs = env.RATE_LIMIT_WINDOW_MS,
		message = "Too many requests, please try again later.",
		statusCode = 429,
		keyGenerator = defaultKeyGenerator,
		skip,
		handler,
	} = options;

	return async (c: Context, next) => {
		// Skip rate limiting if skip function returns true
		if (skip?.(c)) {
			return next();
		}

		const key = keyGenerator(c);
		const now = Date.now();

		let record = globalStore.get(key);

		// If no record exists or the window has expired, create a new one
		if (!record || record.resetTime < now) {
			record = {
				count: 0,
				resetTime: now + windowMs,
			};
		}

		// Increment the request count
		record.count++;
		globalStore.set(key, record);

		// Calculate remaining requests and reset time
		const remaining = Math.max(0, maxRequests - record.count);
		const resetTime = Math.ceil((record.resetTime - now) / 1000);

		// Set rate limit headers
		c.header("X-RateLimit-Limit", maxRequests.toString());
		c.header("X-RateLimit-Remaining", remaining.toString());
		c.header("X-RateLimit-Reset", resetTime.toString());

		// Check if rate limit is exceeded
		if (record.count > maxRequests) {
			c.header("Retry-After", resetTime.toString());

			// Use custom handler if provided
			if (handler) {
				return handler(c);
			}

			// Default error response
			throw new HTTPException(statusCode as 429, {
				message,
				res: c.json(
					{
						success: false,
						message,
						retryAfter: resetTime,
					},
					429,
				),
			});
		}

		await next();
	};
}

/**
 * Create a rate limiter with custom store (for advanced use cases)
 */
export function createRateLimiter(options: RateLimitOptions = {}) {
	return rateLimitMiddleware(options);
}

/**
 * Preset configurations for common use cases
 */
export const rateLimitPresets = {
	/**
	 * Strict rate limit for authentication endpoints
	 * 5 requests per 15 minutes
	 */
	auth: () =>
		rateLimitMiddleware({
			maxRequests: 5,
			windowMs: 15 * 60 * 1000,
			message: "Too many authentication attempts, please try again later.",
		}),

	/**
	 * Standard API rate limit
	 * 100 requests per minute
	 */
	api: () =>
		rateLimitMiddleware({
			maxRequests: env.RATE_LIMIT_MAX,
			windowMs: env.RATE_LIMIT_WINDOW_MS,
		}),

	/**
	 * Generous rate limit for public endpoints
	 * 1000 requests per hour
	 */
	public: () =>
		rateLimitMiddleware({
			maxRequests: 1000,
			windowMs: 60 * 60 * 1000,
		}),

	/**
	 * Very strict rate limit for sensitive operations
	 * 3 requests per hour
	 */
	sensitive: () =>
		rateLimitMiddleware({
			maxRequests: 3,
			windowMs: 60 * 60 * 1000,
			message: "Rate limit exceeded for sensitive operation.",
		}),
};

/**
 * Clear all rate limit records (useful for testing)
 */
export function clearRateLimitStore(): void {
	globalStore.clear();
}

/**
 * Destroy the rate limit store and cleanup timers
 */
export function destroyRateLimitStore(): void {
	globalStore.destroy();
}

export default rateLimitMiddleware;
