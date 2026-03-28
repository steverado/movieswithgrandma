import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

/** @type {Ratelimit | null} */
let ratelimit = null

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

/**
 * @param {string} identifier e.g. client IP
 * @throws {Error & { code?: string, reset?: number }} RATE_LIMIT_NOT_CONFIGURED | RATE_LIMITED
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

  const { success, reset } = await rl.limit(identifier)
  if (!success) {
    const err = new Error('Too many searches. Try again in a minute.')
    err.code = 'RATE_LIMITED'
    err.reset = reset
    throw err
  }
  return { reset }
}
