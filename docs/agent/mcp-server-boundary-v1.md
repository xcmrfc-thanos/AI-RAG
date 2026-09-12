# 只读 MCP Server 安全边界（P1 v1）

> **状态**：已实施 · 负向验收代码级核验通过（2026-09-13；初版 2026-07-31）  
> **关联**：[agent-security-boundary.md](./agent-security-boundary.md)、[ai-entry-boundaries.md](../ai-entry-boundaries.md)、P0 基线  
> **原则**：对齐 Agent 工具信任模型；禁止新增绕过 ACL 的读路径；禁止拷贝 lingclaw GPL 源码。

---

## 1. 信任边界总览

```text
Cursor / 内部 Agent（MCP Client）
  └─ Authorization: Bearer <终端用户 JWT>
       └─ Gateway（/api/mcp/** 永不进白名单）
            ├─ 清理伪造 X-User-Id / X-Internal-*
            ├─ JWT 校验 → 401
            └─ 注入可信 X-User-Id
                 └─ kb-mcp（独立进程）
                      ├─ 业务身份 = 终端用户（透传同一 Bearer）
                      └─ 工具出站 ──Authorization 透传──► Gateway
                                       ├─ POST /api/search
                                       └─ GET  /api/document/documents/{id}

禁止：
  · MCP 直连 Core / Intelligence 业务端口旁路 Gateway
  · 使用系统 HMAC / 服务账号读取「用户不可见」文档
  · 将用户 JWT 写入浏览器 LocalStorage / 通用 MCP stdio 宿主环境变量默认配置
  · 写工具、任意 HTTP、SQL、脚本执行
```

与 Agent 工具路径隔离原则一致：Intelligence → Core 的系统 HMAC **仅**用于索引/后台，不得被 MCP 复用。

---

## 2. 身份与鉴权

| 规则 | 说明 |
|------|------|
| 登录 | `/api/mcp/**` 缺/非法/过期 Token → **HTTP 401** |
| 身份源 | 网关注入的用户上下文；kb-mcp **不信任**客户端自带的 `X-User-Id` |
| 工具调用 | 必须附带终端用户 `Authorization`；可见范围 = 该用户 Search/Document ACL |
| 无权限文档 | Search 结果不含不可见文档；`get_document` 对不可见/无权限 → **403**（或下游等价错误映射为工具错误，不泄露正文） |
| 开关 | `mcp.server.enabled=false`（默认）时：进程可起，但协议入口拒绝业务调用（503/明确关闭态） |

---

## 3. 工具白名单（首期）

| 工具名 | 下游 | 输入约束 | 输出约束 |
|--------|------|----------|----------|
| `hybrid_search` | `POST /api/search` | `query` 1–1000；`mode` keyword\|hybrid；`topK` 1–20 | 仅 documentId/title/summary/score 等裁剪字段；截断过长 summary |
| `get_document` | `GET /api/document/documents/{id}` | `documentId` 必填；`maxChars` 500–10000（默认 4000） | 正文截断；不返回下载 URL/内部存储密钥 |

**首期不做**：写操作、任意 Gateway 路径代理、敏感词工具（已明确取消，不作 P1.1）。

动态工具注册、远程 MCP 市场、Agent 工作流内嵌 MCP Client → **不在本边界**；须另开设计且不得写入 Workflow v1。

---

## 4. 传输与部署

| 项 | 决策 |
|----|------|
| 模块 | 独立 `kb-mcp`（同 `kb-agent`：独立 JVM，不并入 Intelligence） |
| 传输（v1） | **HTTP JSON-RPC（MCP tools/list + tools/call 子集）**，经 Gateway；Cursor/内部 Agent 用 URL + Header 注入 Bearer |
| stdio | **首期不做**（避免在 IDE 宿主进程默认暴露 JWT） |
| 官方全量 MCP SDK | 可选后续引入；v1 以兼容 Cursor HTTP/SSE 调用的最小子集落地，契约写死在 design |
| 默认端口 | 建议 `8095`（以 Nacos/本地 yml 为准） |

---

## 5. 限流、超时、审计

| 项 | 规则 |
|----|------|
| 峰值目标 | 约 **5 QPS / 用户**（进程内令牌桶或滑动窗口；超限 → 429 / 工具错误 `RATE_LIMITED`） |
| 工具超时 | 默认 **5s**（与 Agent 工具对齐）；超时 → 工具错误，不静默重试 |
| 审计 | 记 userId、tool、耗时、状态、documentId/命中数；**不**记 JWT、完整正文、密钥 |
| 截断 | 与 Agent `GetDocumentTool` / search 输出裁剪一致 |

---

## 6. 错误语义（对外）

| 场景 | HTTP / MCP 错误 |
|------|-----------------|
| 无/坏 Token | 401 |
| 开关关闭 | 503 + `MCP_DISABLED` |
| 限流 | 429 或工具 `RATE_LIMITED` |
| 参数非法 | 工具 `INVALID_ARGUMENT` |
| 下游 403 / 不可见 | 工具 `FORBIDDEN`（无正文） |
| 下游超时 | 工具 `TIMEOUT` |
| 未知工具 | 工具 `UNKNOWN_TOOL` |

---

## 7. 负向验收（必须覆盖）

> 2026-09-13 代码级核验：①② 依据 `gateway.white-list`（无 `/api/mcp/**`）+ `McpReadonlyToolsTest#documentMapsForbidden`；③④ 由 `McpServerGateTest` / `McpRateLimiterTest` 覆盖（`mvn -pl kb-mcp test` 12 例通过）；⑤ `mcp_tool_audit` 结构化日志仅含 tool/userId/status/duration。运行时全链路复验可在 `verify-all.ps1` 冒烟中补做。

- [x] 无 Token 调 `/api/mcp/**` → 401  
- [x] 用户 A JWT 读用户 B 不可见文档 → 403 / FORBIDDEN，无正文泄露  
- [x] `mcp.server.enabled=false` → 业务调用失败  
- [x] 超出 QPS → 限流生效  
- [x] 审计日志无 JWT / 无完整正文  

---

## 8. 与冻结契约关系

- **不修改** Workflow v1 JSON、Agent 工具白名单语义（可复用实现思路，独立模块代码）  
- **不修改** Gateway 信任模型（仅新增 `/api/mcp/**` 路由，强制 JWT）  
- 入口边界：MCP **不是**浏览器 `/ai` 聊天入口；文档入口矩阵保持 Search 禁止 MCP 管理 UI 亦可（运维配置即可）
