/**
 * API Middleware Utilities
 *
 * Reusable middleware patterns for Next.js API routes.
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIdentifier, rateLimitConfigs, type RateLimitResult } from './rate-limit'
import { apiLogger } from './logger'

type RateLimitType = keyof typeof rateLimitConfigs

/**
 * Apply rate limiting to a request
 *
 * @returns Response if rate limited, undefined if allowed
 */
export function applyRateLimit(
  request: NextRequest,
  userId?: string,
  type: RateLimitType = 'api'
): NextResponse | undefined {
  const identifier = getClientIdentifier(request, userId)
  const config = rateLimitConfigs[type]
  const result = checkRateLimit(identifier, config)

  if (!result.success) {
    apiLogger.warn('Rate limit exceeded', {
      userId,
      requestId: request.headers.get('x-request-id') || undefined,
    })

    return NextResponse.json(
      {
        error: 'Too many requests',
        retryAfter: result.retryAfter,
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': config.limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': result.reset.toString(),
          'Retry-After': result.retryAfter?.toString() || '60',
        },
      }
    )
  }

  return undefined
}

/**
 * Add rate limit headers to a response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult,
  limit: number
): NextResponse {
  response.headers.set('X-RateLimit-Limit', limit.toString())
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
  response.headers.set('X-RateLimit-Reset', result.reset.toString())
  return response
}

/**
 * Standard error response helper
 */
export function errorResponse(
  message: string,
  status: number,
  details?: Record<string, unknown>
): NextResponse {
  return NextResponse.json(
    {
      error: message,
      ...(details || {}),
    },
    { status }
  )
}

/**
 * Success response helper with consistent structure
 */
export function successResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status })
}
