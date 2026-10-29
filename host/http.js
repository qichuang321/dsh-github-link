/**
 * Small HTTP helpers for the GitHub link routes.
 *
 * The routes are served by DSH's own web server, so the security boundary is
 * the browser origin: mutating requests must come from the same origin, and
 * response bodies never contain a GitHub token.
 */

import { Buffer } from 'node:buffer'

/** Write a JSON payload with no-store caching. */
export function sendJson(response, status, payload) {
  response.writeHead(status, {
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
  })
  response.end(JSON.stringify(payload))
}

/** True when the request's Origin matches its Host. */
export function sameOrigin(request) {
  const origin = request.headers.origin
  const host = request.headers.host
  if (origin === undefined || host === undefined) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

/** Read and parse a JSON body, rejecting anything over `limit` bytes. */
export async function readJsonBody(request, limit = 64 * 1024) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > limit) throw new Error('request body too large')
    chunks.push(buffer)
  }
  if (size === 0) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

/** A short, safe error message for a JSON response. */
export function asErrorMessage(error) {
  if (error instanceof Error) return error.message
  return String(error)
}
