/**
 * Minimal GitHub REST + OAuth Device Flow client used by the link service.
 *
 * Only the operations exposed by the `github` agent tool are implemented here.
 * Tokens are passed in explicitly and are never included in errors or logs.
 */

const API_BASE = 'https://api.github.com'
const OAUTH_BASE = 'https://github.com/login'
const USER_AGENT = 'dsh-github-account-link/1.0.0'

export class GitHubError extends Error {
  constructor(message, { status = 0, code = 'GITHUB_ERROR', details = null } = {}) {
    super(message)
    this.name = 'GitHubError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export function parseScopes(value) {
  if (typeof value !== 'string') return []
  return [...new Set(value.split(/[\s,]+/).map(part => part.trim()).filter(Boolean))]
}

function repoPath(repo) {
  const match = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/.exec(String(repo ?? '').trim())
  if (match === null) {
    throw new GitHubError('repo 必须是 owner/name 格式，例如 octocat/Hello-World。', {
      status: 400,
      code: 'BAD_REPO',
    })
  }
  return `${encodeURIComponent(match[1])}/${encodeURIComponent(match[2])}`
}

function requestHeaders(token) {
  return {
    accept: 'application/vnd.github+json',
    authorization: `Bearer ${token}`,
    'user-agent': USER_AGENT,
    'x-github-api-version': '2022-11-28',
  }
}

function failureMessage(status, data, response) {
  if (status === 401) return 'GitHub 授权已失效或令牌无效，请重新关联。'
  if (status === 404) return '找不到该仓库或资源，或当前 GitHub 令牌没有访问权限。'
  if (status === 403 && response.headers.get('x-ratelimit-remaining') === '0') {
    const reset = Number(response.headers.get('x-ratelimit-reset') ?? '0')
    const when = reset > 0 ? new Date(reset * 1000).toLocaleTimeString() : '稍后'
    return `GitHub API 速率限制，请在 ${when} 后重试。`
  }
  const detail = typeof data?.message === 'string' ? data.message : ''
  return detail === '' ? `GitHub API 返回 HTTP ${status}。` : `GitHub API: ${detail}`
}

/** One authenticated GitHub REST request. */
async function githubRequest(token, path, { method = 'GET', body } = {}) {
  const headers = requestHeaders(token)
  if (body !== undefined) headers['content-type'] = 'application/json'

  let response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(25_000),
    })
  } catch (error) {
    throw new GitHubError(
      `无法连接 GitHub：${error instanceof Error ? error.message : String(error)}`,
      { status: 502, code: 'GITHUB_NETWORK' },
    )
  }

  const text = await response.text()
  let data = null
  if (text !== '') {
    try {
      data = JSON.parse(text)
    } catch {
      data = { message: text.slice(0, 300) }
    }
  }

  if (!response.ok) {
    throw new GitHubError(failureMessage(response.status, data, response), {
      status: response.status,
      code: response.status === 401 ? 'GITHUB_AUTH' : 'GITHUB_API',
      details: typeof data?.message === 'string' ? { message: data.message } : null,
    })
  }

  return { data, headers: response.headers }
}

/** Validate a token and return its GitHub identity plus granted scopes. */
export async function getAuthenticatedUser(token) {
  const { data, headers } = await githubRequest(token, '/user')
  if (data === null || typeof data.login !== 'string') {
    throw new GitHubError('GitHub 没有返回有效的用户信息。', {
      status: 502,
      code: 'GITHUB_PROTOCOL',
    })
  }
  return {
    user: {
      id: typeof data.id === 'number' ? data.id : null,
      login: data.login,
      name: typeof data.name === 'string' ? data.name : null,
      avatarUrl: typeof data.avatar_url === 'string' ? data.avatar_url : null,
      htmlUrl: typeof data.html_url === 'string' ? data.html_url : `https://github.com/${data.login}`,
    },
    scopes: parseScopes(headers.get('x-oauth-scopes') ?? ''),
  }
}

/** Begin an OAuth Device Flow. A Client ID is required; no secret is used. */
export async function startDeviceFlow({ clientId, scopes }) {
  const body = new URLSearchParams({ client_id: clientId, scope: scopes })
  let response
  try {
    response = await fetch(`${OAUTH_BASE}/device/code`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/x-www-form-urlencoded',
        'user-agent': USER_AGENT,
      },
      body,
      signal: AbortSignal.timeout(20_000),
    })
  } catch (error) {
    throw new GitHubError(
      `无法连接 GitHub 授权服务：${error instanceof Error ? error.message : String(error)}`,
      { status: 502, code: 'GITHUB_NETWORK' },
    )
  }

  const data = await response.json().catch(() => null)
  if (!response.ok || data === null || typeof data.device_code !== 'string') {
    throw new GitHubError(
      data?.error_description || data?.error || 'GitHub 拒绝创建设备授权码，请检查 OAuth App 是否启用了 Device Flow。',
      { status: 502, code: 'DEVICE_FLOW_START' },
    )
  }

  return {
    deviceCode: data.device_code,
    userCode: data.user_code,
    verificationUri: data.verification_uri,
    verificationUriComplete: typeof data.verification_uri_complete === 'string' ? data.verification_uri_complete : null,
    expiresIn: Number(data.expires_in) || 900,
    interval: Number(data.interval) || 5,
  }
}

/**
 * Poll one device-flow attempt. OAuth-level pending/denied errors are returned
 * as values; transport failures are thrown.
 */
export async function pollDeviceFlow({ clientId, deviceCode }) {
  const body = new URLSearchParams({
    client_id: clientId,
    device_code: deviceCode,
    grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
  })
  let response
  try {
    response = await fetch(`${OAUTH_BASE}/oauth/access_token`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/x-www-form-urlencoded',
        'user-agent': USER_AGENT,
      },
      body,
      signal: AbortSignal.timeout(20_000),
    })
  } catch (error) {
    throw new GitHubError(
      `无法连接 GitHub 授权服务：${error instanceof Error ? error.message : String(error)}`,
      { status: 502, code: 'GITHUB_NETWORK' },
    )
  }

  const data = await response.json().catch(() => null)
  if (data === null) {
    throw new GitHubError('GitHub 授权服务返回了无法解析的响应。', {
      status: 502,
      code: 'GITHUB_PROTOCOL',
    })
  }
  if (typeof data.error === 'string') {
    return {
      error: data.error,
      errorDescription: typeof data.error_description === 'string' ? data.error_description : '',
    }
  }
  if (typeof data.access_token !== 'string' || data.access_token === '') {
    throw new GitHubError('GitHub 授权成功但没有返回 token。', {
      status: 502,
      code: 'GITHUB_PROTOCOL',
    })
  }
  return {
    accessToken: data.access_token,
    tokenType: typeof data.token_type === 'string' ? data.token_type : 'bearer',
    scopes: parseScopes(data.scope ?? ''),
  }
}

/** List repositories visible to the token, newest activity first. */
export async function listRepos(token, { limit = 20 } = {}) {
  const params = new URLSearchParams({
    per_page: String(limit),
    sort: 'updated',
    direction: 'desc',
    affiliation: 'owner,collaborator,organization_member',
  })
  const { data } = await githubRequest(token, `/user/repos?${params}`)
  if (!Array.isArray(data)) {
    throw new GitHubError('GitHub 返回了无效的仓库列表。', { status: 502, code: 'GITHUB_PROTOCOL' })
  }
  return data.map(repo => ({
    id: repo.id,
    fullName: repo.full_name,
    private: repo.private === true,
    description: repo.description ?? null,
    htmlUrl: repo.html_url,
    defaultBranch: repo.default_branch ?? null,
    updatedAt: repo.updated_at ?? null,
    language: repo.language ?? null,
    permissions: repo.permissions ?? null,
  }))
}

/** List issues (including pull requests, marked explicitly). */
export async function listIssues(token, { repo, state = 'open', limit = 20 } = {}) {
  const path = repoPath(repo)
  const params = new URLSearchParams({
    state,
    per_page: String(limit),
    sort: 'updated',
    direction: 'desc',
  })
  const { data } = await githubRequest(token, `/repos/${path}/issues?${params}`)
  if (!Array.isArray(data)) {
    throw new GitHubError('GitHub 返回了无效的 Issue 列表。', { status: 502, code: 'GITHUB_PROTOCOL' })
  }
  return data.map(issue => ({
    number: issue.number,
    title: issue.title,
    state: issue.state,
    htmlUrl: issue.html_url,
    author: issue.user?.login ?? null,
    labels: Array.isArray(issue.labels) ? issue.labels.map(label => typeof label === 'string' ? label : label?.name).filter(Boolean) : [],
    comments: issue.comments ?? 0,
    updatedAt: issue.updated_at ?? null,
    isPullRequest: issue.pull_request !== undefined,
  }))
}

/** Create an issue on a repository. */
export async function createIssue(token, { repo, title, body = '' } = {}) {
  const path = repoPath(repo)
  const { data } = await githubRequest(token, `/repos/${path}/issues`, {
    method: 'POST',
    body: { title, body },
  })
  return {
    number: data.number,
    title: data.title,
    state: data.state,
    htmlUrl: data.html_url,
    createdAt: data.created_at ?? null,
  }
}

/** Add a comment to an issue or pull request. */
export async function commentIssue(token, { repo, number, body } = {}) {
  const path = repoPath(repo)
  const issueNumber = Number(number)
  if (!Number.isInteger(issueNumber) || issueNumber <= 0) {
    throw new GitHubError('number 必须是正整数 Issue 编号。', { status: 400, code: 'BAD_ISSUE_NUMBER' })
  }
  const { data } = await githubRequest(token, `/repos/${path}/issues/${issueNumber}/comments`, {
    method: 'POST',
    body: { body },
  })
  return {
    id: data.id,
    htmlUrl: data.html_url,
    createdAt: data.created_at ?? null,
  }
}
