/**
 * Read-only integration with the locally installed GitHub CLI (`gh`).
 *
 * We never write to `gh`'s keyring. `gh auth status` is used to detect the
 * active account, and `gh auth token` is read only when an operation actually
 * needs to call GitHub. That keeps the token out of DSH's credential store for
 * the `gh-cli` binding source.
 */

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const GH_COMMAND = process.platform === 'win32' ? 'gh.exe' : 'gh'
const EXEC_OPTIONS = {
  windowsHide: true,
  timeout: 15_000,
  maxBuffer: 1024 * 1024,
  encoding: 'utf8',
}

let statusCache = null
const STATUS_TTL_MS = 5_000

function parseScopeText(value) {
  if (typeof value !== 'string') return []
  return [...new Set(value.split(/[\s,]+/).map(part => part.trim()).filter(Boolean))]
}

function parseStatusJson(text) {
  try {
    const parsed = JSON.parse(text)
    const host = parsed?.hosts?.['github.com']
    const entries = Array.isArray(host) ? host : []
    const active = entries.find(entry => entry?.active === true) ?? entries[0] ?? null
    return {
      installed: true,
      authenticated: active?.state === 'success',
      account: typeof active?.login === 'string' ? active.login : null,
      scopes: parseScopeText(active?.scopes),
      tokenSource: typeof active?.tokenSource === 'string' ? active.tokenSource : null,
      host: 'github.com',
    }
  } catch {
    return null
  }
}

/**
 * Detect whether `gh` is installed and which GitHub account is active.
 * Results are cached briefly because the settings page reads this on open.
 */
export async function ghStatus({ force = false } = {}) {
  if (!force && statusCache !== null && Date.now() - statusCache.at < STATUS_TTL_MS) {
    return statusCache.value
  }

  let value
  try {
    const { stdout } = await execFileAsync(GH_COMMAND, ['auth', 'status', '--json', 'hosts'], EXEC_OPTIONS)
    value = parseStatusJson(stdout) ?? {
      installed: true,
      authenticated: false,
      account: null,
      scopes: [],
      tokenSource: null,
      host: 'github.com',
      error: 'could not parse gh auth status',
    }
  } catch (error) {
    // `gh auth status` exits non-zero when no account is signed in but still
    // prints the JSON host table; prefer that over a generic failure.
    const stdout = typeof error?.stdout === 'string' ? error.stdout : String(error?.stdout ?? '')
    const parsed = parseStatusJson(stdout)
    if (parsed !== null) {
      value = parsed
    } else if (error?.code === 'ENOENT') {
      value = {
        installed: false,
        authenticated: false,
        account: null,
        scopes: [],
        tokenSource: null,
        host: 'github.com',
        error: 'GitHub CLI is not installed',
      }
    } else {
      value = {
        installed: true,
        authenticated: false,
        account: null,
        scopes: [],
        tokenSource: null,
        host: 'github.com',
        error: 'GitHub CLI is not signed in',
      }
    }
  }

  statusCache = { at: Date.now(), value }
  return value
}

/** Read the active GitHub CLI token for github.com. Never log the result. */
export async function ghToken() {
  try {
    const { stdout } = await execFileAsync(
      GH_COMMAND,
      ['auth', 'token', '--hostname', 'github.com'],
      EXEC_OPTIONS,
    )
    const token = stdout.trim()
    if (token === '') throw new Error('GitHub CLI returned an empty token')
    return token
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new Error('GitHub CLI is not installed')
    }
    const detail = typeof error?.stderr === 'string' ? error.stderr.trim() : ''
    throw new Error(detail || 'GitHub CLI is not signed in; run `gh auth login` first')
  }
}

/** Clear the short status cache (used after a link operation). */
export function forgetGhStatus() {
  statusCache = null
}
