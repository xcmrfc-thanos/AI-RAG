# 结构化 @workflow 触发设计

**日期：** 2026-07-31
**状态：** 已获准（P0 基线）；待实施
**路线图：** [plans/2026-07-31-absorb-lingclaw-strengths.md](../plans/2026-07-31-absorb-lingclaw-strengths.md)
**P0 基线：** [specs/2026-07-31-lingclaw-absorb-p0-baseline.md](./2026-07-31-lingclaw-absorb-p0-baseline.md)
**计划：** [plans/2026-07-31-structured-workflow-trigger.md](../plans/2026-07-31-structured-workflow-trigger.md)

## 目标

在 AI 助手（`/ai`）内用**结构化选择器**触发已发布 Agent 工作流，缩短「问答入口 → 跑流程」路径；不改变 Workflow Schema v1，不解析自然语言中的 JSON 命令。

## 非目标

- 修改 `workflow-schema-v1.json` / Agent 契约 v1 工具白名单
- 从消息正文解析 `@workflow:<名称> + JSON`
- 在 `/search` 或 `/ai-writing` 引入工作流语义
- `kb-intelligence` 承担文本命令路由或代理 Run
- MCP Client / Cron / Embed

## 交互

1. 用户在 `/ai` 输入区点击「工作流」或输入 `@` 打开选择器（仅展示已发布且有 `publishedVersionId` 的流程）。
2. 选择后在输入区展示只读 chip：`@流程名`；内部状态保存 `{ workflowId, workflowVersionId, name }`。
3. 用户填写自然语言问题作为 `input.query`，点发送。
4. 前端调用现有 `POST /api/agent/runs`（经 Gateway），带 `idempotencyKey`；对话区插入「工作流运行卡片」（状态 / 取消 / 终态摘要），**不**走 `aiService.askStream`。
5. 取消 chip 或发送普通消息（无选中工作流）时，行为与现有问答一致。

## 数据与 API

| 项 | 约定 |
|----|------|
| 列表 | `GET /api/agent/workflows?publishedOnly=true` |
| 创建 Run | `POST /api/agent/runs`：`workflowVersionId`、`input: { query }`、可选 `sessionId`、`idempotencyKey` |
| 查询 / 取消 | 现有 `GET /runs/{id}`、`GET /runs/{id}/steps`、`POST /runs/{id}/cancel` |
| 幂等键 | `ai-wf-{conversationId|anon}-{workflowVersionId}-{uuid}`；重复点击同一发送沿用同一键直至终态或用户显式新触发 |
| Schema | **不改**；版本停用后列表不再出现该 `publishedVersionId` |

## 权限与开关

| 条件 | 行为 |
|------|------|
| `system.enableAI=false` | `/ai` 本就关闭，无入口 |
| `system.enableAgent=false` | 不展示工作流选择器 |
| `system.enableAiWorkflowTrigger=false`（**新增，默认 false**） | 不展示选择器；回滚开关 |
| 无 `agent:workflow:view` / `agent:run` | 不展示选择器；若绕过 UI 调 API 仍由后端 403 |
| 流程无 published 版本 / 403 / 失败 | 卡片展示明确错误，不降级为普通 RAG 问答 |

## 安全边界

- 浏览器不新增 secret；沿用用户 JWT 经 Gateway。
- 不向 intelligence 旁路 ACL。
- `/search` 禁止出现工作流触发 UI/文案。
- 审计沿用 Agent Run 既有字段；前端不把 JWT 写入卡片日志。

## 体验细则

| 场景 | 处理 |
|------|------|
| 重复点击发送 | 同一 `idempotencyKey` → 同一 Run |
| 版本变化 | 以选择瞬间的 `workflowVersionId` 为准；发送前若列表刷新发现版本消失 → 提示重新选择 |
| 运行中 | 卡片显示 RUNNING；可协作取消（文案复用 Agent 取消提示） |
| 终态 | 展示 `extractAgentAnswer` 摘要 + 链到 `/agent` 查看完整轨迹（可选） |
| 普通问答 | 无 chip 时完全不受影响 |

## 文件范围（实施）

- 新增：`frontend/src/features/ai-workflow-trigger/**`（选择状态、幂等键、卡片逻辑与单测）
- 修改：`AIAssistantPage.tsx`、`ai-entry.ts`、`app.store.ts`、设置页与 Core `SettingsServiceImpl`（新开关）
- 文档：`ai-entry-boundaries.md`、本 design、implementation plan、`docs/README.md`
- **不改** `backend/kb-agent` Run 契约与 schema SQL

## 验收指标

1. 选择器选中后发送 → 成功创建 Run 且卡片展示终态。
2. 无开关/无权限时选择器不可见。
3. 幂等键重复提交不双跑（服务端已有；前端保证键稳定）。
4. `/search` 无工作流触发语义（静态检查 / 文案）。
5. 普通流式问答回归通过。
