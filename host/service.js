/**
 * GitHub account-link service.
 *
 * A binding belongs to exactly one DeepSeek account in this DSH profile. The
 * binding record is stored through DSH's credentials service. For a GitHub CLI
 * binding we deliberately store no token: `gh auth token` is read only when an
 * operation needs GitHub, so rotating or revoking the CLI login is enough.
 */

import { randomUUID } from 'node:crypto'
import {
  GitHubError,
  commentIssue as commentIssueApi,
  createIssue as createIssueApi,
  getAuthenticatedUser,
  listIssues as listIssuesApi,
  listRepos as listReposApi,
  pollDeviceFlow as pollDeviceFlowApi,
  startDeviceFlow as startDeviceFlowApi,
} from './github-api.js'
import { forgetGhStatus, ghStatus, ghToken } from './gh-cli.js'

const RECORD_KEY = 'dsh-github-link'
const AUTO_OPT_OUT_KEY = 'dsh-github-link-auto-opt-out'
const DS_CACHE_TTL_MS = 30_000

export class LinkError extends Error {
  constructor(code, message, status = 400) {
    super(message)
    this.name = 'LinkError'
    this.code = code
    this.status = status
  }
}

function asString(value, fallback = '') {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : fallback
}

function scopeList(value) {
  const raw = Array.isArray(value) ? value.join(' ') : String(value ?? '')
  return [...new Set(raw.split(/[\s,]+/).map(part => part.trim()).filter(Boolean))]
}

function detectTokenKind(token) {
  if (token.startsWith('ghp_')) return 'classic-pat'
  if (token.startsWith('github_pat_')) return 'fine-grained-pat'
  if (token.startsWith('gho_')) return 'oauth'
  if (token.startsWith('ghu_')) return 'user-token'
  if (token.startsWith('ghs_')) return 'server-token'
  if (token.startsWith('ghr_')) return 'refresh-token'
  return 'token'
}

function publicGithub(binding) {
  if (binding === null || binding === undefined) return null
  return {
    login: binding.github.login,
    name: binding.github.name ?? null,
    avatarUrl: binding.github.avatarUrl ?? null,
    htmlUrl: binding.github.htmlUrl ?? `https://github.com/${binding.github.login}`,
    scopes: Array.isArray(binding.scopes) ? binding.scopes : [],
    source: binding.source,
    tokenKind: binding.tokenKind ?? null,
    linkedAt: binding.linkedAt ?? null,
  }
}

function ghAccountMatches(ghAccount, binding) {
  if (ghAccount === null || ghAccount === undefined) return true
  const actual = String(ghAccount).toLowerCase()
  const candidates = [binding.ghAccount, binding.github?.login]
    .filter(value => typeof value === 'string' && value !== '')
    .map(value => value.toLowerCase())
  return candidates.includes(actual)
}

function clampLimit(value, fallback = 20, max = 50) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(1, Math.trunc(number)))
}

export function createGitHubLinkService(ctx, config = {}) {
  const clientId = asString(config.clientId, asString(process.env.DSH_GITHUB_CLIENT_ID, ''))
  const scopes = scopeList(config.scopes ?? process.env.DSH_GITHUB_SCOPES ?? 'read:user public_repo')
  const allowMutations = config.allowMutations !== false
  const autoLinkGhCli = config.autoLinkGhCli === true

  /** @type {Map<string, {deviceCode:string, interval:number, expiresAt:number, nextPollAt:number, accountKey:string, clientId:string, inFlight:boolean}>} */
  const attempts = new Map()
  let dsCache = null
  let autoLinkPromise = null

  async function getDeepseekIdentity(force = false) {
    if (!force && dsCache !== null && Date.now() - dsCache.at < DS_CACHE_TTL_MS) {
      return dsCache.value
    }

    const account = ctx.get?.('deepseekAccount')
    if (account === undefined) {
      const value = { available: false, signedIn: false, id: null, name: null, avatarUrl: null }
      dsCache = { at: Date.now(), value }
      return value
    }

    let state = null
    try {
      state = await account.getState()
    } catch {
      state = null
    }
    const signedIn = state?.status === 'credential-stored'
    let id = null
    let name = null
    let avatarUrl = null

    if (signedIn) {
      try {
        const identity = await account.getDeviceIdentity?.()
        if (identity?.userId !== undefined && identity?.userId !== null) id = String(identity.userId)
      } catch {
        // device identity is best-effort; the profile call below can supply it
      }
      try {
        const profile = await account.getProfile?.({
          version: '1.0.0',
          locale: 'zh',
          timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60,
        })
        if (profile?.status === 'ready') {
          if (profile.value?.id !== null && profile.value?.id !== undefined) id = String(profile.value.id)
          if (typeof profile.value?.name === 'string') name = profile.value.name
          if (typeof profile.value?.avatarUrl === 'string') avatarUrl = profile.value.avatarUrl
        }
      } catch {
        // profile is decorative; identity from getDeviceIdentity still works
      }
    }

    const value = { available: true, signedIn, id, name, avatarUrl }
    dsCache = { at: Date.now(), value }
    return value
  }

  function accountKey(deepseek) {
    if (!deepseek.available) return 'local'
    if (!deepseek.signedIn) return null
    return deepseek.id ?? 'local'
  }

  async function readBinding() {
    const record = await ctx.credentials.readRecord(RECORD_KEY)
    if (record === null || record === undefined || record.kind !== 'grant') return null
    const payload = record.payload
    if (payload === null || typeof payload !== 'object') return null
    if (payload.github === null || typeof payload.github !== 'object') return null
    if (typeof payload.github.login !== 'string' || payload.github.login === '') return null
    if (payload.source !== 'gh-cli' && (typeof payload.token !== 'string' || payload.token === '')) return null
    return payload
  }

  async function writeBinding(payload) {
    await ctx.credentials.modifyRecord(RECORD_KEY, async () => ({ kind: 'grant', payload }))
  }

  async function deleteBinding() {
    await ctx.credentials.deleteRecord(RECORD_KEY)
  }

  async function autoOptedOut() {
    const record = await ctx.credentials.readRecord(AUTO_OPT_OUT_KEY)
    return record?.kind === 'grant' && record.payload?.optedOut === true
  }

  async function writeAutoOptOut() {
    await ctx.credentials.modifyRecord(AUTO_OPT_OUT_KEY, async () => ({
      kind: 'grant',
      payload: { version: 1, optedOut: true, at: new Date().toISOString() },
    }))
  }

  async function clearAutoOptOut() {
    await ctx.credentials.deleteRecord(AUTO_OPT_OUT_KEY)
  }

  async function readToken(binding) {
    if (binding.source === 'gh-cli') {
      const gh = await ghStatus()
      if (!gh.installed) {
        throw new LinkError('GH_CLI_MISSING', 'GitHub CLI 未安装，无法读取本机 GitHub 登录。请改用 Personal Access Token 或在插件配置中填写 OAuth App Client ID。', 409)
      }
      if (!gh.authenticated) {
        throw new LinkError('GH_CLI_SIGNED_OUT', 'GitHub CLI 当前未登录。请在终端运行 `gh auth login`，然后回到设置页刷新。', 409)
      }
      if (!ghAccountMatches(gh.account, binding)) {
        throw new LinkError('GH_CLI_ACCOUNT_CHANGED', `GitHub CLI 当前登录的是 @${gh.account}，与已关联的 @${binding.github.login} 不一致。请重新关联。`, 409)
      }
      try {
        return await ghToken()
      } catch (error) {
        throw new LinkError('GH_CLI_TOKEN', error instanceof Error ? error.message : String(error), 409)
      }
    }

    if (typeof binding.token === 'string' && binding.token !== '') return binding.token
    throw new LinkError('TOKEN_MISSING', 'GitHub 凭据不存在，请重新关联。', 409)
  }

  async function requireBinding() {
    const deepseek = await getDeepseekIdentity()
    const key = accountKey(deepseek)
    const binding = await readBinding()
    if (binding === null || key === null || binding.deepseekAccountId !== key) {
      throw new LinkError('NOT_LINKED', '当前 DeepSeek 账号尚未关联 GitHub。请打开「设置 → GitHub 账号」完成关联。', 409)
    }
    const token = await readToken(binding)
    return { binding, token, deepseek }
  }

  async function status() {
    const [deepseek, gh] = await Promise.all([getDeepseekIdentity(), ghStatus()])
    const binding = await readBinding()
    const key = accountKey(deepseek)
    const accountMatches = binding !== null && key !== null && binding.deepseekAccountId === key

    let reason = null
    if (binding !== null && key === null) reason = 'deepseek-signed-out'
    else if (binding !== null && !accountMatches) reason = 'account-changed'
    else if (binding !== null && binding.source === 'gh-cli' && (!gh.installed || !gh.authenticated)) reason = 'gh-cli-unavailable'
    else if (binding !== null && binding.source === 'gh-cli' && gh.authenticated
      && !ghAccountMatches(gh.account, binding)) reason = 'gh-cli-account-changed'
    else if (binding !== null && binding.source !== 'gh-cli'
      && (typeof binding.token !== 'string' || binding.token === '')) reason = 'token-missing'

    const usable = binding !== null && accountMatches && reason === null
    return {
      deepseek: {
        available: deepseek.available,
        signedIn: deepseek.signedIn,
        id: deepseek.id,
        name: deepseek.name,
        avatarUrl: deepseek.avatarUrl,
      },
      ghCli: {
        installed: gh.installed === true,
        authenticated: gh.authenticated === true,
        account: gh.account ?? null,
        scopes: Array.isArray(gh.scopes) ? gh.scopes : [],
        tokenSource: gh.tokenSource ?? null,
        error: gh.error ?? null,
      },
      deviceFlow: {
        configured: clientId !== '',
        scopes,
        verificationUri: 'https://github.com/login/device',
      },
      operations: {
        allowMutations,
      },
      config: {
        autoLinkGhCli,
      },
      canLink: !deepseek.available || deepseek.signedIn,
      linked: usable,
      github: usable ? publicGithub(binding) : null,
      staleBinding: binding !== null && !usable
        ? {
            login: binding.github.login,
            source: binding.source,
            reason,
            deepseekAccountName: binding.deepseekAccountName ?? null,
          }
        : null,
    }
  }

  async function linkWithGhCli() {
    const gh = await ghStatus({ force: true })
    if (!gh.installed) {
      throw new LinkError('GH_CLI_MISSING', '没有找到 GitHub CLI。请先安装 `gh`，或改用 Personal Access Token。', 409)
    }
    if (!gh.authenticated) {
      throw new LinkError('GH_CLI_SIGNED_OUT', 'GitHub CLI 尚未登录。请在终端运行 `gh auth login`，再回来重试。', 409)
    }

    const token = await ghToken()
    const auth = await getAuthenticatedUser(token)
    const deepseek = await getDeepseekIdentity(true)
    const key = accountKey(deepseek)
    if (key === null) {
      throw new LinkError('DEEPSEEK_SIGNED_OUT', '请先在 DSH 中登录 DeepSeek 账号，再关联 GitHub。', 409)
    }

    const binding = {
      version: 1,
      source: 'gh-cli',
      tokenKind: 'gh-cli',
      ghAccount: gh.account,
      scopes: auth.scopes.length > 0 ? auth.scopes : (Array.isArray(gh.scopes) ? gh.scopes : []),
      github: auth.user,
      deepseekAccountId: key,
      deepseekAccountName: deepseek.name ?? deepseek.id ?? null,
      linkedAt: new Date().toISOString(),
    }
    await writeBinding(binding)
    await clearAutoOptOut()
    forgetGhStatus()
    return status()
  }

  async function connectWithToken(rawToken) {
    const token = asString(rawToken, '')
    if (token.length < 20) {
      throw new LinkError('TOKEN_INVALID', 'Personal Access Token 看起来不完整，请检查后重试。', 400)
    }
    const auth = await getAuthenticatedUser(token)
    const deepseek = await getDeepseekIdentity(true)
    const key = accountKey(deepseek)
    if (key === null) {
      throw new LinkError('DEEPSEEK_SIGNED_OUT', '请先在 DSH 中登录 DeepSeek 账号，再关联 GitHub。', 409)
    }

    const binding = {
      version: 1,
      source: 'pat',
      tokenKind: detectTokenKind(token),
      token,
      scopes: auth.scopes,
      github: auth.user,
      deepseekAccountId: key,
      deepseekAccountName: deepseek.name ?? deepseek.id ?? null,
      linkedAt: new Date().toISOString(),
    }
    await writeBinding(binding)
    await clearAutoOptOut()
    return status()
  }

  async function startDeviceFlow() {
    if (clientId === '') {
      throw new LinkError(
        'DEVICE_FLOW_UNCONFIGURED',
        '未配置 GitHub OAuth App Client ID。请使用本机 GitHub CLI 或 Personal Access Token，或在插件配置中填写 clientId。',
        409,
      )
    }
    const deepseek = await getDeepseekIdentity(true)
    const key = accountKey(deepseek)
    if (key === null) {
      throw new LinkError('DEEPSEEK_SIGNED_OUT', '请先在 DSH 中登录 DeepSeek 账号，再关联 GitHub。', 409)
    }

    const flow = await startDeviceFlowApi({ clientId, scopes: scopes.join(' ') })
    const attemptId = randomUUID()
    attempts.clear()
    attempts.set(attemptId, {
      deviceCode: flow.deviceCode,
      interval: Math.max(5, flow.interval),
      expiresAt: Date.now() + Math.max(60, flow.expiresIn) * 1000,
      nextPollAt: Date.now() + Math.max(5, flow.interval) * 1000,
      accountKey: key,
      clientId,
      inFlight: false,
    })

    return {
      attemptId,
      userCode: flow.userCode,
      verificationUri: flow.verificationUri,
      verificationUriComplete: flow.verificationUriComplete,
      expiresIn: flow.expiresIn,
      interval: Math.max(5, flow.interval),
      scopes,
    }
  }

  async function pollDeviceFlow(attemptId) {
    const attempt = attempts.get(String(attemptId ?? ''))
    if (attempt === undefined) {
      return { status: 'expired', message: '授权会话不存在或已结束，请重新开始。' }
    }
    if (attempt.inFlight) {
      return { status: 'waiting', retryAfter: 1 }
    }
    if (Date.now() > attempt.expiresAt) {
      attempts.delete(String(attemptId))
      return { status: 'expired', message: '授权会话已过期，请重新开始。' }
    }

    const deepseek = await getDeepseekIdentity()
    if (accountKey(deepseek) !== attempt.accountKey) {
      attempts.delete(String(attemptId))
      return { status: 'expired', message: 'DeepSeek 账号已切换，请重新开始授权。' }
    }

    const now = Date.now()
    if (now < attempt.nextPollAt) {
      return { status: 'waiting', retryAfter: Math.max(1, Math.ceil((attempt.nextPollAt - now) / 1000)) }
    }

    attempt.inFlight = true
    attempt.nextPollAt = now + attempt.interval * 1000
    try {
      const result = await pollDeviceFlowApi({ clientId: attempt.clientId, deviceCode: attempt.deviceCode })
      if (result.error !== undefined) {
        if (result.error === 'authorization_pending') {
          return { status: 'waiting', retryAfter: attempt.interval }
        }
        if (result.error === 'slow_down') {
          attempt.interval += 5
          return { status: 'waiting', retryAfter: attempt.interval, slowDown: true }
        }
        if (result.error === 'expired_token') {
          attempts.delete(String(attemptId))
          return { status: 'expired', message: '授权码已过期，请重新开始。' }
        }
        if (result.error === 'access_denied') {
          attempts.delete(String(attemptId))
          return { status: 'denied', message: '你取消了 GitHub 授权。' }
        }
        attempts.delete(String(attemptId))
        throw new LinkError(
          'DEVICE_FLOW_REJECTED',
          result.errorDescription || `GitHub 拒绝了授权请求（${result.error}）。`,
          502,
        )
      }

      const auth = await getAuthenticatedUser(result.accessToken)
      const binding = {
        version: 1,
        source: 'device',
        tokenKind: 'oauth-device',
        token: result.accessToken,
        scopes: result.scopes.length > 0 ? result.scopes : scopes,
        github: auth.user,
        deepseekAccountId: attempt.accountKey,
        deepseekAccountName: deepseek.name ?? deepseek.id ?? null,
        linkedAt: new Date().toISOString(),
      }
      await writeBinding(binding)
      await clearAutoOptOut()
      attempts.delete(String(attemptId))
      return { status: 'connected', github: publicGithub(binding) }
    } finally {
      attempt.inFlight = false
      if (attempts.has(String(attemptId))) {
        attempt.nextPollAt = Math.max(attempt.nextPollAt, Date.now() + attempt.interval * 1000)
      }
    }
  }

  function cancelDeviceFlow(attemptId) {
    attempts.delete(String(attemptId ?? ''))
    return { status: 'cancelled' }
  }

  async function disconnect() {
    attempts.clear()
    await deleteBinding()
    await writeAutoOptOut()
    return status()
  }

  async function listRepos(limit) {
    const { token } = await requireBinding()
    return listReposApi(token, { limit: clampLimit(limit) })
  }

  async function listIssues({ repo, state = 'open', limit } = {}) {
    const normalizedState = ['open', 'closed', 'all'].includes(String(state)) ? String(state) : 'open'
    const { token } = await requireBinding()
    return listIssuesApi(token, {
      repo,
      state: normalizedState,
      limit: clampLimit(limit),
    })
  }

  async function createIssue({ repo, title, body } = {}) {
    if (!allowMutations) {
      throw new LinkError('MUTATIONS_DISABLED', '插件配置已关闭 GitHub 写操作（allowMutations: false）。', 403)
    }
    const cleanTitle = asString(title, '')
    if (cleanTitle === '') {
      throw new LinkError('TITLE_REQUIRED', '创建 Issue 需要 title。', 400)
    }
    const { token } = await requireBinding()
    return createIssueApi(token, {
      repo,
      title: cleanTitle,
      body: typeof body === 'string' ? body : '',
    })
  }

  async function commentIssue({ repo, number, body } = {}) {
    if (!allowMutations) {
      throw new LinkError('MUTATIONS_DISABLED', '插件配置已关闭 GitHub 写操作（allowMutations: false）。', 403)
    }
    const text = asString(body, '')
    if (text === '') {
      throw new LinkError('BODY_REQUIRED', '评论内容不能为空。', 400)
    }
    const { token } = await requireBinding()
    return commentIssueApi(token, { repo, number, body: text })
  }

  /**
   * Optional startup auto-link. It never overwrites an existing binding and
   * never runs unless `autoLinkGhCli: true` is explicitly configured.
   */
  async function autoLink() {
    if (!autoLinkGhCli) return { status: 'disabled' }
    if (autoLinkPromise !== null) return autoLinkPromise
    autoLinkPromise = (async () => {
      const existing = await readBinding()
      if (existing !== null) return { status: 'existing' }
      if (await autoOptedOut()) return { status: 'opted-out' }
      const deepseek = await getDeepseekIdentity()
      if (deepseek.available && !deepseek.signedIn) return { status: 'signed-out' }
      const gh = await ghStatus()
      if (!gh.installed || !gh.authenticated) return { status: 'gh-unavailable' }
      try {
        await linkWithGhCli()
        return { status: 'linked' }
      } catch (error) {
        return { status: 'failed', message: error instanceof Error ? error.message : String(error) }
      }
    })()
    try {
      return await autoLinkPromise
    } finally {
      autoLinkPromise = null
    }
  }

  return {
    status,
    autoLink,
    linkWithGhCli,
    connectWithToken,
    startDeviceFlow,
    pollDeviceFlow,
    cancelDeviceFlow,
    disconnect,
    listRepos,
    listIssues,
    createIssue,
    commentIssue,
    config: { clientIdConfigured: clientId !== '', scopes, allowMutations, autoLinkGhCli },
  }
}

export { GitHubError }
