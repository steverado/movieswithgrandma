import {
  getCachedMovieResult,
  setCachedMovieResult,
} from './cache/movieResultCache.js'
import { analyzeMovieApiUrl } from './apiBase.js'

/**
 * @param {string} url
 * @param {RequestInit} init
 * @param {{ retries?: number, backoffMs?: number }} [opts]
 * @returns {Promise<Response>}
 */
async function fetchWithRetry(url, init, opts = {}) {
  const retries = opts.retries ?? 1
  const backoffMs = opts.backoffMs ?? 1600
  let lastErr = /** @type {unknown} */ (null)
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fetch(url, { ...init, cache: 'no-store' })
    } catch (e) {
      lastErr = e
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, backoffMs))
      }
    }
  }
  throw lastErr
}

function humanizeFetchError(err) {
  const name = err instanceof Error ? err.name : ''
  const msg = err instanceof Error ? err.message : String(err)
  const combined = `${name} ${msg}`.toLowerCase()
  if (combined.includes('failed to fetch') || combined.includes('networkerror')) {
    return 'NETWORK BLIP — COULDN’T REACH THE SERVER. CHECK YOUR CONNECTION AND TRY AGAIN. IF IT KEEPS HAPPENING, THE SEARCH MAY BE TIMING OUT; WAIT A MINUTE AND RETRY.'
  }
  if (combined.includes('aborted') || combined.includes('abort')) {
    return 'REQUEST WAS CANCELLED. TRY AGAIN.'
  }
  return msg || 'SOMETHING WENT WRONG. TRY AGAIN.'
}

/**
 * Dev-only: call Anthropic from the browser when VITE_ANTHROPIC_API_KEY is set.
 * Dynamic import keeps Anthropic client code out of production bundles.
 *
 * @param {string} movieTitle
 * @param {string} apiKey
 * @returns {Promise<
 *   | { ok: true, fromCache: false, parsed: object, jsonText: string }
 *   | { ok: false, error: string, raw?: string }
 * >}
 */
async function runViaClientAnthropic(movieTitle, apiKey) {
  const [{ analyzeMovie }, { extractJSONString, parseStructuredJsonFromModelText }] =
    await Promise.all([import('./claude/analyzeMovie.js'), import('./claude/extractJSON.js')])
  const message = await analyzeMovie(apiKey, movieTitle)
  const jsonText = extractJSONString(message)

  let parsed = null
  try {
    parsed = parseStructuredJsonFromModelText(jsonText)
  } catch {
    return {
      ok: false,
      error: 'We got a response, but it was not valid JSON. Try again.',
      raw: jsonText,
    }
  }

  if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
    setCachedMovieResult(movieTitle, { parsed, jsonText })
  }

  return {
    ok: true,
    fromCache: false,
    parsed,
    jsonText,
  }
}

/**
 * @param {string} movieTitle
 * @returns {Promise<
 *   | { ok: true, fromCache: true, parsed: object, jsonText: string }
 *   | { ok: true, fromCache: false, parsed: object, jsonText: string }
 *   | { ok: false, error: string, raw?: string }
 * >}
 */
export async function runMovieAnalysis(movieTitle) {
  const cached = getCachedMovieResult(movieTitle)
  if (cached) {
    return {
      ok: true,
      fromCache: true,
      parsed: /** @type {object} */ (cached.parsed),
      jsonText: cached.jsonText,
    }
  }

  const devKey =
    import.meta.env.DEV && import.meta.env.VITE_ANTHROPIC_API_KEY
      ? String(import.meta.env.VITE_ANTHROPIC_API_KEY).trim()
      : ''

  if (devKey) {
    return runViaClientAnthropic(movieTitle, devKey)
  }

  const url = analyzeMovieApiUrl()
  let res
  try {
    res = await fetchWithRetry(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ title: movieTitle }),
      },
      { retries: 1, backoffMs: 1800 },
    )
  } catch (e) {
    return { ok: false, error: humanizeFetchError(e) }
  }

  let data = null
  try {
    data = await res.json()
  } catch {
    return {
      ok: false,
      error:
        'THE SERVER SENT A NON-JSON RESPONSE (OFTEN A TIMEOUT OR GATEWAY ERROR). WAIT A BIT AND TRY AGAIN.',
    }
  }

  if (!res.ok || !data || data.ok !== true) {
    const err =
      (data && typeof data.error === 'string' && data.error) ||
      `Request failed (${res.status})`
    return { ok: false, error: err, raw: typeof data.raw === 'string' ? data.raw : undefined }
  }

  const parsed = data.parsed
  const jsonText = typeof data.jsonText === 'string' ? data.jsonText : JSON.stringify(parsed)

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: 'Unexpected response from API.' }
  }

  setCachedMovieResult(movieTitle, { parsed, jsonText })

  return {
    ok: true,
    fromCache: false,
    parsed,
    jsonText,
  }
}
