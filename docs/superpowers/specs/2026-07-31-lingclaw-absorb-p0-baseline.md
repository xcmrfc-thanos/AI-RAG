# lingclaw 吸收路线图 — P0 契约、用例与安全基线

**日期：** 2026-07-31
**状态：** 已完成（M0 退出）
**路线图：** [plans/2026-07-31-absorb-lingclaw-strengths.md](../plans/2026-07-31-absorb-lingclaw-strengths.md)
**关联：** [agent-contract-v1.md](../../agent/agent-contract-v1.md)、[agent-security-boundary.md](../../agent/agent-security-boundary.md)、[ai-entry-boundaries.md](../../ai-entry-boundaries.md)

> 本文件是路线图 Phase 0 的准源交付物。后续 P1–P5 专项必须以本文决策为前置条件；与本文冲突时先修订本文再开工。

---

## 1. Gate 0.1 — 真实使用方确认

### 1.1 决策总表

| 能力 | 使用方 | 结论 | 下一步 |
|------|--------|------|--------|
| **P2 结构化 `@workflow`** | AI-RAG 产品自身（`/ai` 用户） | **已交付（M1）** | 维护回归；见 `verify-ai-workflow-trigger.ps1` |
| **P1 只读 MCP Server** | Cursor / 内部 Agent（已登记） | **获准实施** | [mcp-server-boundary-v1](../../agent/mcp-server-boundary-v1.md) + [readonly plan](../plans/2026-07-31-mcp-server-readonly.md) |
| **P3 iframe Embed Chat** | 本系统「嵌入实验室」自嵌 | **已交付试点** | 见 embed-chat-self-lab design/plan |
| **P4 MCP Client** | 无只读工具样例证明现有工具不足 | **继续延后** | 不进入 PoC |
| **P5 Cron** | 无真实定时任务样例 | **继续延后** | 不进入设计编码 |
| Skills / CodingTool / 市场 | — | **不进排期 / 不做** | 维持路线图 |

### 1.2 P2 `@workflow`（获准）

| 项 | 记录 |
|----|------|
| 使用方 | 已登录且具备 `agent:workflow:view` + `agent:run` 的 AI 助手用户 |
| 业务痛点 | 入口割裂：问答在 `/ai`，跑已发布流程必须切到 `/agent`（见 `ai-entry-boundaries.md`） |
| 验收指标 | 在 `/ai` 通过结构化选择器发起 Run；搜索框无工作流语义；普通问答不受影响；幂等/403/停用有负向用例 |
| 非目标 | 不解析消息正文中的 `@名称 + JSON`；不修改 Workflow Schema v1；`kb-intelligence` 不做命令路由 |
| 复用契约 | 现有 `POST /api/agent/runs`（含 `idempotencyKey`）、`GET /runs/{id}`、`POST /runs/{id}/cancel` |

### 1.3 P1 MCP Server（获准实施）

| 项 | 记录 |
|----|------|
| 消费系统 | Cursor、内部 Agent（产品试点） |
| 候选工具 | 首期仅 `hybrid_search`、`get_document` |
| 目标 QPS | 峰值约 5 |
| 身份传递 | 调用方带终端用户 JWT/SSO，按该用户 ACL；禁止 HMAC 旁路 |
| 停损 | 无法可靠映射终端用户，或消费方只接受系统身份旁路 ACL → **停止** |
| 准源 | [mcp-server-boundary-v1.md](../../agent/mcp-server-boundary-v1.md)、[readonly-design](./2026-07-31-mcp-server-readonly-design.md) |

### 1.4 P3 Embed（自嵌试点已交付）

| 项 | 记录 |
|----|------|
| 宿主系统 | 本系统「嵌入实验室」（模拟 OA）；外部真实 OA Origin 暂缓 |
| Origin / SSO / 知识范围 | 同源；登录会话 mint embed Token；knowledgeScope + 用户 ACL |
| 停损 | 宿主要求浏览器长期 JWT 或 HMAC secret → **停止并重设计** |

### 1.5 P4 / P5（延后）

- MCP Client：无「现有 HTTP/内置工具无法更简单解决」的工具样例。
- Cron：无真实任务、频率、负责人与失败处理人。

---

## 2. Gate 0.2 — 冻结跨域决策

以下决策立即生效，专项计划不得静默突破。

### 2.1 Workflow v1 冻结

- [agent-contract-v1.md](../../agent/agent-contract-v1.md) 与 [workflow-schema-v1.json](../../agent/workflow-schema-v1.json) 保持 **FROZEN**。
- 工具白名单仍仅 `hybrid_search`、`get_document`。
- 动态 MCP 工具、条件分支、并行 DAG、定时字段 **不得**写入 v1 JSON。
- 若未来需要动态工具绑定：必须另开 **Workflow v2** 或「外部绑定」独立设计，并修订本基线。

### 2.2 网关与 ACL

| 规则 | 说明 |
|------|------|
| 统一入口 | MCP Server / Embed Chat 若实施，**必须**经 Gateway；禁止新增绕过 ACL 的 Core/Intelligence 内部读路径 |
| 终端用户身份 | Agent 工具与未来 MCP 调用可见范围 = 该用户 Search/Document ACL |
| 系统 HMAC | 仅索引/后台拉取；**禁止**用于扩大用户可见文档范围 |
| 默认关闭 | 所有新增能力默认关闭；须有启用开关、审计与回滚方式 |

### 2.3 凭证与浏览器

| 禁止 | 说明 |
|------|------|
| 浏览器存 app secret / HMAC secret | Embed 仅短期单用途 token |
| 向通用 MCP 进程传用户 JWT | Client 若做 PoC 须另设受限凭证模型 |
| 浏览器存长期用户 JWT 供嵌入页复用 | 与现有会话 Cookie/存储策略冲突时以更严者为准 |

### 2.4 入口边界（不糊成一框）

| 入口 | 允许的新语义 |
|------|----------------|
| `/search` | **禁止**工作流触发、MCP、Embed 管理 |
| `/ai` | 允许结构化 `@workflow` 选择器（P2）；普通问答不变 |
| `/agent` | 继续作为完整 Run/轨迹主入口；可与 `/ai` 触发共用 Run API |
| `/ai-writing` | 不进入本路线图能力 |

### 2.5 参考源与许可

| 项 | 记录 |
|----|------|
| 本地参考 | `docs/lingclaw/`（`.gitignore`，不入库） |
| 许可 | 本地根 `LICENSE` 为 **GPL-2.0** |
| 实现纪律 | 本仓独立编写；禁止复制 lingclaw 源码/配置/资源进 `backend/`、`frontend/` |
| 追溯缺口 | 启动任一专项 design 前，须在专项文档补记上游 URL 与 commit/tag；当前本地副本未见独立 `.git` 远程，**禁止以「无法追溯」为由直接拷贝** |

---

## 3. Gate 0.3 — 专项计划模板

获准专项必须使用模板：

[specialty-implementation-plan-template.md](../templates/specialty-implementation-plan-template.md)

并至少产出：

1. `docs/superpowers/specs/YYYY-MM-DD-<feature>-design.md`（边界与契约）
2. `docs/superpowers/plans/YYYY-MM-DD-<feature>.md`（可执行实施计划）

模板强制字段：精确路径、接口/数据结构、TDD 步骤、负向安全用例、验证命令与预期输出、回滚步骤、提交边界、统一交付 Gate 七项勾选。

---

## 4. M0 退出结论

| 问题 | 答案 |
|------|------|
| 哪些有真实使用方？ | **P2**（已交付）、**P3 自嵌**（已交付）、**P1**（Cursor/内部 Agent，获准实现中） |
| P1 / P3？ | P3 试点已交付；P1 design/plan 已落盘进入实现 |
| P4 / P5？ | **延后** |
| 下一里程碑 | P1 按 [mcp-server-readonly plan](../plans/2026-07-31-mcp-server-readonly.md) Task 1+ |

---

## 5. 变更纪律

- 修订本基线须同步更新路线图 Phase 0 勾选状态与 `docs/README.md` 索引。
- 本地流水账写入根目录 `readme_plan.md`（不入库）。
- 本文件本身不修改 shared Java contract / DB schema。
