import ExpandableDetails from './ExpandableDetails.jsx'
import GrandmaEmoji from './GrandmaEmoji.jsx'
import Verdict from './Verdict.jsx'

/**
 * @param {{ result: Record<string, unknown> }} props
 */
export default function ResultCard({ result }) {
  const safe = Boolean(result.grandma_safe)
  const score = typeof result.grandma_score === 'number' ? result.grandma_score : 5
  const severity = String(result.imdb_severity ?? 'UNKNOWN').toUpperCase()
  const summary =
    typeof result.summary === 'string' && result.summary.trim() ? result.summary.trim() : ''
  const verdict =
    typeof result.verdict === 'string' && result.verdict.trim() ? result.verdict.trim() : ''

  return (
    <div className="result-card">
      <h2 className="result-card__headline">
        {safe ? 'GRANDMA SAFE CONTENT' : 'NOT GRANDMA SAFE'}
      </h2>
      <GrandmaEmoji score={score} />
      <p className="result-card__severity">USERS HAVE RATED THIS MOVIE &apos;{severity}&apos;</p>
      {verdict ? (
        <>
          {summary && summary !== verdict && <p className="result-card__summary">{summary}</p>}
          <Verdict>{verdict}</Verdict>
        </>
      ) : summary ? (
        <p className="result-card__summary">{summary}</p>
      ) : null}
      <ExpandableDetails
        longestSceneEstimate={/** @type {string} */ (result.longest_scene_estimate)}
        rawDescriptions={/** @type {string[]} */ (result.raw_descriptions)}
      />
    </div>
  )
}
