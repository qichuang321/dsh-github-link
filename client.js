window.__ModuleLoader__.load({
  id: 'dsh-github-link',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useCallback, useEffect, useState } = React

    const NS = 'github-account-link'
    const API = '/api/github-link'

    const zh = {
      nav: 'GitHub 账号',
      title: 'GitHub 账号',
      subtitle: '把当前 DeepSeek 账号与 GitHub 身份关联，授权 Agent 读取仓库并管理 Issue。',
      localOnlyNote: '关联关系保存在本机 DSH 配置中，不会修改 DeepSeek 官方账号资料，也不会把 GitHub token 暴露给页面。',
      loading: '正在读取关联状态…',
      loadFailed: '读取关联状态失败',
      retry: '重试',
      deepseekAccount: 'DeepSeek 账号',
      deepseekSignedIn: '已登录',
      deepseekSignedOut: '未登录 DeepSeek',
      deepseekUnavailable: '本机身份（未接入 DeepSeek 账号服务）',
      localIdentity: '本机身份',
      githubAccount: 'GitHub 账号',
      notLinked: '尚未关联',
      linked: '已关联',
      linkedAt: '关联时间',
      source: '来源',
      scopes: '权限范围',
      noScopes: '令牌未返回 scope（细粒度令牌按仓库授权）',
      refresh: '刷新',
      disconnect: '解除关联',
      confirmDisconnect: '确认解除',
      cancel: '取消',
      disconnectNote: '只会删除 DSH 内的关联记录并停止自动关联；不会退出本机 GitHub CLI，也不会自动吊销 GitHub 上的 token。',
      ghCliTitle: '使用本机 GitHub CLI',
      ghCliDetected: '检测到 GitHub CLI 已登录。点击一次即可复用现有登录，无需创建 OAuth App。',
      ghCliNotAuthenticated: '检测到 GitHub CLI，但当前没有登录 GitHub。先在终端运行下面的命令，再刷新。',
      ghCliNotInstalled: '没有检测到 GitHub CLI。可以改用 Personal Access Token，或配置 OAuth App Client ID。',
      ghCliLoginHint: '在终端运行：',
      linkWithGhCli: '一键关联',
      linking: '关联中…',
      ghCliScopes: 'GitHub CLI 已授予',
      otherMethods: '其他关联方式',
      patTitle: 'Personal Access Token',
      patLabel: 'GitHub Token',
      patHint: '适合没有安装 GitHub CLI 的情况。建议使用 fine-grained token，只授权需要的仓库。',
      patPlaceholder: 'ghp_… 或 github_pat_…',
      connect: '使用 Token 关联',
      connecting: '验证中…',
      patSecurity: 'Token 会保存到 DSH 的 credentials 服务，不写入浏览器 localStorage。',
      patLink: '在 GitHub 创建 Token',
      patEmpty: '请先填写 GitHub Token。',
      deviceTitle: 'GitHub OAuth 设备授权',
      deviceHint: '需要先在插件配置中填写 OAuth App Client ID，并在 OAuth App 设置中启用 Device Flow。',
      deviceConfigured: '已配置 Client ID，可以生成一次性代码。',
      deviceNotConfigured: '未配置 Client ID。请在插件配置的 clientId 字段中填写。',
      deviceSetup: 'GitHub → Settings → Developer settings → OAuth Apps → 新建 OAuth App，勾选 Enable Device Flow，然后把 Client ID 填到插件配置。',
      deviceStart: '生成一次性代码',
      deviceStarting: '正在生成…',
      deviceCode: '在 GitHub 输入这个代码',
      copyCode: '复制代码',
      copied: '已复制',
      copyFailed: '复制失败，请手动选择代码。',
      openGitHub: '打开 GitHub',
      waiting: '等待你在 GitHub 完成授权…',
      expiresIn: '剩余时间',
      expired: '授权码已过期，请重新生成。',
      denied: '你取消了 GitHub 授权。',
      connected: 'GitHub 关联成功。',
      canceled: '已取消本次授权。',
      staleAccount: '这个 GitHub 绑定属于另一个 DeepSeek 账号。重新关联会替换原绑定。',
      staleSignedOut: 'GitHub 绑定还在，但当前没有登录 DeepSeek。请先登录，再刷新。',
      staleGhCli: 'GitHub CLI 当前不可用或未登录，原绑定暂时无法使用。修复 CLI 登录后刷新即可。',
      staleGhCliAccount: 'GitHub CLI 已切换到另一个 GitHub 账号。请重新关联。',
      staleToken: '保存的 GitHub 凭据已失效，请重新关联。',
      operationsTitle: 'Agent 可以做什么',
      operationsHint: '关联后，Agent 可以在对话中调用 github 工具执行这些操作。',
      opRepos: '列出你可见的 GitHub 仓库',
      opIssues: '读取指定仓库的 Issue / PR 列表',
      opCreate: '在指定仓库创建 Issue',
      opComment: '在指定 Issue / PR 下发表评论',
      mutationsOn: '写操作已开启（创建 Issue、评论）。插件不会推送代码。',
      mutationsOff: '写操作已在插件配置中关闭，只能读取。',
      agentToolHint: '可以直接说：“列出我的 GitHub 仓库”或“查看 owner/repo 的 open issues”。',
      sourceGhCli: '本机 GitHub CLI',
      sourcePat: 'Personal Access Token',
      sourceDevice: 'OAuth 设备授权',
      unknown: '未知',
      close: '关闭',
      openProfile: '打开 GitHub 主页',
      accountMismatch: '当前 GitHub 身份与 DeepSeek 账号不一致。',
      errorTitle: '操作失败',
    }

    const en = {
      nav: 'GitHub account',
      title: 'GitHub account',
      subtitle: 'Link the current DeepSeek account to a GitHub identity and let the agent inspect repositories and manage issues.',
      localOnlyNote: 'The binding lives in this local DSH profile. It does not modify your official DeepSeek account, and a GitHub token is never exposed to the page.',
      loading: 'Reading link status…',
      loadFailed: 'Could not read link status',
      retry: 'Retry',
      deepseekAccount: 'DeepSeek account',
      deepseekSignedIn: 'Signed in',
      deepseekSignedOut: 'Not signed in to DeepSeek',
      deepseekUnavailable: 'Local identity (DeepSeek account service unavailable)',
      localIdentity: 'Local identity',
      githubAccount: 'GitHub account',
      notLinked: 'Not linked',
      linked: 'Linked',
      linkedAt: 'Linked at',
      source: 'Source',
      scopes: 'Scopes',
      noScopes: 'The token did not report scopes (fine-grained tokens authorize per repository).',
      refresh: 'Refresh',
      disconnect: 'Disconnect',
      confirmDisconnect: 'Confirm disconnect',
      cancel: 'Cancel',
      disconnectNote: 'This deletes the binding inside DSH and stops automatic linking. It does not sign out of the local GitHub CLI or revoke the token on GitHub.',
      ghCliTitle: 'Use the local GitHub CLI',
      ghCliDetected: 'The GitHub CLI is already signed in. One click reuses that login; no OAuth App is needed.',
      ghCliNotAuthenticated: 'The GitHub CLI is installed but not signed in. Run the command below in a terminal, then refresh.',
      ghCliNotInstalled: 'No GitHub CLI found. Use a Personal Access Token or configure an OAuth App Client ID instead.',
      ghCliLoginHint: 'Run in a terminal:',
      linkWithGhCli: 'Link with GitHub CLI',
      linking: 'Linking…',
      ghCliScopes: 'Granted to GitHub CLI',
      otherMethods: 'Other ways to link',
      patTitle: 'Personal Access Token',
      patLabel: 'GitHub token',
      patHint: 'Useful when GitHub CLI is unavailable. Prefer a fine-grained token limited to the repositories you need.',
      patPlaceholder: 'ghp_… or github_pat_…',
      connect: 'Link with token',
      connecting: 'Verifying…',
      patSecurity: 'The token is stored in DSH credentials, not in browser localStorage.',
      patLink: 'Create a token on GitHub',
      patEmpty: 'Enter a GitHub token first.',
      deviceTitle: 'GitHub OAuth device flow',
      deviceHint: 'Requires an OAuth App Client ID in the plugin config and Device Flow enabled on that app.',
      deviceConfigured: 'A Client ID is configured. You can generate a one-time code.',
      deviceNotConfigured: 'No Client ID configured. Fill in clientId in the plugin config.',
      deviceSetup: 'GitHub → Settings → Developer settings → OAuth Apps → New OAuth App, enable Device Flow, then put the Client ID in the plugin config.',
      deviceStart: 'Generate one-time code',
      deviceStarting: 'Generating…',
      deviceCode: 'Enter this code on GitHub',
      copyCode: 'Copy code',
      copied: 'Copied',
      copyFailed: 'Copy failed; select the code manually.',
      openGitHub: 'Open GitHub',
      waiting: 'Waiting for you to approve on GitHub…',
      expiresIn: 'Time left',
      expired: 'The code expired. Generate a new one.',
      denied: 'You cancelled the GitHub authorization.',
      connected: 'GitHub linked successfully.',
      canceled: 'Authorization cancelled.',
      staleAccount: 'This GitHub binding belongs to another DeepSeek account. Linking again replaces it.',
      staleSignedOut: 'The binding is still here, but no DeepSeek account is signed in. Sign in and refresh.',
      staleGhCli: 'The GitHub CLI is unavailable or signed out, so the binding cannot be used right now. Fix the CLI login and refresh.',
      staleGhCliAccount: 'The GitHub CLI switched to a different GitHub account. Link again.',
      staleToken: 'The stored GitHub credential is no longer valid. Link again.',
      operationsTitle: 'What the agent can do',
      operationsHint: 'After linking, the agent can call the github tool in conversation to perform these operations.',
      opRepos: 'List repositories visible to you',
      opIssues: 'Read issues / pull requests in a repository',
      opCreate: 'Create an issue in a repository',
      opComment: 'Comment on an issue / pull request',
      mutationsOn: 'Write operations are enabled (create issue, comment). The plugin never pushes code.',
      mutationsOff: 'Write operations are disabled in the plugin config; read-only.',
      agentToolHint: 'Try: “list my GitHub repositories” or “show open issues in owner/repo”.',
      sourceGhCli: 'Local GitHub CLI',
      sourcePat: 'Personal Access Token',
      sourceDevice: 'OAuth device flow',
      unknown: 'Unknown',
      close: 'Close',
      openProfile: 'Open GitHub profile',
      accountMismatch: 'The GitHub identity does not match the current DeepSeek account.',
      errorTitle: 'Operation failed',
    }

    const CSS = String.raw`
.gh-wrap {
  --gh-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
  max-width: 760px;
  padding: 2px 0 28px;
  color: var(--dsw-alias-label-primary);
  font-family: inherit;
  box-sizing: border-box;
}
.gh-head { display: flex; gap: 12px; align-items: flex-start; }
.gh-mark {
  flex: 0 0 auto;
  width: 38px;
  height: 38px;
  border-radius: 11px;
  background: var(--dsw-alias-brand-primary);
  color: var(--dsw-alias-bg-base);
  display: grid;
  place-items: center;
}
.gh-title { margin: 1px 0 0; font-size: 18px; line-height: 1.35; font-weight: 600; letter-spacing: .01em; }
.gh-sub { margin: 4px 0 0; font-size: 12.5px; line-height: 1.55; color: var(--dsw-alias-label-secondary); }
.gh-note {
  margin: 0;
  padding: 2px 0 2px 10px;
  border-left: 2px solid var(--dsw-alias-border-l1);
  font-size: 11.5px;
  line-height: 1.6;
  color: var(--dsw-alias-label-secondary);
}
.gh-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 15px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: var(--gh-radius);
  background: var(--dsw-alias-bg-layer-1);
  box-sizing: border-box;
}
.gh-identity { display: flex; align-items: center; gap: 11px; min-width: 0; }
.gh-identity-text { min-width: 0; flex: 1 1 auto; }
.gh-avatar {
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  background: var(--dsw-alias-bg-layer-2);
}
.gh-avatar-fallback {
  display: grid;
  place-items: center;
  color: var(--dsw-alias-label-secondary);
  border: 1px solid var(--dsw-alias-border-l1);
  font-size: 13px;
  font-weight: 650;
  letter-spacing: .02em;
}
.gh-eyebrow {
  font-size: 10.5px;
  line-height: 1.4;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--dsw-alias-label-secondary);
}
.gh-name { font-size: 14px; line-height: 1.45; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gh-meta { margin-top: 1px; font-size: 11.5px; line-height: 1.45; color: var(--dsw-alias-label-secondary); overflow-wrap: anywhere; }
.gh-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex: 0 0 auto;
  padding: 2px 8px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 999px;
  font-size: 10.5px;
  line-height: 1.6;
  color: var(--dsw-alias-label-secondary);
  white-space: nowrap;
}
.gh-pill-ok { color: var(--dsw-alias-state-success-primary); border-color: var(--dsw-alias-state-success-primary); }
.gh-pill-warn { color: var(--dsw-alias-state-warn-primary); border-color: var(--dsw-alias-state-warn-primary); }
.gh-pill-muted { color: var(--dsw-alias-state-idle-primary); }
.gh-card-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.gh-card-title { margin: 0; font-size: 13px; line-height: 1.4; font-weight: 600; }
.gh-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.gh-btn {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 30px;
  padding: 5px 11px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 12px;
  line-height: 1.4;
  text-decoration: none;
  cursor: pointer;
  box-sizing: border-box;
}
.gh-btn:hover { border-color: var(--dsw-alias-border-l2); }
.gh-btn:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.gh-btn:disabled { opacity: .5; cursor: default; }
.gh-btn-primary {
  border-color: transparent;
  background: var(--dsw-alias-brand-primary);
  color: var(--dsw-alias-bg-base);
  font-weight: 600;
}
.gh-btn-danger { color: var(--dsw-alias-state-error-primary); border-color: var(--dsw-alias-state-error-primary); background: transparent; }
.gh-meta-row { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 11.5px; line-height: 1.5; color: var(--dsw-alias-label-secondary); }
.gh-scopes { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.gh-chip {
  padding: 2px 7px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 6px;
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-secondary);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 10.5px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.gh-alert {
  padding: 9px 11px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.55;
  color: var(--dsw-alias-label-secondary);
}
.gh-alert-error { color: var(--dsw-alias-state-error-primary); border-color: var(--dsw-alias-state-error-primary); }
.gh-alert-warn { color: var(--dsw-alias-state-warn-primary); border-color: var(--dsw-alias-state-warn-primary); }
.gh-method {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-2);
}
.gh-method-primary { border-color: var(--dsw-alias-brand-primary); }
.gh-method-title { margin: 0; font-size: 12.5px; line-height: 1.45; font-weight: 600; }
.gh-details { border-top: 1px solid var(--dsw-alias-border-l1); padding-top: 12px; }
.gh-details > summary {
  cursor: pointer;
  font-size: 12px;
  line-height: 1.5;
  font-weight: 600;
  color: var(--dsw-alias-label-secondary);
  user-select: none;
}
.gh-details-body { display: flex; flex-direction: column; gap: 12px; padding-top: 12px; }
.gh-subcard {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-2);
}
.gh-subcard h4 { margin: 0; font-size: 12.5px; line-height: 1.4; font-weight: 600; }
.gh-form { display: flex; flex-direction: column; gap: 8px; }
.gh-label { font-size: 11.5px; line-height: 1.4; color: var(--dsw-alias-label-secondary); }
.gh-input {
  width: 100%;
  min-height: 32px;
  padding: 6px 9px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 12px;
  box-sizing: border-box;
}
.gh-input:focus { outline: none; border-color: var(--dsw-alias-brand-primary); }
.gh-help { margin: 0; font-size: 11px; line-height: 1.55; color: var(--dsw-alias-label-secondary); }
.gh-link { color: var(--dsw-alias-brand-primary); text-decoration: none; }
.gh-link:hover { text-decoration: underline; }
.gh-code {
  margin: 0;
  padding: 9px 10px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 11.5px;
  line-height: 1.55;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.gh-inline-code {
  display: inline-block;
  margin: 0 5px;
  padding: 1px 5px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 5px;
  background: var(--dsw-alias-bg-layer-2);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 11px;
}
.gh-device {
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 13px;
  border: 1px solid var(--dsw-alias-brand-primary);
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-2);
}
.gh-device-code {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 25px;
  line-height: 1.25;
  font-weight: 700;
  letter-spacing: .16em;
  text-align: center;
  padding: 5px 0 3px;
}
.gh-ops { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 5px; font-size: 12px; line-height: 1.5; color: var(--dsw-alias-label-secondary); }
.gh-ops code { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 11px; color: var(--dsw-alias-label-primary); }
.gh-loading { padding: 34px 10px; text-align: center; font-size: 12px; color: var(--dsw-alias-label-secondary); }
.gh-sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
@media (max-width: 540px) {
  .gh-card { padding: 12px; }
  .gh-identity { align-items: flex-start; }
  .gh-actions .gh-btn { flex: 1 1 auto; }
  .gh-device-code { font-size: 21px; }
}
`

    async function api(path, options = {}) {
      const headers = { ...(options.headers ?? {}) }
      let body = options.body
      if (body !== undefined && typeof body !== 'string') {
        body = JSON.stringify(body)
        headers['content-type'] = 'application/json'
      }
      const response = await fetch(API + path, {
        ...options,
        body,
        headers,
        cache: 'no-store',
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || data?.ok === false) {
        const error = new Error(data?.error?.message ?? `HTTP ${response.status}`)
        error.code = data?.error?.code
        error.status = response.status
        throw error
      }
      return data
    }

    function initials(value) {
      const text = String(value ?? '').trim()
      if (text === '') return '?'
      return text.replace(/^@/, '').slice(0, 2).toUpperCase()
    }

    function formatDate(iso, lang) {
      if (typeof iso !== 'string' || iso === '') return ''
      const date = new Date(iso)
      if (Number.isNaN(date.getTime())) return ''
      return date.toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    }

    function sourceLabel(source, t) {
      if (source === 'gh-cli') return t('sourceGhCli')
      if (source === 'pat') return t('sourcePat')
      if (source === 'device') return t('sourceDevice')
      return t('unknown')
    }

    function staleMessage(reason, t) {
      if (reason === 'deepseek-signed-out') return t('staleSignedOut')
      if (reason === 'account-changed') return t('staleAccount')
      if (reason === 'gh-cli-unavailable') return t('staleGhCli')
      if (reason === 'gh-cli-account-changed') return t('staleGhCliAccount')
      if (reason === 'token-missing') return t('staleToken')
      return t('staleToken')
    }

    function Mark() {
      return h('div', { className: 'gh-mark', 'aria-hidden': true },
        h('svg', { viewBox: '0 0 32 32', width: 20, height: 20, fill: 'none' },
          h('path', {
            d: 'M12.8 19.2l-1.7 1.7a3.7 3.7 0 0 1-5.2-5.2l3.6-3.6a3.7 3.7 0 0 1 5.2 0',
            stroke: 'currentColor', strokeWidth: 2.3, strokeLinecap: 'round',
          }),
          h('path', {
            d: 'M19.2 12.8l1.7-1.7a3.7 3.7 0 0 1 5.2 5.2l-3.6 3.6a3.7 3.7 0 0 1-5.2 0',
            stroke: 'currentColor', strokeWidth: 2.3, strokeLinecap: 'round',
          }),
          h('path', {
            d: 'M12.1 19.9l7.8-7.8',
            stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', opacity: .8,
          }),
        ),
      )
    }

    function Pill({ tone = 'muted', children }) {
      return h('span', { className: `gh-pill gh-pill-${tone}` }, children)
    }

    function Avatar({ src, name }) {
      const [failed, setFailed] = useState(false)
      useEffect(() => { setFailed(false) }, [src])
      if (typeof src !== 'string' || src === '' || failed) {
        return h('div', { className: 'gh-avatar gh-avatar-fallback', 'aria-hidden': true }, initials(name))
      }
      return h('img', {
        className: 'gh-avatar',
        src,
        alt: '',
        loading: 'lazy',
        referrerPolicy: 'no-referrer',
        onError: () => setFailed(true),
      })
    }

    function ScopeChips({ scopes, t }) {
      if (!Array.isArray(scopes) || scopes.length === 0) {
        return h('div', { className: 'gh-help' }, t('noScopes'))
      }
      return h('div', { className: 'gh-scopes' },
        ...scopes.map(scope => h('code', { className: 'gh-chip', key: scope }, scope)),
      )
    }

    function DeepSeekCard({ status, t }) {
      const ds = status.deepseek
      const signedIn = ds.signedIn === true
      const title = ds.name || ds.id || (ds.available ? t('deepseekSignedOut') : t('localIdentity'))
      const meta = signedIn
        ? (ds.id ? `ID ${ds.id}` : t('deepseekSignedIn'))
        : (ds.available ? t('deepseekSignedOut') : t('deepseekUnavailable'))
      return h('section', { className: 'gh-card' },
        h('div', { className: 'gh-identity' },
          h(Avatar, { src: ds.avatarUrl, name: title }),
          h('div', { className: 'gh-identity-text' },
            h('div', { className: 'gh-eyebrow' }, t('deepseekAccount')),
            h('div', { className: 'gh-name' }, title),
            h('div', { className: 'gh-meta' }, meta),
          ),
          h(Pill, { tone: signedIn ? 'ok' : (ds.available ? 'warn' : 'muted') },
            signedIn ? t('deepseekSignedIn') : (ds.available ? t('notLinked') : t('localIdentity'))),
        ),
      )
    }

    function LinkedCard({ status, t, lang, busy, confirming, onRefresh, onDisconnect }) {
      const gh = status.github
      const linkedAt = formatDate(gh.linkedAt, lang)
      return h('section', { className: 'gh-card' },
        h('div', { className: 'gh-card-head' },
          h('h3', { className: 'gh-card-title' }, t('githubAccount')),
          h(Pill, { tone: 'ok' }, t('linked')),
        ),
        h('div', { className: 'gh-identity' },
          h(Avatar, { src: gh.avatarUrl, name: gh.name || gh.login }),
          h('div', { className: 'gh-identity-text' },
            h('div', { className: 'gh-eyebrow' }, '@' + gh.login),
            h('div', { className: 'gh-name' }, gh.name || ('@' + gh.login)),
            h('div', { className: 'gh-meta' },
              t('source') + ' · ' + sourceLabel(gh.source, t) + (linkedAt ? ' · ' + t('linkedAt') + ' ' + linkedAt : ''),
            ),
          ),
        ),
        h('div', { className: 'gh-meta-row' },
          h('span', {}, t('scopes')),
        ),
        h(ScopeChips, { scopes: gh.scopes, t }),
        h('div', { className: 'gh-actions' },
          h('button', { className: 'gh-btn', type: 'button', onClick: onRefresh, disabled: busy !== null }, t('refresh')),
          h('a', {
            className: 'gh-btn',
            href: gh.htmlUrl,
            target: '_blank',
            rel: 'noreferrer noopener',
          }, t('openProfile')),
          h('button', {
            className: 'gh-btn gh-btn-danger',
            type: 'button',
            onClick: onDisconnect,
            disabled: busy !== null,
          }, confirming ? t('confirmDisconnect') : t('disconnect')),
        ),
        confirming ? h('p', { className: 'gh-help' }, t('disconnectNote')) : null,
      )
    }

    function DevicePanel({ device, now, copied, t, onCopy, onOpen, onCancel }) {
      const left = Math.max(0, device.startedAt + device.expiresIn * 1000 - now)
      const seconds = Math.ceil(left / 1000)
      const countdown = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
      return h('div', { className: 'gh-device' },
        h('div', { className: 'gh-eyebrow' }, t('deviceCode')),
        h('div', { className: 'gh-device-code', 'aria-live': 'polite' }, device.userCode),
        h('p', { className: 'gh-help' }, t('waiting') + ' · ' + t('expiresIn') + ' ' + countdown),
        h('div', { className: 'gh-actions' },
          h('button', { className: 'gh-btn', type: 'button', onClick: onCopy }, copied ? t('copied') : t('copyCode')),
          h('button', { className: 'gh-btn gh-btn-primary', type: 'button', onClick: onOpen }, t('openGitHub')),
          h('button', { className: 'gh-btn', type: 'button', onClick: onCancel }, t('cancel')),
        ),
      )
    }

    function ConnectCard({
      status, t, busy, pat, setPat, onLinkGh, onConnectPat, onStartDevice,
      device, now, copied, onCopy, onOpen, onCancelDevice, onRefresh,
    }) {
      const canLink = status.canLink !== false
      const busyNow = busy !== null
      const gh = status.ghCli
      const stale = status.staleBinding
      const deviceConfigured = status.deviceFlow.configured === true

      return h('section', { className: 'gh-card' },
        h('div', { className: 'gh-card-head' },
          h('h3', { className: 'gh-card-title' }, t('githubAccount')),
          h(Pill, { tone: 'muted' }, t('notLinked')),
        ),

        stale !== null && stale !== undefined
          ? h('div', { className: 'gh-alert gh-alert-warn', role: 'status' }, staleMessage(stale.reason, t))
          : null,

        !canLink
          ? h('div', { className: 'gh-alert gh-alert-warn', role: 'status' }, t('deepseekSignedOut'))
          : null,

        gh.installed && gh.authenticated
          ? h('div', { className: 'gh-method gh-method-primary' },
              h('h4', { className: 'gh-method-title' }, t('ghCliTitle')),
              h('p', { className: 'gh-help' }, t('ghCliDetected')),
              gh.scopes.length > 0
                ? h('div', { className: 'gh-scopes' },
                    ...gh.scopes.map(scope => h('code', { className: 'gh-chip', key: scope }, scope)),
                  )
                : null,
              h('div', { className: 'gh-actions' },
                h('button', {
                  className: 'gh-btn gh-btn-primary',
                  type: 'button',
                  onClick: onLinkGh,
                  disabled: !canLink || busyNow,
                }, busy === 'gh' ? t('linking') : t('linkWithGhCli')),
              ),
            )
          : gh.installed
            ? h('div', { className: 'gh-alert gh-alert-warn' },
                h('div', {}, t('ghCliNotAuthenticated')),
                h('div', { style: { marginTop: '6px' } },
                  h('span', {}, t('ghCliLoginHint')),
                  h('code', { className: 'gh-inline-code' }, 'gh auth login'),
                  h('button', {
                    className: 'gh-btn',
                    type: 'button',
                    onClick: onRefresh,
                    disabled: busyNow,
                    style: { marginLeft: '6px' },
                  }, t('refresh')),
                ),
              )
            : h('p', { className: 'gh-help' }, t('ghCliNotInstalled')),

        device !== null && device !== undefined
          ? h(DevicePanel, {
              device,
              now,
              copied,
              t,
              onCopy,
              onOpen,
              onCancel: onCancelDevice,
            })
          : null,

        h('details', { className: 'gh-details' },
          h('summary', {}, t('otherMethods')),
          h('div', { className: 'gh-details-body' },
            h('div', { className: 'gh-subcard' },
              h('h4', {}, t('patTitle')),
              h('p', { className: 'gh-help' }, t('patHint')),
              h('form', {
                className: 'gh-form',
                onSubmit: event => {
                  event.preventDefault()
                  onConnectPat()
                },
              },
                h('label', { className: 'gh-label', htmlFor: 'gh-pat-input' }, t('patLabel')),
                h('input', {
                  id: 'gh-pat-input',
                  className: 'gh-input',
                  type: 'password',
                  value: pat,
                  placeholder: t('patPlaceholder'),
                  autoComplete: 'off',
                  spellCheck: false,
                  disabled: busyNow || !canLink,
                  onChange: event => setPat(event.target.value),
                }),
                h('div', { className: 'gh-actions' },
                  h('button', {
                    className: 'gh-btn gh-btn-primary',
                    type: 'submit',
                    disabled: busyNow || !canLink || pat.trim() === '',
                  }, busy === 'pat' ? t('connecting') : t('connect')),
                ),
              ),
              h('p', { className: 'gh-help' },
                t('patSecurity') + ' ',
                h('a', {
                  className: 'gh-link',
                  href: 'https://github.com/settings/tokens',
                  target: '_blank',
                  rel: 'noreferrer noopener',
                }, t('patLink')),
              ),
            ),

            h('div', { className: 'gh-subcard' },
              h('h4', {}, t('deviceTitle')),
              h('p', { className: 'gh-help' }, t('deviceHint')),
              deviceConfigured
                ? h('div', { className: 'gh-actions' },
                    h('button', {
                      className: 'gh-btn gh-btn-primary',
                      type: 'button',
                      onClick: onStartDevice,
                      disabled: busyNow || !canLink || device !== null,
                    }, busy === 'device' ? t('deviceStarting') : t('deviceStart')),
                  )
                : h('div', {},
                    h('p', { className: 'gh-help' }, t('deviceNotConfigured')),
                    h('pre', { className: 'gh-code' }, "clientId: '<your OAuth App Client ID>'"),
                    h('p', { className: 'gh-help' }, t('deviceSetup')),
                  ),
            ),
          ),
        ),
      )
    }

    function OperationsCard({ status, t }) {
      return h('section', { className: 'gh-card' },
        h('h3', { className: 'gh-card-title' }, t('operationsTitle')),
        h('p', { className: 'gh-help' }, t('operationsHint')),
        h('ul', { className: 'gh-ops' },
          h('li', {}, h('code', {}, 'github'), ' · ' + t('opRepos')),
          h('li', {}, h('code', {}, 'github'), ' · ' + t('opIssues')),
          h('li', {}, h('code', {}, 'github'), ' · ' + t('opCreate')),
          h('li', {}, h('code', {}, 'github'), ' · ' + t('opComment')),
        ),
        h('p', { className: 'gh-help' }, status.operations.allowMutations ? t('mutationsOn') : t('mutationsOff')),
        h('p', { className: 'gh-help' }, t('agentToolHint')),
      )
    }

    function Section(props) {
      const t = props.t
      const [status, setStatus] = useState(null)
      const [loading, setLoading] = useState(true)
      const [error, setError] = useState(null)
      const [busy, setBusy] = useState(null)
      const [pat, setPat] = useState('')
      const [device, setDevice] = useState(null)
      const [now, setNow] = useState(Date.now())
      const [copied, setCopied] = useState(false)
      const [confirming, setConfirming] = useState(false)

      const activeLocale = props.getLocale?.() ?? 'zh'
      const lang = String(activeLocale).toLowerCase().startsWith('zh') ? 'zh' : 'en'

      const load = useCallback(async () => {
        setLoading(true)
        try {
          const data = await api('/status')
          setStatus(data)
          setError(null)
        } catch (loadError) {
          setError(loadError.message)
        } finally {
          setLoading(false)
        }
      }, [])

      useEffect(() => {
        load()
      }, [load])

      useEffect(() => {
        setConfirming(false)
      }, [status?.linked])

      useEffect(() => {
        if (device === null) return
        const timer = setInterval(() => setNow(Date.now()), 1000)
        return () => clearInterval(timer)
      }, [device?.attemptId])

      useEffect(() => {
        if (device === null) return
        if (now >= device.startedAt + device.expiresIn * 1000) {
          setDevice(null)
          setError(t('expired'))
        }
      }, [device, now, t])

      useEffect(() => {
        if (device === null) return
        let stopped = false
        let timer = null
        const tick = async () => {
          try {
            const result = await api('/device/poll', {
              method: 'POST',
              body: { attemptId: device.attemptId },
            })
            if (stopped) return
            if (result.status === 'connected') {
              setDevice(null)
              await load()
              return
            }
            if (result.status === 'expired' || result.status === 'denied') {
              setDevice(null)
              setError(result.message || t('expired'))
              return
            }
            const delay = Math.max(1, Number(result.retryAfter ?? device.interval ?? 5))
            timer = setTimeout(tick, delay * 1000)
          } catch (pollError) {
            if (stopped) return
            setError(pollError.message)
            timer = setTimeout(tick, 5000)
          }
        }
        timer = setTimeout(tick, Math.max(1, device.interval ?? 5) * 1000)
        return () => {
          stopped = true
          if (timer !== null) clearTimeout(timer)
        }
      }, [device?.attemptId, load, t])

      async function linkGh() {
        setBusy('gh')
        setError(null)
        try {
          const result = await api('/gh-cli', { method: 'POST', body: {} })
          setStatus(result)
        } catch (linkError) {
          setError(linkError.message)
        } finally {
          setBusy(null)
        }
      }

      async function connectPat() {
        if (pat.trim() === '') {
          setError(t('patEmpty'))
          return
        }
        setBusy('pat')
        setError(null)
        try {
          const result = await api('/token', { method: 'POST', body: { token: pat.trim() } })
          setPat('')
          setStatus(result)
        } catch (tokenError) {
          setError(tokenError.message)
        } finally {
          setBusy(null)
        }
      }

      async function startDevice() {
        const popup = window.open('about:blank', '_blank')
        setBusy('device')
        setError(null)
        try {
          const result = await api('/device/start', { method: 'POST', body: {} })
          setDevice({ ...result, startedAt: Date.now() })
          setNow(Date.now())
          const url = result.verificationUriComplete || result.verificationUri
          if (popup !== null) popup.location.replace(url)
          else window.open(url, '_blank', 'noopener,noreferrer')
        } catch (deviceError) {
          if (popup !== null) popup.close()
          setError(deviceError.message)
        } finally {
          setBusy(null)
        }
      }

      async function cancelDevice() {
        if (device === null) return
        try {
          await api('/device/cancel', { method: 'POST', body: { attemptId: device.attemptId } })
        } catch {
          // the local attempt is already gone
        }
        setDevice(null)
      }

      async function copyCode() {
        if (device === null) return
        try {
          await navigator.clipboard.writeText(device.userCode)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        } catch {
          setError(t('copyFailed'))
        }
      }

      function openDevice() {
        if (device === null) return
        window.open(device.verificationUriComplete || device.verificationUri, '_blank', 'noopener,noreferrer')
      }

      async function disconnect() {
        if (!confirming) {
          setConfirming(true)
          return
        }
        setBusy('disconnect')
        setError(null)
        try {
          const result = await api('/disconnect', { method: 'POST', body: {} })
          setStatus(result)
          setConfirming(false)
        } catch (disconnectError) {
          setError(disconnectError.message)
        } finally {
          setBusy(null)
        }
      }

      const header = h('header', { className: 'gh-head' },
        h(Mark),
        h('div', {},
          h('h2', { className: 'gh-title' }, t('title')),
          h('p', { className: 'gh-sub' }, t('subtitle')),
        ),
      )

      const body = []
      body.push(header)
      body.push(h('p', { className: 'gh-note' }, t('localOnlyNote')))
      if (error !== null) {
        body.push(h('div', { className: 'gh-alert gh-alert-error', role: 'alert' },
          h('strong', {}, t('errorTitle') + ': '),
          error,
        ))
      }
      if (loading && status === null) {
        body.push(h('div', { className: 'gh-loading' }, t('loading')))
      } else if (status !== null) {
        body.push(h(DeepSeekCard, { status, t }))
        if (status.linked) {
          body.push(h(LinkedCard, {
            status,
            t,
            lang,
            busy,
            confirming,
            onRefresh: () => load(),
            onDisconnect: disconnect,
          }))
          body.push(h(OperationsCard, { status, t }))
        } else {
          body.push(h(ConnectCard, {
            status,
            t,
            busy,
            pat,
            setPat,
            onLinkGh: linkGh,
            onConnectPat: connectPat,
            onStartDevice: startDevice,
            device,
            now,
            copied,
            onCopy: copyCode,
            onOpen: openDevice,
            onCancelDevice: cancelDevice,
            onRefresh: () => load(),
          }))
        }
      }
      return h('div', { className: 'gh-wrap' }, ...body)
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'github-account-link: dictionaries')

        ctx.effect(() => {
          const style = document.createElement('style')
          style.dataset.dshGithubLink = 'true'
          style.textContent = CSS
          document.head.appendChild(style)
          return () => style.remove()
        }, 'github-account-link: styles')

        const t = ctx.locale.bind(NS)
        ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section',
          id: 'github-account',
          order: 35,
          label: () => t('nav'),
          locale: NS,
          inject: () => ({
            t,
            getLocale: () => ctx.locale.getSnapshot().active,
          }),
        }, Section))
      },
    }
  },
})
