/**
 * Base URL for API calls (empty = same origin).
 * Set VITE_API_BASE_URL only if the SPA and API are on different origins.
 */
export function getApiBaseUrl() {
  const raw = import.meta.env.VITE_API_BASE_URL
  if (typeof raw !== 'string' || !raw.trim()) return ''
  return raw.replace(/\/+$/, '')
}

export function analyzeMovieApiUrl() {
  const base = getApiBaseUrl()
  return base ? `${base}/api/analyze` : '/api/analyze'
}
