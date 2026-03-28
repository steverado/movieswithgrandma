/**
 * Vercel's Node runtime often pre-parses JSON into `req.body`. Reading the stream
 * again can hang (no data/end), which surfaces as ~502 from the edge after a timeout.
 *
 * @param {import('http').IncomingMessage & { body?: unknown }} req
 * @returns {Promise<Record<string, unknown>>}
 */
export async function getJsonBody(req) {
  const b = req.body

  if (b !== undefined && b !== null) {
    if (typeof b === 'string') {
      const t = b.trim()
      if (!t) return {}
      try {
        const parsed = JSON.parse(t)
        return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
          ? parsed
          : {}
      } catch {
        throw new Error('INVALID_JSON')
      }
    }

    if (Buffer.isBuffer(b)) {
      const raw = b.toString('utf8').trim()
      if (!raw) return {}
      try {
        const parsed = JSON.parse(raw)
        return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
          ? parsed
          : {}
      } catch {
        throw new Error('INVALID_JSON')
      }
    }

    if (typeof b === 'object' && !Array.isArray(b)) {
      return /** @type {Record<string, unknown>} */ (b)
    }
  }

  return readJsonBodyFromStream(req)
}

/**
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<Record<string, unknown>>}
 */
function readJsonBodyFromStream(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8')
        if (!raw.trim()) {
          resolve({})
          return
        }
        const parsed = JSON.parse(raw)
        resolve(
          typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
            ? parsed
            : {},
        )
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}
