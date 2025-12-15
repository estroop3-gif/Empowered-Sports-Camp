/**
 * Rate Limiting Utility
 *
 * Simple in-memory rate limiter for API endpoints.
 * For production at scale, replace with Redis-based implementation.
 */

interface RateLimitConfig {
  /** Maximum requests allowed in the time window */
  limit: number
  /** Time window in milliseconds */
  windowMs: number
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store (use Redis in production for multi-instance deployments)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up expired entries periodically
const CLEANUP_INTERVAL = 60000 // 1 minute
let cleanupTimer: NodeJS.Timeout | null = null

function startCleanup() {
  if (cleanupTimer) return
  cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < now) {
        rateLimitStore.delete(key)
      }
    }
  }, CLEANUP_INTERVAL)
  // Don't prevent process exit
  cleanupTimer.unref()
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  reset: number
  retryAfter?: number
}

/**
 * Check if a request should be rate limited
 *
 * @param identifier - Unique identifier for the client (e.g., IP, user ID)
 * @param config - Rate limit configuration
 * @returns Object with success status and rate limit info
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { limit: 100, windowMs: 60000 }
): RateLimitResult {
  startCleanup()

  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  // If no entry or expired, create new window
  if (!entry || entry.resetTime < now) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + config.windowMs,
    }
    rateLimitStore.set(identifier, newEntry)
    return {
      success: true,
      remaining: config.limit - 1,
      reset: newEntry.resetTime,
    }
  }

  // Increment count
  entry.count++

  // Check if over limit
  if (entry.count > config.limit) {
    return {
      success: false,
      remaining: 0,
      reset: entry.resetTime,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000),
    }
  }

  return {
    success: true,
    remaining: config.limit - entry.count,
    reset: entry.resetTime,
  }
}

/**
 * Rate limit configurations for different endpoint types
 */
export const rateLimitConfigs = {
  // Standard API endpoints
  api: { limit: 100, windowMs: 60000 }, // 100 req/min

  // Auth endpoints (stricter)
  auth: { limit: 10, windowMs: 60000 }, // 10 req/min

  // Heavy/expensive endpoints
  expensive: { limit: 20, windowMs: 60000 }, // 20 req/min

  // Health checks (more lenient)
  health: { limit: 300, windowMs: 60000 }, // 300 req/min
}

/**
 * Helper to get client identifier from request
 */
export function getClientIdentifier(request: Request, userId?: string): string {
  // Prefer user ID if authenticated
  if (userId) return `user:${userId}`

  // Fall back to IP address
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
  return `ip:${ip}`
}
