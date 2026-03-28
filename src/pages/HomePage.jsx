import ErrorState from '../components/ErrorState.jsx'
import LoadingState from '../components/LoadingState.jsx'
import ResultCard from '../components/ResultCard.jsx'
import SearchBar from '../components/SearchBar.jsx'

/**
 * @param {{
 *   query: string,
 *   onQueryChange: (q: string) => void,
 *   status: 'idle' | 'loading' | 'result' | 'error',
 *   result: object | null,
 *   error: string | null,
 *   onSearch: () => void,
 * }} props
 */
export default function HomePage({
  query,
  onQueryChange,
  status,
  result,
  error,
  onSearch,
}) {
  const idleLayout = status === 'idle'

  return (
    <main className={`home-page ${idleLayout ? 'home-page--idle' : ''}`}>
      <div className="home-page__inner">
        <SearchBar
          value={query}
          onChange={onQueryChange}
          onSearch={onSearch}
          disabled={status === 'loading'}
        />
        {status === 'loading' && <LoadingState />}
        {status === 'error' && <ErrorState message={error} />}
        {status === 'result' && result && <ResultCard result={result} />}
      </div>
    </main>
  )
}
