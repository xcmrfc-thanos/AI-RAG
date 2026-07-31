# 只读 MCP Server Design（P1）

> **日期**：2026-07-31  
> **状态**：获准实施（使用方已登记）  
> **安全边界准源**：[docs/agent/mcp-server-boundary-v1.md](../../agent/mcp-server-boundary-v1.md)  
> **P0 基线**：[2026-07-31-lingclaw-absorb-p0-baseline.md](./2026-07-31-lingclaw-absorb-p0-baseline.md)  
> **准入**：[2026-07-31-lingclaw-absorb-m2-waitlist.md](./2026-07-31-lingclaw-absorb-m2-waitlist.md)

---

## 1. 背景与目标

为企业侧 **Cursor / 内部 Agent** 提供只读 MCP 能力，复用现有 `hybrid_search`、`get_document` 语义（与 kb-agent 工具对齐），经 Gateway + 终端用户 JWT 执行 ACL，峰值约 5 QPS。

**非目标**：MCP Client、stdio 默认托管、写工具、系统 HMAC 旁路、Workflow v1 动态工具、敏感词工具（P1.1）。

---

## 2. 使用方与验收指标

| 项 | 值 |
|----|-----|
| 消费方 | Cursor IDE、内部 Agent |
| 身份 | 调用方携带用户 JWT/SSO（经 Gateway） |
| 首期工具 | `hybrid_search`、`get_document` |
| 验收 | Cursor 能 list/call；ACL 负向用例通过；默认关闭；限流可测 |

---

## 3. 架构

```text
MCP Client ──Bearer──► Gateway /api/mcp/** ──► kb-mcp
                                              ├─ McpProtocolController (JSON-RPC 子集)
                                              ├─ ToolRegistry (白名单)
                                              ├─ RateLimiter (~5 QPS/user)
                                              └─ GatewayHttpClient ──Bearer──► /api/search | /api/document/...
```

- **独立模块** `backend/kb-mcp`，不并入 Intelligence JVM。  
- **协议 v1**：HTTP `POST` JSON-RPC 2.0 子集：`initialize`、`tools/list`、`tools/call`（及必要的 `notifications/initialized` 忽略）。  
- 后续若引入官方 MCP Java SDK / SSE，不改变工具语义与身份模型。

---

## 4. 工具契约

### 4.1 hybrid_search

**输入**

| 字段 | 类型 | 约束 |
|------|------|------|
| query | string | 1–1000 |
| mode | string | 可选，默认 `hybrid`；`keyword`\|`hybrid` |
| topK | number | 可选，默认 5；1–20 |

**输出**：`{ hits: [{ documentId, title, summary, score? }] }`（字段裁剪）

### 4.2 get_document

**输入**

| 字段 | 类型 | 约束 |
|------|------|------|
| documentId | string/number | 必填 |
| maxChars | number | 可选，默认 4000；500–10000 |

**输出**：`{ documentId, title, summary?, contentTruncated }`

---

## 5. 配置

| 键 | 默认 | 说明 |
|----|------|------|
| `mcp.server.enabled` | `false` | 总开关 |
| `mcp.gateway-base-url` | `http://127.0.0.1:18080` | 出站 Gateway |
| `mcp.timeouts.tool-seconds` | `5` | 工具超时 |
| `mcp.rate-limit.per-user-qps` | `5` | 每用户近似 QPS |
| 服务端口 | `8095` | 本地/Nacos |

Gateway 增加 `kb-mcp` 路由：`/api/mcp/**` → StripPrefix=2 → `lb://kb-mcp`，**不进白名单**。

---

## 6. 安全摘要

见 [mcp-server-boundary-v1.md](../../agent/mcp-server-boundary-v1.md)。要点：401/403、默认关、禁 HMAC 旁路、审计无敏感载荷、输出截断。

---

## 7. 测试策略

- 单测：工具入参校验、限流、开关关闭、JSON-RPC 路由  
- 冒烟：`deploy/scripts/verify-mcp-readonly.ps1`（静态契约 + 可选 `-Live`）  
- 负向：无 Token、越权文档、超 QPS  

---

## 8. 与 lingclaw 关系

仅参考「只读工具暴露给 IDE」产品形态；**禁止**拷贝 GPL 源码；传输/SDK 按本仓库栈独立选型。
