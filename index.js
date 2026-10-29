/**
 * Host half of the GitHub account-link bundle.
 *
 * The host owns the GitHub credential, the DeepSeek-account-scoped binding,
 * the browser JSON routes, and the `github` agent tool. The client half only
 * renders the settings page and calls these routes.
 */

import { createGitHubLinkService } from './host/service.js'
import { createRoutes } from './host/routes.js'
import { createGitHubTool } from './host/tool.js'

export const name = 'github-account-link'
export const inject = ['webServer', 'credentials']

export function apply(ctx, config = {}) {
  const service = createGitHubLinkService(ctx, config)

  ctx.effect(() => {
    const disposers = createRoutes(service).map(route => ctx.webServer.register(route))
    return () => {
      for (const dispose of disposers) dispose()
    }
  }, 'github-account-link: browser routes')

  ctx.inject(['tools'], (toolCtx) => {
    toolCtx.effect(
      () => toolCtx.tools.register(createGitHubTool(service)),
      'github-account-link: agent tool',
    )
  })

  // Explicit opt-in only. The default path is the one-click button in
  // Settings, so a plugin upgrade never silently grants repo access.
  if (config?.autoLinkGhCli === true) {
    void service.autoLink()
  }
}
