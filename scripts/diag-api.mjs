#!/usr/bin/env node
/**
 * Smoke-test deployed API routes (no Anthropic call for the analyze probe).
 *
 * Usage:
 *   node scripts/diag-api.mjs https://your-deployment.vercel.app
 *   DIAG_API_BASE=https://... node scripts/diag-api.mjs
 */

const base = (process.argv[2] || process.env.DIAG_API_BASE || '').replace(/\/+$/, '')
if (!base) {
  console.error('Pass base URL, e.g. node scripts/diag-api.mjs https://movieswithgrandma.vercel.app')
  process.exit(1)
}

async function main() {
  const health = await fetch(`${base}/api/health`, { cache: 'no-store' })
  const healthText = await health.text()
  console.log('GET /api/health', health.status, healthText)

  const analyze = await fetch(`${base}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({ title: '' }),
  })
  const analyzeText = await analyze.text()
  console.log('POST /api/analyze (empty title)', analyze.status, analyzeText)

  if (process.env.DIAG_EXERCISE_RATE_LIMIT === '1') {
    console.log('(DIAG_EXERCISE_RATE_LIMIT=1) POST /api/analyze with title "x" — hits Upstash then Anthropic; may take minutes.')
    const deep = await fetch(`${base}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ title: 'x' }),
    })
    const deepText = await deep.text()
    console.log('POST /api/analyze (title x)', deep.status, deepText.slice(0, 500))
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
