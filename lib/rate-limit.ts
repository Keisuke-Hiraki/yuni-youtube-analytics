// In-memory sliding-window rate limiter.
//
// NOTE: State is kept in a module-level Map, so on serverless platforms
// (e.g. Vercel) each function instance has its own independent counters.
// This limiter therefore throttles per-instance, not globally across all
// instances of a deployment. It is sufficient as a best-effort abuse guard
// but is not a substitute for a shared store (e.g. Redis) if a hard global
// limit is required.

const requestLog = new Map<string, number[]>()

// Keys with a caller-controlled value (e.g. a spoofable X-Forwarded-For IP) could
// otherwise grow this map forever, since expired timestamp arrays were only ever
// emptied, never removed. Sweep the map opportunistically whenever it grows past
// this threshold so memory stays bounded even under many unique/forged keys.
const SWEEP_THRESHOLD = 5000

export interface RateLimitResult {
  allowed: boolean
  retryAfterSeconds?: number
}

/**
 * Removes map entries whose timestamp arrays have no entries left within the
 * current window, so keys that are no longer active don't linger forever.
 */
function sweepExpiredKeys(windowStart: number): void {
  for (const [mapKey, mapTimestamps] of requestLog) {
    const stillActive = mapTimestamps.some((timestamp) => timestamp > windowStart)
    if (!stillActive) {
      requestLog.delete(mapKey)
    }
  }
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

  // Opportunistic sweep: bound memory usage when many unique keys (e.g. forged
  // X-Forwarded-For values) accumulate, instead of only ever growing the map.
  if (requestLog.size > SWEEP_THRESHOLD) {
    sweepExpiredKeys(windowStart)
  }

  const timestamps = requestLog.get(key) || []

  // Drop expired timestamps so the map does not grow unbounded.
  const activeTimestamps = timestamps.filter((timestamp) => timestamp > windowStart)

  if (activeTimestamps.length >= limit) {
    const oldestActive = activeTimestamps[0]
    const retryAfterSeconds = Math.max(1, Math.ceil((oldestActive + windowMs - now) / 1000))
    // Persist the trimmed (expired-filtered) array; deliberately do NOT record
    // the rejected request itself, since it was not allowed.
    requestLog.set(key, activeTimestamps)
    return { allowed: false, retryAfterSeconds }
  }

  activeTimestamps.push(now)
  requestLog.set(key, activeTimestamps)
  return { allowed: true }
}
