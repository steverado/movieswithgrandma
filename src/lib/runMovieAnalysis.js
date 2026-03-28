import {
  getCachedMovieResult,
  setCachedMovieResult,
} from './cache/movieResultCache.js'
import { analyzeMovieApiUrl } from './apiBase.js'

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
  const [{ analyzeMovie }, { extractJSONString }] = await Promise.all([
    import('./claude/analyzeMovie.js'),
    import('./claude/extractJSON.js'),
  ])
  const message = await analyzeMovie(apiKey, movieTitle)
  const jsonText = extractJSONString(message)

  let parsed = null
  try {
    parsed = JSON.parse(jsonText)
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

  const res = await fetch(analyzeMovieApiUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: movieTitle }),
  })

  let data = null
  try {
    data = await res.json()
  } catch {
    return {
      ok: false,
      error: 'The server returned an invalid response. Is the API running? For local dev use: npx vercel dev — or set VITE_ANTHROPIC_API_KEY in .env for dev only.',
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
