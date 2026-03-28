/** @typedef {{ name: string, description: string }} FlagLabel */

/** @type {Record<string, FlagLabel>} */
export const FLAG_LABELS = {
  suggestive_dialogue: {
    name: 'SUGGESTIVE DIALOGUE',
    description: "Words grandma will pretend she didn't hear",
  },
  nudity_brief: {
    name: 'BRIEF NUDITY',
    description: "Blink and you'll miss it. Grandma won't.",
  },
  implied_sex: {
    name: 'SEXUAL INNUENDO',
    description: 'Nothing shown. Everything understood.',
  },
  sex_scene: {
    name: 'THEY FUCKIN ON CAMERA',
    description: 'Cheeks are being clapped',
  },
  nudity_extensive: {
    name: 'A WHOLE LOT OF TITTIES',
    description:
      "Full frontal. But obviously not the first time your grandma has seen a penis.",
  },
  prolonged_sex_scene: {
    name: 'OH HELL NO, THEY REALLY FUCKIN!',
    description: 'Long enough that everyone will be frozen in discomfort.',
  },
}

/** Shown in UI; kissing / making_out / none are treated as grandma-safe noise. */
export const CONTENT_FLAGS_EXCLUDED_FROM_DISPLAY = new Set(['kissing', 'making_out', 'none'])

/**
 * @param {unknown} contentFlags
 * @returns {Array<{ key: string } & FlagLabel>}
 */
export function resolveContentFlagsForDisplay(contentFlags) {
  if (!Array.isArray(contentFlags)) return []

  const seen = new Set()
  /** @type {Array<{ key: string } & FlagLabel>} */
  const out = []

  for (const raw of contentFlags) {
    const key = String(raw).trim()
    if (!key || CONTENT_FLAGS_EXCLUDED_FROM_DISPLAY.has(key)) continue
    if (seen.has(key)) continue
    seen.add(key)

    const label = FLAG_LABELS[key]
    if (label) {
      out.push({ key, name: label.name, description: label.description })
    } else {
      out.push({
        key,
        name: key.replaceAll('_', ' ').toUpperCase(),
        description: '',
      })
    }
  }

  return out
}
