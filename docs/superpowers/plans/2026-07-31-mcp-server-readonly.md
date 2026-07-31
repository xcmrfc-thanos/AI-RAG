# 只读 MCP Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付经 Gateway、终端用户 JWT、默认关闭的只读 MCP HTTP 适配层，首期工具 `hybrid_search` + `get_document`。

**Architecture:** 独立 `kb-mcp` 进程；协议为 JSON-RPC 子集；工具出站复用 Agent 同款 Gateway + Bearer 模式；不改 Workflow v1 / 不引入 HMAC 旁路。

**Tech Stack:** Java 21、Spring Boot 3.2、Gateway JWT、进程内限流；可选后续官方 MCP SDK。

**前置条件：**

- [x] 已满足 P0 基线中对本能力的获准结论（waitlist 已登记 Cursor/内部 Agent）
- [x] 已存在对应 design/spec，且安全边界已落盘
- [x] 未静默修改 Workflow v1 / 入口边界 / Gateway 信任模型

**参考快照（若对照 lingclaw）：**

| 项 | 值 |
|----|-----|
| 上游 URL | （仅产品参考，不继承实现） |
| commit / tag | — |
| 本地路径 | `docs/lingclaw/...`（若有） |
| 许可 | GPL-2.0（仅参考，禁止拷贝源码） |

**准源 design：** [specs/2026-07-31-mcp-server-readonly-design.md](../specs/2026-07-31-mcp-server-readonly-design.md)  
**安全边界：** [docs/agent/mcp-server-boundary-v1.md](../../agent/mcp-server-boundary-v1.md)

---

## 文件地图

| 路径 | 职责 | 操作 |
|------|------|------|
| `docs/agent/mcp-server-boundary-v1.md` | 安全边界 | Create |
| `docs/superpowers/specs/2026-07-31-mcp-server-readonly-design.md` | 专项 design | Create |
| `backend/kb-mcp/**` | MCP 服务 | Create |
| `backend/pom.xml` | 注册模块 | Modify |
| `backend/nacos/kb-gateway-dev.yaml.template` | `/api/mcp/**` 路由 | Modify |
| `backend/kb-gateway/...`（若本地 yml 需同步） | 路由/白名单确认 | Modify |
| `deploy/scripts/verify-mcp-readonly.ps1` | 冒烟 | Create |
| `docs/superpowers/plans/2026-07-31-absorb-lingclaw-strengths.md` | Phase1 勾选 | Modify |

---

## 统一交付 Gate（完成前全部勾选）

- [x] 需求证据：使用方、负责人、用例、可量化验收指标（waitlist）
- [x] 契约证据：spec + 本 plan 已落盘；冻结契约未静默变更
- [x] 安全证据：401/403、ACL 越权、凭证泄露、默认关闭、限流均有负向验证
- [x] 功能证据：专项单测/集成通过；至少一次受控 E2E/冒烟
- [x] 默认关闭：`mcp.server.enabled=false` 时业务不可用
- [x] 文档：边界 + design + 本 plan + 冒烟脚本说明

---

## Task 0：契约落盘（本提交）

**目标：** design + boundary + plan 入库，路线图 Phase1 门禁更新为「设计已完成，进入实现」。

- [x] 写 `mcp-server-boundary-v1.md`
- [x] 写 design spec
- [x] 写本 plan
- [x] 更新 absorb 路线图 / P0 基线状态文案
- [x] 提交（不混入无关 RagGrounding 等改动）

---

## Task 1：脚手架 `kb-mcp`

**目标：** 可启动的 Spring Boot 模块 + health；开关默认关。

- [x] `backend/kb-mcp` 加入 parent `pom.xml`
- [x] `McpApplication`、`application.yml`（port 8095、`mcp.server.enabled=false`）
- [x] Security：JWT 过滤器 + 健康检查放行；业务需登录；ACL 仍由下游 Gateway 强制
- [x] 单测：`McpServerGateTest`（默认关闭 / 显式启用）

---

## Task 2：Gateway 出站客户端 + 两工具

**目标：** 镜像 `HybridSearchTool` / `GetDocumentTool` 语义。

- [x] `GatewayMcpHttpClient`（仅允许 `/api/**`，强制 Bearer）
- [x] `HybridSearchMcpTool` / `GetDocumentMcpTool`
- [x] 入参校验与输出截断单测（MockRest）

---

## Task 3：JSON-RPC 协议入口 + 限流

**目标：** `POST /mcp`（经 Gateway 为 `/api/mcp`）支持 initialize / tools/list / tools/call。

- [x] `McpJsonRpcController` / `McpJsonRpcService`
- [x] 每用户 ~5 QPS 限流
- [x] 开关关闭 → 明确错误
- [x] 审计日志（无 JWT/正文）

---

## Task 4：Gateway 路由 + 冒烟脚本

- [x] Nacos template：`/api/mcp` + `/api/mcp/**` → kb-mcp，不进白名单；UnifiedResponse 跳过 MCP
- [x] `verify-mcp-readonly.ps1`：静态检查 + 可选 `-Live`
- [x] 更新路线图 Phase1 勾选与 M2 状态

---

## Task 5：P1.1（可选，另开）

- [ ] `check_sensitive` 只读工具（若产品确认）

---

## 执行记录

| 日期 | Task | 结果 |
|------|------|------|
| 2026-07-31 | Task 0 | 完成（契约落盘） |
| 2026-07-31 | Task 1 | 完成（kb-mcp 脚手架 + 默认关） |
| 2026-07-31 | Task 2 | 完成（Gateway 出站 + 两只读工具） |
| 2026-07-31 | Task 3 | 完成（JSON-RPC 子集 + 限流） |
| 2026-07-31 | Task 4 | 完成（Gateway 路由 + 冒烟） |
