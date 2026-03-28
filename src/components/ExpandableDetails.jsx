import { useState } from 'react'

function formatFlags(flags) {
  if (!Array.isArray(flags) || flags.length === 0) return ''
  return flags
    .map((f) => String(f).replaceAll('_', ' '))
    .join(', ')
}

/**
 * @param {{
 *   contentFlags?: string[],
 *   longestSceneEstimate?: string,
 *   rawDescriptions?: string[],
 * }} props
 */
export default function ExpandableDetails({ contentFlags, longestSceneEstimate, rawDescriptions }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="expandable-details">
      <button
        type="button"
        className="expandable-details__toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        EXPAND FOR ADDITIONAL INFO
      </button>
      {open && (
        <div className="expandable-details__panel">
          {formatFlags(contentFlags) && (
            <p className="expandable-details__line">
              <span className="expandable-details__label">FLAGS: </span>
              {formatFlags(contentFlags)}
            </p>
          )}
          {longestSceneEstimate && (
            <p className="expandable-details__line">
              <span className="expandable-details__label">LONGEST SCENE: </span>
              {longestSceneEstimate}
            </p>
          )}
          {Array.isArray(rawDescriptions) &&
            rawDescriptions.map((para, i) => (
              <p key={i} className="expandable-details__para">
                {para}
              </p>
            ))}
        </div>
      )}
    </div>
  )
}
