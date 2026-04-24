import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

/** @type {Ratelimit | null} */
let ratelimit = null

const REDIS_CONNECT_RETRIES = 4

function getRatelimit() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null

  if (!ratelimit) {
    const redis = new Redis({ url, token })
    const perMinute = Math.max(
      1,
      Math.min(120, parseInt(process.env.RATE_LIMIT_PER_MINUTE || '20', 10)),
    )
    ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(perMinute, '1 m'),
      prefix: 'movieswithgrandma:rl',
    })
  }
  return ratelimit
}

function isStrictRateLimitMode() {
  return String(process.env.RATE_LIMIT_STRICT || '').trim() === '1'
}

/**
 * @param {unknown} e
 */
function isTransientRedisConnectivityError(e) {
  if (!(e instanceof Error)) return false
  const parts = [e.message]
  let c = /** @type {unknown} */ (e.cause)
  let depth = 0
  while (c instanceof Error && depth < 5) {
    parts.push(c.message)
    c = c.cause
    depth += 1
  }
  const combined = parts.join(' ').toLowerCase()
  return (
    combined.includes('fetch failed') ||
    combined.includes('econnreset') ||
    combined.includes('econnrefused') ||
    combined.includes('etimedout') ||
    combined.includes('eai_again') ||
    combined.includes('enotfound') ||
    combined.includes('certificate') ||
    combined.includes('tls') ||
    combined.includes('socket') ||
    combined.includes('und_err')
  )
}

/**
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * @param {Ratelimit} rl
 * @param {string} identifier
 * @param {number} limitMs
 */
async function limitOnce(rl, identifier, limitMs) {
  return await Promise.race([
    rl.limit(identifier),
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          Object.assign(new Error('Redis rate limit timeout'), { code: 'RATE_LIMIT_TIMEOUT' }),
        )
      }, limitMs)
    }),
  ])
}

/**
 * @param {string} identifier e.g. client IP
 * @throws {Error & { code?: string, reset?: number }} RATE_LIMIT_NOT_CONFIGURED | RATE_LIMITED | RATE_LIMIT_TIMEOUT | RATE_LIMIT_REDIS_ERROR
 */
export async function assertRateLimit(identifier) {
  const rl = getRatelimit()
  const deployed = process.env.VERCEL === '1'
  const isVercelDev = process.env.VERCEL_ENV === 'development'

  if (!rl) {
    if (deployed && !isVercelDev) {
      const err = new Error(
        'Rate limiting is not configured. Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in the Vercel project.',
      )
      err.code = 'RATE_LIMIT_NOT_CONFIGURED'
      throw err
    }
    return null
  }

  const limitMs = Math.min(
    15000,
    Math.max(3000, parseInt(process.env.RATE_LIMIT_REDIS_TIMEOUT_MS || '8000', 10)),
  )

  let lastErr = /** @type {unknown} */ (null)

  for (let attempt = 0; attempt < REDIS_CONNECT_RETRIES; attempt += 1) {
    try {
      const result = /** @type {{ success: boolean, reset: number }} */ (
        await limitOnce(rl, identifier, limitMs)
      )
      const { success, reset } = result
      if (!success) {
        const err = new Error('Too many searches. Try again in a minute.')
        err.code = 'RATE_LIMITED'
        err.reset = reset
        throw err
      }
      return { reset }
    } catch (e) {
      const code = /** @type {{ code?: string }} */ (e).code
      if (code === 'RATE_LIMIT_TIMEOUT' || code === 'RATE_LIMITED') {
        throw e
      }

      lastErr = e
      const transient = isTransientRedisConnectivityError(e)
      if (!transient) {
        throw e
      }

      if (attempt >= REDIS_CONNECT_RETRIES - 1) {
        break
      }

      const backoff = 300 * 2 ** attempt
      console.warn(
        `[rateLimit] Upstash attempt ${attempt + 1}/${REDIS_CONNECT_RETRIES} failed (${e instanceof Error ? e.message : String(e)}); retrying in ${backoff}ms`,
      )
      await sleep(backoff)
    }
  }

  console.error('[rateLimit] Upstash unreachable after retries:', lastErr)

  if (isStrictRateLimitMode()) {
    const err = new Error('Rate limit service unavailable. Try again in a few seconds.')
    err.code = 'RATE_LIMIT_REDIS_ERROR'
    throw err
  }

  console.error(
    '[rateLimit] Allowing request without rate limit (Upstash unreachable; set RATE_LIMIT_STRICT=1 to block instead).',
  )
  return null
}
