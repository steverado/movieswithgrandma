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
