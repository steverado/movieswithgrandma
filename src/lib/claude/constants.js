/** @see PRD — model + tool version */
export const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages'
export const ANTHROPIC_VERSION = '2023-06-01'
export const CLAUDE_MODEL = 'claude-sonnet-4-20250514'

export const WEB_SEARCH_TOOL = {
  type: 'web_search_20250305',
  name: 'web_search',
  max_uses: 10,
  allowed_domains: ['imdb.com'],
}
