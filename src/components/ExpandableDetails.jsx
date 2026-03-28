import { useState } from 'react'
import { resolveContentFlagsForDisplay } from '../lib/flagLabels.js'

/**
 * @param {{
 *   contentFlags?: string[],
 *   longestSceneEstimate?: string,
 *   rawDescriptions?: string[],
 * }} props
 */
export default function ExpandableDetails({ contentFlags, longestSceneEstimate, rawDescriptions }) {
  const [open, setOpen] = useState(false)
  const flagItems = resolveContentFlagsForDisplay(contentFlags)

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
          {flagItems.length > 0 && (
            <div className="expandable-details__flags">
              {flagItems.map(({ key, name, description }) => (
                <div key={key} className="expandable-details__flag">
                  <div className="expandable-details__flag-name">{name}</div>
                  {description ? (
                    <div className="expandable-details__flag-desc">{description}</div>
                  ) : null}
                </div>
              ))}
            </div>
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
