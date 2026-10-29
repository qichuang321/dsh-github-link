/**
 * The `github` agent tool. It calls the same service methods as the settings
 * page, so UI and agent behavior cannot drift apart.
 */

function errorResult(error) {
  return {
    ok: false,
    error: {
      code: typeof error?.code === 'string' ? error.code : 'GITHUB_TOOL_ERROR',
      message: error instanceof Error ? error.message : String(error),
    },
  }
}

export function createGitHubTool(service) {
  return {
    name: 'github',
    description: [
      '使用已关联的 GitHub 账号执行仓库与 Issue 操作。',
      'status: 查看关联状态（无需已关联）。',
      'list_repos: 列出当前 GitHub 账号可见的仓库。',
      'list_issues: 列出指定仓库的 Issue（repo 使用 owner/name）。',
      'create_issue: 在指定仓库创建 Issue（需要 title，可选 body）。',
      'comment_issue: 在指定 Issue/PR 下发表评论（需要 repo、number、body）。',
      '不会推送代码；所有操作都受已关联 GitHub 账号的权限限制。',
    ].join(' '),
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['status', 'list_repos', 'list_issues', 'create_issue', 'comment_issue'],
          description: '要执行的操作。',
        },
        repo: {
          type: 'string',
          description: 'GitHub 仓库，格式 owner/name，例如 octocat/Hello-World。',
        },
        number: {
          type: 'integer',
          description: 'Issue 或 Pull Request 编号（comment_issue 必填）。',
        },
        title: {
          type: 'string',
          description: 'Issue 标题（create_issue 必填）。',
        },
        body: {
          type: 'string',
          description: 'Issue 正文或评论内容。',
        },
        state: {
          type: 'string',
          enum: ['open', 'closed', 'all'],
          description: 'Issue 状态筛选，默认 open。',
        },
        limit: {
          type: 'integer',
          description: '返回数量，1-50，默认 20。',
        },
      },
      required: ['action'],
    },
    output: {
      schema: { type: 'object', additionalProperties: true },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
    },
    timeoutMs: 50_000,
    async execute(args) {
      const input = args !== null && typeof args === 'object' ? args : {}
      try {
        switch (input.action) {
          case 'status': {
            return { ok: true, ...(await service.status()) }
          }
          case 'list_repos': {
            const repos = await service.listRepos(input.limit)
            return { ok: true, count: repos.length, repos }
          }
          case 'list_issues': {
            const issues = await service.listIssues({
              repo: input.repo,
              state: input.state,
              limit: input.limit,
            })
            return { ok: true, count: issues.length, issues }
          }
          case 'create_issue': {
            const issue = await service.createIssue({
              repo: input.repo,
              title: input.title,
              body: input.body,
            })
            return { ok: true, issue }
          }
          case 'comment_issue': {
            const comment = await service.commentIssue({
              repo: input.repo,
              number: input.number,
              body: input.body,
            })
            return { ok: true, comment }
          }
          default:
            return {
              ok: false,
              error: {
                code: 'BAD_ACTION',
                message: 'action 必须是 status、list_repos、list_issues、create_issue 或 comment_issue。',
              },
            }
        }
      } catch (error) {
        return errorResult(error)
      }
    },
  }
}
