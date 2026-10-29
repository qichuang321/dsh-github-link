/**
 * Browser-facing JSON routes for the GitHub account settings page.
 *
 * Every POST is same-origin only. GitHub tokens are never returned: the UI
 * receives identity, scopes, and operation results only.
 */

import { asErrorMessage, readJsonBody, sameOrigin, sendJson } from './http.js'

function fail(response, error) {
  const status = Number.isInteger(error?.status) && error.status >= 400 ? error.status : 500
  const code = typeof error?.code === 'string'
    ? error.code
    : error instanceof SyntaxError ? 'BAD_JSON' : 'INTERNAL'
  sendJson(response, status, {
    ok: false,
    error: { code, message: asErrorMessage(error) },
  })
}

function methodNotAllowed(response, allow) {
  response.writeHead(405, { allow })
  response.end()
}

function exact(method, path, handler) {
  return {
    kind: 'exact',
    path,
    async handler(request, response) {
      if (request.method !== method) {
        methodNotAllowed(response, method)
        return
      }
      if (method === 'POST' && !sameOrigin(request)) {
        sendJson(response, 403, {
          ok: false,
          error: { code: 'UNTRUSTED_ORIGIN', message: 'Refusing a cross-origin request.' },
        })
        return
      }
      try {
        const payload = await handler(request)
        if (!response.writableEnded) {
          sendJson(response, 200, { ok: true, ...(payload ?? {}) })
        }
      } catch (error) {
        fail(response, error)
      }
    },
  }
}

function queryOf(request) {
  return new URL(request.url ?? '/', 'http://localhost').searchParams
}

export function createRoutes(service) {
  return [
    exact('GET', '/api/github-link/status', async () => service.status()),

    exact('POST', '/api/github-link/gh-cli', async () => service.linkWithGhCli()),

    exact('POST', '/api/github-link/device/start', async () => service.startDeviceFlow()),

    exact('POST', '/api/github-link/device/poll', async (request) => {
      const body = await readJsonBody(request)
      return service.pollDeviceFlow(body?.attemptId)
    }),

    exact('POST', '/api/github-link/device/cancel', async (request) => {
      const body = await readJsonBody(request)
      return service.cancelDeviceFlow(body?.attemptId)
    }),

    exact('POST', '/api/github-link/token', async (request) => {
      const body = await readJsonBody(request)
      return service.connectWithToken(body?.token)
    }),

    exact('POST', '/api/github-link/disconnect', async () => service.disconnect()),

    exact('GET', '/api/github-link/repos', async (request) => {
      const query = queryOf(request)
      return { repos: await service.listRepos(query.get('limit')) }
    }),

    exact('GET', '/api/github-link/issues', async (request) => {
      const query = queryOf(request)
      return {
        issues: await service.listIssues({
          repo: query.get('repo') ?? '',
          state: query.get('state') ?? 'open',
          limit: query.get('limit'),
        }),
      }
    }),

    exact('POST', '/api/github-link/issues/create', async (request) => {
      const body = await readJsonBody(request)
      return {
        issue: await service.createIssue({
          repo: body?.repo,
          title: body?.title,
          body: body?.body,
        }),
      }
    }),

    exact('POST', '/api/github-link/comment', async (request) => {
      const body = await readJsonBody(request)
      return {
        comment: await service.commentIssue({
          repo: body?.repo,
          number: body?.number,
          body: body?.body,
        }),
      }
    }),
  ]
}
