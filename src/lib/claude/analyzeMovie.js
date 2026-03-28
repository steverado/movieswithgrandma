import {
  ANTHROPIC_MESSAGES_URL,
  ANTHROPIC_VERSION,
  CLAUDE_MODEL,
  WEB_SEARCH_TOOL,
} from './constants.js'
import { buildSystemPrompt, buildUserPrompt } from './prompts.js'

/**
 * @typedef {object} AnthropicMessage
 * @property {string} id
 * @property {'assistant'} role
 * @property {string} stop_reason
 * @property {Array<{ type: string, text?: string }>} content
 */

const MAX_PAUSE_TURN_CONTINUATIONS = 8

/**
 * @param {string} apiKey
 * @param {{ role: string, content: unknown }}[] messages
 * @returns {Promise<AnthropicMessage>}
 */
async function createMessage(apiKey, messages) {
  const body = {
    model: CLAUDE_MODEL,
    max_tokens: 8192,
    system: buildSystemPrompt(),
    messages,
    tools: [WEB_SEARCH_TOOL],
  }

  const res = await fetch(ANTHROPIC_MESSAGES_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify(body),
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const msg =
      data?.error?.message ||
      data?.message ||
      `Anthropic API error: ${res.status} ${res.statusText}`
    throw new Error(msg)
  }

  return data
}

/**
 * Single Claude Messages call with web_search (server-side), including pause_turn continuation.
 * @param {string} apiKey
 * @param {string} movieTitle
 * @returns {Promise<AnthropicMessage>}
 */
export async function analyzeMovie(apiKey, movieTitle) {
  const userContent = buildUserPrompt(movieTitle)
  /** @type {{ role: string, content: unknown }[]} */
  const thread = [{ role: 'user', content: userContent }]

  let last = await createMessage(apiKey, thread)
  let continuations = 0

  while (last.stop_reason === 'pause_turn' && continuations < MAX_PAUSE_TURN_CONTINUATIONS) {
    thread.push({ role: 'assistant', content: last.content })
    last = await createMessage(apiKey, thread)
    continuations += 1
  }

  return last
}
