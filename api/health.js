/**
 * Lightweight check that serverless routing works (no Redis, no Anthropic).
 * GET https://<deployment>/api/health
 */
export default function handler(req, res) {
  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify({ ok: true, route: 'health' }))
}
