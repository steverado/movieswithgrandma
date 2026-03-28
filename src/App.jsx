import { useCallback, useState } from 'react'
import IMDbBadge from './components/IMDbBadge.jsx'
import Nav from './components/Nav.jsx'
import { runMovieAnalysis } from './lib/runMovieAnalysis.js'
import AboutPage from './pages/AboutPage.jsx'
import HomePage from './pages/HomePage.jsx'
import './App.css'

export default function App() {
  const [currentPage, setCurrentPage] = useState(/** @type {'home' | 'about'} */ ('home'))
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState(/** @type {'idle' | 'loading' | 'result' | 'error'} */ ('idle'))
  const [result, setResult] = useState(/** @type {object | null} */ (null))
  const [error, setError] = useState(/** @type {string | null} */ (null))

  const handleAboutClick = useCallback(() => {
    setCurrentPage((p) => (p === 'home' ? 'about' : 'home'))
  }, [])

  const handleSearch = useCallback(async () => {
    const q = query.trim()
    if (!q) return

    setStatus('loading')
    setError(null)
    setResult(null)

    try {
      const out = await runMovieAnalysis(q)
      if (!out.ok) {
        setError(out.error)
        setStatus('error')
        return
      }
      if (out.parsed === null || typeof out.parsed !== 'object' || Array.isArray(out.parsed)) {
        setError('WE GOT AN UNEXPECTED RESPONSE. TRY AGAIN.')
        setStatus('error')
        return
      }
      setResult(out.parsed)
      setStatus('result')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      setStatus('error')
    }
  }, [query])

  return (
    <div className="app">
      <Nav onAboutClick={handleAboutClick} />
      {currentPage === 'home' ? (
        <HomePage
          query={query}
          onQueryChange={setQuery}
          status={status}
          result={result}
          error={error}
          onSearch={handleSearch}
        />
      ) : (
        <AboutPage />
      )}
      <IMDbBadge />
    </div>
  )
}
