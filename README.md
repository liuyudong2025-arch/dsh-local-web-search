# dsh-local-web-search

> 0.1.1 新增 Harness 图形化参数页：在“插件”中打开本插件的 `local-web-search` 行并点击“配置”，即可设置搜索源、SearXNG 地址、超时、网页大小上限和最大结果数，无需手改 YAML。

DeepSeek Harness 原生本地联网搜索插件。它会禁用 DeepSeek 官方 `web-search-deepseek`，并注册两个名称明确的本地工具：

- `local_web_search`：通过 Bing RSS、DuckDuckGo 或自建 SearXNG 搜索互联网。
- `local_web_fetch`：从本机抓取公开网页并转换为可读文本。

“免费”指不调用 DeepSeek Search / Fetch，因此不产生这两项按次费用。DeepSeek 模型 Token 仍按模型价格计费。

## 安装

从 npm 安装到 Harness Web Profile：

```powershell
dsh plugin --profile web add dsh-local-web-search
```

从本地 tarball 安装：

```powershell
dsh plugin --profile web add .\dsh-local-web-search-0.1.1.tgz
```

重新启动 Harness 后，工具列表应出现：

```text
local_web_search
local_web_fetch
```

检查最终配置：

```powershell
dsh --profile web --dump-config
```

输出中应同时满足：

```yaml
- id: web-search-deepseek
  disabled: true
- id: local-web-search
  name: dsh-local-web-search
```

## 配置

0.1.1 起可直接在 Harness 的“插件”页面打开 `local-web-search` 行并点击“配置”。也可在 `$DSH_HOME/profiles/web/cordis.patch.yml` 中覆盖同一个插件行。默认配置：

```yaml
- id: local-web-search
  name: dsh-local-web-search
  config:
    provider: bing
    searxngUrl: http://127.0.0.1:8080
    timeoutMs: 20000
    maxFetchBytes: 2097152
    maxResults: 10
```

`provider` 支持 `bing`、`duckduckgo` 和 `searxng`。

## 安全边界

- 只允许 HTTP/HTTPS。
- DNS 解析后拒绝本机、内网及保留地址。
- 每次跳转都重新检查目标地址。
- 默认超时 20 秒，网页上限 2 MiB。
- 拒绝非文本内容。
- 网页内容会明确标记为不可信外部数据。

部分网站会因登录、验证码、JavaScript 渲染或反自动化策略而抓取失败；插件会返回具体 HTTP 状态或失败原因，便于 Agent 更换来源。

## 卸载

```powershell
dsh plugin --profile web remove dsh-local-web-search
```

MIT License
