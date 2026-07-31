# 结构化 @workflow 触发 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `/ai` 通过结构化工作流选择器触发已发布 Agent Run，展示状态卡片，不解析自然语言 JSON，不修改 Workflow v1。

**Architecture:** 前端独立 `ai-workflow-trigger` 特性模块管理选中态与幂等键；发送时走现有 `agentService.createRun`；新增公共配置 `system.enableAiWorkflowTrigger`（默认 false）作回滚开关；`kb-intelligence` 与 Workflow Schema 零改动。

**Tech Stack:** React 19 / Ant Design / Vitest / Java Settings 映射

**前置条件：**

- [x] P0 基线已获准 P2
- [x] Design 已落盘：`docs/superpowers/specs/2026-07-31-structured-workflow-trigger-design.md`
- [x] 未修改 Workflow v1

**实施状态（2026-07-31）：** 代码与单测已合入；默认开关关闭；受控 E2E 冒烟待联调环境开启 `enableAiWorkflowTrigger` 后验证。

**参考快照：** 本专项不依赖 lingclaw 源码拷贝；交互对照仅作产品参考。

---

## 文件地图

| 路径 | 职责 | 操作 |
|------|------|------|
| `frontend/src/features/ai-workflow-trigger/selection.ts` | 选中态类型、幂等键、发送载荷构建 | Create |
| `frontend/src/features/ai-workflow-trigger/selection.test.ts` | 单测 | Create |
| `frontend/src/features/ai-workflow-trigger/gate.ts` | 是否展示选择器门禁 | Create |
| `frontend/src/features/ai-workflow-trigger/gate.test.ts` | 门禁单测 | Create |
| `frontend/src/features/ai-workflow-trigger/WorkflowMentionPicker.tsx` | `@` / 按钮选择器 UI | Create |
| `frontend/src/features/ai-workflow-trigger/WorkflowRunCard.tsx` | 运行状态卡片 | Create |
| `frontend/src/pages/AIAssistantPage.tsx` | 接入选择器与卡片、分流发送 | Modify |
| `frontend/src/constants/ai-entry.ts` | 文案与 feature flag 键名 | Modify |
| `frontend/src/stores/app.store.ts` | `enableAiWorkflowTrigger` | Modify |
| `frontend/src/pages/admin/SettingsPage.tsx` | 管理开关 | Modify |
| `backend/.../SettingsServiceImpl.java` | `enableAiWorkflowTrigger` 映射，默认 `false` | Modify |
| `docs/ai-entry-boundaries.md` | 助手入口补充工作流触发边界 | Modify |
| `docs/README.md` / 路线图勾选 | 索引与 Gate | Modify |

---

## 统一交付 Gate

- [ ] 需求证据：P0 已记录内部使用方与验收指标
- [ ] 契约证据：design + 本 plan 落盘；Workflow v1 未改
- [ ] 安全证据：无权限隐藏选择器；403 卡片；默认关闭开关
- [ ] 功能证据：`vitest` 专项通过；手动或脚本冒烟一次 Run
- [ ] 回归证据：`frontend` `npm test` + `npm run type-check`；受影响后端若改 Settings 则相关模块可编译
- [ ] 运维证据：设置页可关 `enableAiWorkflowTrigger` 立即隐藏入口
- [ ] 文档证据：`docs/README.md`、`ai-entry-boundaries.md`、本地 `readme_plan.md` 同步

---

### Task 1: 选中态与幂等键纯函数

**Files:**

- Create: `frontend/src/features/ai-workflow-trigger/selection.ts`
- Test: `frontend/src/features/ai-workflow-trigger/selection.test.ts`

- [ ] **Step 1: Write the failing test**

覆盖：`buildIdempotencyKey` 格式稳定；`buildCreateRunPayload` 含 `workflowVersionId` + `input.query` + key；无选中时返回 null；禁止从正文解析 `@xxx{json}`。

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend; npm test -- src/features/ai-workflow-trigger/selection.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: Write minimal implementation**

导出：

```ts
export type WorkflowSelection = { workflowId: number; workflowVersionId: number; name: string };
export function buildIdempotencyKey(conversationId: string | number | null, workflowVersionId: number, nonce: string): string;
export function buildCreateRunPayload(selection: WorkflowSelection | null, query: string, idempotencyKey: string): { workflowVersionId: number; input: { query: string }; idempotencyKey: string } | null;
```

- [ ] **Step 4: Run test to verify it passes**

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/ai-workflow-trigger/selection.ts frontend/src/features/ai-workflow-trigger/selection.test.ts
git commit -m "test(frontend): 结构化工作流触发选中态与幂等键"
```

---

### Task 2: 门禁纯函数

**Files:**

- Create: `frontend/src/features/ai-workflow-trigger/gate.ts`
- Test: `frontend/src/features/ai-workflow-trigger/gate.test.ts`

- [ ] **Step 1–4:** `canShowWorkflowTrigger({ enableAI, enableAgent, enableAiWorkflowTrigger, user })`
  任一开关 false 或无 view/run → false。

- [ ] **Step 5: Commit**

---

### Task 3: 后端/前端开关（默认 false）

**Files:**

- Modify: `backend/kb-core/kb-core-platform/src/main/java/com/knowledge/base/foundation/service/impl/SettingsServiceImpl.java`
- Modify: `frontend/src/stores/app.store.ts`
- Modify: `frontend/src/constants/ai-entry.ts`
- Modify: `frontend/src/pages/admin/SettingsPage.tsx`（在 Agent 相关开关旁增加一项）

- [ ] 映射 `enableAiWorkflowTrigger` → `system.enableAiWorkflowTrigger`，默认 `"false"`
- [ ] 公共配置可读；Settings 可写
- [ ] Commit: `feat: 增加 AI 助手工作流触发开关（默认关闭）`

---

### Task 4: 选择器与运行卡片 UI

**Files:**

- Create: `WorkflowMentionPicker.tsx`、`WorkflowRunCard.tsx`
- Modify: `AIAssistantPage.tsx`（`ChatInput` 旁挂载；`handleSend` 分流）

行为：

1. 门禁通过时加载 `listPublishedWorkflows`
2. 选中后显示 chip；清除 chip 恢复普通问答
3. 有选中时发送 → `createSession`（可选）+ `createRun`；卡片展示状态；提供取消
4. `createRun` 同步阻塞至终态时，卡片直接显示终态；若后续改为异步仍可用 `getRun` 刷新
5. 无选中 → 原 `sendMessage` 路径

- [ ] 手动冒烟：开开关 + 有权限账号选流程跑通
- [ ] Commit: `feat(frontend): AI 助手结构化 @workflow 触发`

---

### Task 5: 文档与路线图 Gate

**Files:**

- Modify: `docs/ai-entry-boundaries.md`（助手节补充触发边界；搜索节写明禁止）
- Modify: `docs/README.md`
- Modify: `docs/superpowers/plans/2026-07-31-absorb-lingclaw-strengths.md` Phase 2 进入实施 Gate 勾选
- Modify: 本地 `readme_plan.md`

- [ ] Commit: `docs: 同步结构化 @workflow 触发边界与索引`

---

### Task 6: 回归验证

- [ ] `cd frontend; npm test`
- [ ] `cd frontend; npm run type-check`
- [ ] 若改了 Settings：确认 Core 模块可编译（不强制全仓 `verify-all`，但若环境可用则跑）
- [ ] 勾选本 plan 统一交付 Gate

---

## 验证与回滚

| 命令 | 预期 |
|------|------|
| `cd frontend; npm test -- src/features/ai-workflow-trigger` | 全部 PASS |
| `cd frontend; npm run type-check` | 无错误 |
| 设置 `enableAiWorkflowTrigger=false` | `/ai` 无选择器 |

**回滚：** 关闭 `system.enableAiWorkflowTrigger`；必要时 revert 前端接入提交。

**提交边界：** 不携带 `RagGroundingSupport` 等无关变更；不提交 `readme_plan.md` / `target/` / `docs/lingclaw/`。

## 停损

- 若产品要求解析消息正文 JSON → 停止，回到 design 修订
- 若必须改 Workflow Schema → 停止，开 v2
