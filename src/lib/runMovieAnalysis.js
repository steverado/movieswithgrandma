import {
  getCachedMovieResult,
  setCachedMovieResult,
} from './cache/movieResultCache.js'
import { analyzeMovie } from './claude/analyzeMovie.js'
import { extractJSONString } from './claude/extractJSON.js'

/**
 * @param {string} movieTitle
 * @param {string} apiKey
 * @returns {Promise<
 *   | { ok: true, fromCache: true, parsed: object, jsonText: string }
 *   | { ok: true, fromCache: false, parsed: object, jsonText: string }
 *   | { ok: false, error: string, raw?: string }
 * >}
 */
export async function runMovieAnalysis(movieTitle, apiKey) {
  const cached = getCachedMovieResult(movieTitle)
  if (cached) {
    return {
      ok: true,
      fromCache: true,
      parsed: /** @type {object} */ (cached.parsed),
      jsonText: cached.jsonText,
    }
  }

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

  if (parsed !== null && typeof parsed === 'object') {
    setCachedMovieResult(movieTitle, { parsed, jsonText })
  }

  return {
    ok: true,
    fromCache: false,
    parsed,
    jsonText,
  }
}
