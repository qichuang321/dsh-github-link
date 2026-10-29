# GitHub 账号关联

把**当前 DeepSeek 账号**与本机 GitHub 身份关联，并给 Agent 一个受控的 `github` 工具：读取仓库、查看 Issue、创建 Issue、发表评论。

## 安装

```sh
dsh plugin --profile web add github:qichuang321/dsh-github-link
```

安装后重启/刷新 DSH Web UI，打开 **设置 → GitHub 账号**。仓库是纯 JavaScript，无需构建步骤。

## 它做了什么，没做什么

- 绑定记录保存在本机 DSH 的 `credentials` 服务里，按当前 DeepSeek 账号 ID 隔离。
- 不会修改 DeepSeek 官方账号资料，也不会把 GitHub token 发给浏览器。
- `gh-cli` 方式不复制 token：每次操作时通过 `gh auth token` 读取本机 CLI 登录，因此撤销/轮换 CLI 登录即可失效。
- Agent 只能调用插件暴露的仓库与 Issue 操作，不能推送代码。

## 三种关联方式

### 1. 本机 GitHub CLI（推荐，最接近“自动关联”）

插件会检测 `gh auth status`。如果本机已经执行过：

```powershell
gh auth login
```

打开 **设置 → GitHub 账号**，点击「一键关联」即可。无需创建 OAuth App，也不会把 token 存进 DSH。

插件配置里已有 `autoLinkGhCli` 开关。本机这份配置为 `true`：启动时如果还没有绑定，会自动复用 GitHub CLI 登录完成关联。若不想自动关联，把它改成 `false`；在设置页点「解除关联」也会写入一个 opt-out，直到下次手动关联前都不会再自动关联。

### 2. Personal Access Token

在 GitHub 创建 token（推荐 fine-grained，只授权需要的仓库），粘贴到设置页。Token 会写入 DSH credentials，不写入 `localStorage`。

### 3. OAuth App 设备授权

1. GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
2. 勾选 **Enable Device Flow**
3. 把 Client ID 填到插件配置：

```yaml
- id: github-account-link
  name: 'dsh-github-link'
  config:
    clientId: 'Iv1.xxxxxxxxxxxx'
    scopes: 'read:user public_repo'
```

这是没有 Client Secret 的设备流；适合不想使用本机 CLI 的场景。

## 配置

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `clientId` | 空 | OAuth App Client ID；为空时设备授权按钮不可用。 |
| `scopes` | `read:user public_repo` | 设备授权请求的 scope。本机 CLI 方式使用 `gh` 已有 scope。 |
| `allowMutations` | `true` | 是否允许 Agent 创建 Issue / 评论。 |
| `autoLinkGhCli` | 代码默认 `false`；本机配置为 `true` | 启动时若已登录 CLI 且没有绑定，是否自动关联。解除关联会 opt-out。 |

## Agent 工具

工具名：`github`

| action | 作用 |
| --- | --- |
| `status` | 查看 DeepSeek / GitHub 关联状态，不需要已关联。 |
| `list_repos` | 列出当前 GitHub 账号可见的仓库。 |
| `list_issues` | 读取 `owner/name` 的 Issue / PR。 |
| `create_issue` | 创建 Issue，需要 `title`。 |
| `comment_issue` | 评论 Issue / PR，需要 `number` 和 `body`。 |

示例：

```text
列出我的 GitHub 仓库
查看 qichuang321/dsh-plugin-browser 的 open issues
在 owner/repo 创建一个 issue，标题是“...”，正文是“...”
```

## 安全与排查

- 解除关联会删除 DSH 内的记录并停止自动关联，不会退出 GitHub CLI，也不会自动吊销 GitHub 上的 token。
- 如果 GitHub CLI 切换了账号，旧绑定会显示为不可用；重新关联即可。
- 如果提示 401，说明 token 已失效；重新关联。
- 如果提示 403 / rate limit，查看 GitHub API 速率限制后重试。
- 如果设置页显示 404，确认插件已安装且 DSH Web 已重新加载。

## 验证

安装后：

1. **设置 → GitHub 账号** 能看到页面。
2. 若本机 `gh` 已登录，点击「一键关联」后显示 GitHub 用户名和 scope。
3. 在对话中让 Agent 调用 `github` 工具执行 `status` 或 `list_repos`。

## 文件

- `index.js`：Host 入口，注册路由与 Agent 工具。
- `host/service.js`：绑定、凭据、账号隔离与操作编排。
- `host/github-api.js`：GitHub REST / Device Flow 客户端。
- `host/gh-cli.js`：本机 GitHub CLI 检测与 token 读取。
- `client.js`：设置页 UI。
