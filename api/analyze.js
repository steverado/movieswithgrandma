import { assertRateLimit } from './lib/rateLimit.js'
import { analyzeMovie } from '../src/lib/claude/analyzeMovie.js'
import { extractJSONString } from '../src/lib/claude/extractJSON.js'

const MAX_TITLE_LEN = 160

/**
 * @param {import('http').ServerResponse} res
 * @param {number} status
 * @param {object} body
 */
function sendJson(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

/**
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<Record<string, unknown>>}
 */
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8')
        if (!raw.trim()) {
          resolve({})
          return
        }
        resolve(JSON.parse(raw))
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}

function clientIp(req) {
  const xf = req.headers['x-forwarded-for']
  if (typeof xf === 'string' && xf.trim()) {
    return xf.split(',')[0].trim()
  }
  if (Array.isArray(xf) && xf[0]) {
    return xf[0].split(',')[0].trim()
  }
  return req.socket?.remoteAddress || 'unknown'
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 */
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS')
    res.statusCode = 204
    return res.end()
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS')
    return sendJson(res, 405, { ok: false, error: 'Method not allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey) {
    return sendJson(res, 503, {
      ok: false,
      error:
        'Server is missing ANTHROPIC_API_KEY. Add it in the host environment (not in the browser).',
    })
  }

  let body
  try {
    body = await readJsonBody(req)
  } catch {
    return sendJson(res, 400, { ok: false, error: 'Invalid JSON body' })
  }

  const titleRaw = typeof body.title === 'string' ? body.title : ''
  const title = titleRaw.trim()
  if (!title) {
    return sendJson(res, 400, { ok: false, error: 'Missing or empty title' })
  }
  if (title.length > MAX_TITLE_LEN) {
    return sendJson(res, 400, { ok: false, error: 'Title is too long' })
  }

  const ip = clientIp(req)
  try {
    await assertRateLimit(ip)
  } catch (e) {
    const code = /** @type {{ code?: string }} */ (e).code
    if (code === 'RATE_LIMIT_NOT_CONFIGURED') {
      return sendJson(res, 503, { ok: false, error: /** @type {Error} */ (e).message })
    }
    if (code === 'RATE_LIMITED') {
      res.setHeader('Retry-After', '60')
      return sendJson(res, 429, { ok: false, error: /** @type {Error} */ (e).message })
    }
    throw e
  }

  try {
    const message = await analyzeMovie(apiKey, title)
    const jsonText = extractJSONString(message)
    let parsed = null
    try {
      parsed = JSON.parse(jsonText)
    } catch {
      return sendJson(res, 502, {
        ok: false,
        error: 'The model returned invalid JSON. Try again.',
        raw: jsonText.slice(0, 2000),
      })
    }

    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return sendJson(res, 502, { ok: false, error: 'Unexpected response shape from the model.' })
    }

    return sendJson(res, 200, {
      ok: true,
      jsonText,
      parsed,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return sendJson(res, 502, { ok: false, error: msg })
  }
}
