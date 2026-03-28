/**
 * @param {{ score?: number }} props
 */
export default function GrandmaEmoji({ score = 5 }) {
  let emoji = '😬'
  if (score >= 7) emoji = '👵'
  else if (score <= 3) emoji = '😱'

  return (
    <div className="grandma-emoji" aria-hidden="true">
      {emoji}
    </div>
  )
}
