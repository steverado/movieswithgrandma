import { useCallback, useState } from 'react'
import {
  getCachedMovieResult,
  setCachedMovieResult,
} from './lib/cache/movieResultCache.js'
import { analyzeMovie } from './lib/claude/analyzeMovie.js'
import { extractJSONString } from './lib/claude/extractJSON.js'
import './App.css'

const TEST_MOVIES = ['The Notebook', 'Titanic']

function getApiKey() {
  return import.meta.env.VITE_ANTHROPIC_API_KEY?.trim() || ''
}

export default function App() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [lastRaw, setLastRaw] = useState(null)
  const [lastParsed, setLastParsed] = useState(null)
  const [fromCache, setFromCache] = useState(false)
  const [customTitle, setCustomTitle] = useState('')

  const runStep1 = useCallback(async (movieTitle) => {
    const key = getApiKey()
    if (!key) {
      setError('Missing VITE_ANTHROPIC_API_KEY. Copy .env.example to .env and add your key.')
      return
    }
    setBusy(true)
    setError(null)
    setLastRaw(null)
    setLastParsed(null)
    setFromCache(false)

    try {
      const cached = getCachedMovieResult(movieTitle)
      if (cached) {
        setFromCache(true)
        console.log('[Step1] cache hit — no API call:', movieTitle)
        console.log('[Step1] cached at:', new Date(cached.storedAt).toISOString())
        console.log('[Step1] parsed:', cached.parsed)
        const p = cached.parsed
        console.log(
          '[Step1] raw_descriptions count:',
          Array.isArray(p?.raw_descriptions) ? p.raw_descriptions.length : 'n/a',
        )
        setLastRaw({ cached: true, jsonText: cached.jsonText })
        setLastParsed(cached.parsed)
        return
      }

      const message = await analyzeMovie(key, movieTitle)
      const jsonText = extractJSONString(message)

      console.log('[Step1] movie:', movieTitle)
      console.log('[Step1] stop_reason:', message.stop_reason)
      console.log('[Step1] raw text blocks JSON string:', jsonText)

      let parsed = null
      try {
        parsed = JSON.parse(jsonText)
        console.log('[Step1] parsed:', parsed)
        console.log(
          '[Step1] raw_descriptions count:',
          Array.isArray(parsed?.raw_descriptions) ? parsed.raw_descriptions.length : 'n/a',
        )
        if (parsed !== null && typeof parsed === 'object') {
          setCachedMovieResult(movieTitle, { parsed, jsonText })
        }
      } catch (e) {
        console.warn('[Step1] JSON.parse failed:', e)
      }

      setLastRaw({ message, jsonText })
      setLastParsed(parsed)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      console.error('[Step1] error:', e)
    } finally {
      setBusy(false)
    }
  }, [])

  const hasKey = Boolean(getApiKey())

  return (
    <div className="step1">
      <h1>Step 1 — pipeline check</h1>
      <p className="hint">
        Open DevTools → Console. Run a test and confirm <code>raw_descriptions</code> look like real
        IMDb Parent&apos;s Guide lines (not generic filler). Repeat searches for the same title use a{' '}
        <strong>browser cache</strong> (30-day TTL, up to 25 titles) so you don&apos;t burn credits.
      </p>

      {!hasKey && (
        <p className="warn">
          No API key in env. Add <code>VITE_ANTHROPIC_API_KEY</code> to <code>.env</code> and restart{' '}
          <code>npm run dev</code>.
        </p>
      )}

      <div className="row">
        {TEST_MOVIES.map((title) => (
          <button key={title} type="button" disabled={busy} onClick={() => runStep1(title)}>
            Test “{title}”
          </button>
        ))}
      </div>

      <div className="custom">
        <input
          type="text"
          placeholder="Other movie title"
          value={customTitle}
          disabled={busy}
          onChange={(e) => setCustomTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && customTitle.trim() && runStep1(customTitle.trim())}
        />
        <button
          type="button"
          disabled={busy || !customTitle.trim()}
          onClick={() => runStep1(customTitle.trim())}
        >
          Run
        </button>
      </div>

      {busy && <p className="status">Calling Claude (web search)…</p>}
      {error && <pre className="err">{error}</pre>}

      {lastParsed && fromCache && (
        <p className="cache-note">Loaded from this browser&apos;s cache — no API call.</p>
      )}

      {lastParsed && (
        <section className="result">
          <h2>Parsed JSON (preview)</h2>
          <pre className="json">{JSON.stringify(lastParsed, null, 2)}</pre>
        </section>
      )}

      {lastRaw && !lastParsed && (
        <section className="result">
          <h2>Raw model text (unparsed)</h2>
          <pre className="json">{lastRaw.jsonText}</pre>
        </section>
      )}
    </div>
  )
}
