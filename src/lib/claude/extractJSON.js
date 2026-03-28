/**
 * @param {{ content?: Array<{ type: string, text?: string }> }} message
 */
export function extractTextFromMessage(message) {
  if (!message?.content || !Array.isArray(message.content)) return ''
  return message.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
}

/**
 * Strip accidental markdown fences from model output.
 * @param {{ content?: Array<{ type: string, text?: string }> }} message
 */
export function extractJSONString(message) {
  return extractTextFromMessage(message)
    .replace(/```json\s*/gi, '')
    .replace(/```/g, '')
    .trim()
}

/**
 * Strip fences / trim a raw model string (when you already have text, not a message object).
 * @param {string} text
 */
export function stripJsonFences(text) {
  return String(text)
    .replace(/```json\s*/gi, '')
    .replace(/```/g, '')
    .trim()
}

/**
 * Extract `{ ... }` with string-aware brace matching from `start`.
 * @param {string} s
 * @param {number} start
 * @returns {string | null}
 */
function sliceBalancedObject(s, start) {
  let depth = 0
  let inString = false
  for (let i = start; i < s.length; i++) {
    const c = s[i]
    if (inString) {
      if (c === '\\') {
        i += 1
        continue
      }
      if (c === '"') inString = false
      continue
    }
    if (c === '"') {
      inString = true
      continue
    }
    if (c === '{') depth += 1
    else if (c === '}') {
      depth -= 1
      if (depth === 0) return s.slice(start, i + 1)
    }
  }
  return null
}

/**
 * Models often prepend "Let me search…" before the JSON. Parse strict JSON first,
 * then fall back to the last balanced object that looks like our schema.
 *
 * @param {string} text
 * @returns {object}
 */
export function parseStructuredJsonFromModelText(text) {
  const s = stripJsonFences(text)

  try {
    const direct = JSON.parse(s)
    if (direct && typeof direct === 'object' && !Array.isArray(direct)) return direct
  } catch {
    /* fall through */
  }

  for (let start = s.lastIndexOf('{'); start !== -1; start = s.lastIndexOf('{', start - 1)) {
    const chunk = sliceBalancedObject(s, start)
    if (!chunk) continue
    try {
      const parsed = JSON.parse(chunk)
      if (
        parsed &&
        typeof parsed === 'object' &&
        !Array.isArray(parsed) &&
        'movie_title' in parsed
      ) {
        return parsed
      }
    } catch {
      /* try next */
    }
  }

  throw new Error('INVALID_MODEL_JSON')
}
