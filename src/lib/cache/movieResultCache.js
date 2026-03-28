/**
 * Client-side cache for analyzed movies. Per-browser only; reduces repeat API spend.
 * Uses localStorage with TTL + max entries (LRU eviction).
 */

const STORAGE_KEY = 'movieswithgrandma.movieAnalysis.v1'
/** @type {number} */
const TTL_MS = 30 * 24 * 60 * 60 * 1000
const MAX_ENTRIES = 25

/**
 * @typedef {object} CachedPayload
 * @property {unknown} parsed
 * @property {string} jsonText
 */

/**
 * @typedef {object} CacheEntry
 * @property {number} storedAt
 * @property {unknown} parsed
 * @property {string} jsonText
 */

/**
 * @typedef {object} CacheState
 * @property {Record<string, CacheEntry>} entries
 * @property {string[]} lru
 */

export function normalizeMovieCacheKey(title) {
  return String(title).trim().toLowerCase().replace(/\s+/g, ' ')
}

function emptyState() {
  return { entries: {}, lru: [] }
}

/** @returns {CacheState} */
function loadState() {
  if (typeof window === 'undefined' || !window.localStorage) return emptyState()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyState()
    const data = JSON.parse(raw)
    if (!data || typeof data.entries !== 'object' || !Array.isArray(data.lru)) return emptyState()
    return { entries: data.entries, lru: data.lru }
  } catch {
    return emptyState()
  }
}

/** @param {CacheState} state */
function saveState(state) {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    console.warn('[movieResultCache] save failed (quota or private mode):', e)
  }
}

/**
 * @param {string} title
 * @returns {{ parsed: unknown, jsonText: string, storedAt: number } | null}
 */
export function getCachedMovieResult(title) {
  const key = normalizeMovieCacheKey(title)
  if (!key) return null

  const state = loadState()
  const entry = state.entries[key]
  if (!entry || typeof entry.storedAt !== 'number') return null

  if (Date.now() - entry.storedAt > TTL_MS) {
    delete state.entries[key]
    const i = state.lru.indexOf(key)
    if (i >= 0) state.lru.splice(i, 1)
    saveState(state)
    return null
  }

  const i = state.lru.indexOf(key)
  if (i >= 0) state.lru.splice(i, 1)
  state.lru.push(key)
  saveState(state)

  return {
    parsed: entry.parsed,
    jsonText: entry.jsonText,
    storedAt: entry.storedAt,
  }
}

/**
 * @param {string} title
 * @param {CachedPayload} payload
 */
export function setCachedMovieResult(title, payload) {
  const key = normalizeMovieCacheKey(title)
  if (!key || payload.parsed == null || typeof payload.jsonText !== 'string') return

  const state = loadState()

  if (!state.entries[key]) {
    while (state.lru.length >= MAX_ENTRIES) {
      const oldest = state.lru.shift()
      if (oldest) delete state.entries[oldest]
    }
  } else {
    const i = state.lru.indexOf(key)
    if (i >= 0) state.lru.splice(i, 1)
  }

  state.entries[key] = {
    storedAt: Date.now(),
    parsed: payload.parsed,
    jsonText: payload.jsonText,
  }
  state.lru.push(key)
  saveState(state)
}

/** For debugging / settings UI later */
export function movieCacheStats() {
  const state = loadState()
  return { count: state.lru.length, maxEntries: MAX_ENTRIES, ttlDays: TTL_MS / (24 * 60 * 60 * 1000) }
}
