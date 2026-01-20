/**
 * Simple In-Memory Cache
 *
 * Provides basic caching for expensive queries.
 * For production at scale, replace with Redis or similar.
 */

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<unknown>>()
  private cleanupTimer: NodeJS.Timeout | null = null

  constructor() {
    this.startCleanup()
  }

  private startCleanup() {
    // Clean up expired entries every minute
    this.cleanupTimer = setInterval(() => {
      const now = Date.now()
      for (const [key, entry] of this.cache.entries()) {
        if (entry.expiresAt < now) {
          this.cache.delete(key)
        }
      }
    }, 60000)
    this.cleanupTimer.unref()
  }

  /**
   * Get a cached value
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined
    if (!entry) return null
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key)
      return null
    }
    return entry.value
  }

  /**
   * Set a cached value
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttlMs - Time to live in milliseconds (default: 5 minutes)
   */
  set<T>(key: string, value: T, ttlMs = 300000): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    })
  }

  /**
   * Delete a cached value
   */
  delete(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Delete all cached values matching a pattern
   */
  deletePattern(pattern: string): void {
    const regex = new RegExp(pattern.replace('*', '.*'))
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Clear all cached values
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get or set a cached value
   * If the value is not cached, the factory function is called and the result is cached
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlMs = 300000
  ): Promise<T> {
    const cached = this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    const value = await factory()
    this.set(key, value, ttlMs)
    return value
  }
}

// Export singleton instance
export const cache = new SimpleCache()

/**
 * Cache TTL presets (in milliseconds)
 */
export const cacheTTL = {
  short: 60000,       // 1 minute - for frequently changing data
  medium: 300000,     // 5 minutes - default
  long: 900000,       // 15 minutes - for rarely changing data
  veryLong: 3600000,  // 1 hour - for static/config data
}

/**
 * Generate cache key for user-specific data
 */
export function userCacheKey(userId: string, resource: string): string {
  return `user:${userId}:${resource}`
}

/**
 * Generate cache key for tenant-specific data
 */
export function tenantCacheKey(tenantId: string, resource: string): string {
  return `tenant:${tenantId}:${resource}`
}
