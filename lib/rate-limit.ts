// In-memory sliding-window rate limiter.
//
// NOTE: State is kept in a module-level Map, so on serverless platforms
// (e.g. Vercel) each function instance has its own independent counters.
// This limiter therefore throttles per-instance, not globally across all
// instances of a deployment. It is sufficient as a best-effort abuse guard
// but is not a substitute for a shared store (e.g. Redis) if a hard global
// limit is required.

const requestLog = new Map<string, number[]>()

export interface RateLimitResult {
  allowed: boolean
  retryAfterSeconds?: number
}

/**
 * Checks and records a request against a sliding window rate limit.
 *
 * @param key - identifier for the caller (e.g. IP address)
 * @param limit - maximum number of requests allowed within the window
 * @param windowMs - window size in milliseconds
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const windowStart = now - windowMs

  const timestamps = requestLog.get(key) || []

  // Drop expired timestamps so the map does not grow unbounded.
  const activeTimestamps = timestamps.filter((timestamp) => timestamp > windowStart)

  if (activeTimestamps.length >= limit) {
    const oldestActive = activeTimestamps[0]
    const retryAfterSeconds = Math.max(1, Math.ceil((oldestActive + windowMs - now) / 1000))
    requestLog.set(key, activeTimestamps)
    return { allowed: false, retryAfterSeconds }
  }

  activeTimestamps.push(now)
  requestLog.set(key, activeTimestamps)
  return { allowed: true }
}
