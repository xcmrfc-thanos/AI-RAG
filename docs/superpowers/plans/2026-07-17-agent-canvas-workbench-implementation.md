# Agent 画布工作台体验优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (\`- [ ]\`) syntax for tracking.

**Goal:** 将 \`/admin/agents\` 从基础 Schema 画布升级为可拖拽、可即时配置、可草稿试跑、可定位节点问题的 Dify 式 Agent 工作台，并增加一批基于现有系统接口的安全只读节点。

**Architecture:** 保持 \`schemaVersion=1\`、发布版本不可变和后端唯一线性链。前端拆成工具栏、节点库、画布、属性面板、变量选择器和调试抽屉；后端扩展安全变量字段路径、工具白名单和草稿 Run 快照，不引入条件分支、循环或任意代码执行。

**Tech Stack:** React 18、TypeScript、Ant Design、\`@xyflow/react\`；Spring Boot 3、MyBatis-Plus、Jackson；MySQL；Vitest、JUnit 5、Maven、PowerShell 验收脚本。

---

## Task 1: 扩展工作流元数据与安全变量字段路径

**Files:**
- Modify: \`backend/kb-agent/src/main/java/com/knowledge/base/agent/engine/VariableResolver.java\`
- Modify: \`backend/kb-agent/src/main/java/com/knowledge/base/agent/engine/WorkflowDefinition.java\`
- Modify: \`frontend/src/features/agent-workflow/types.ts\`
- Modify: \`frontend/src/features/agent-workflow/schema-flow-mapper.ts\`
- Test: \`backend/kb-agent/src/test/java/com/knowledge/base/agent/engine/VariableResolverTest.java\`
- Test: \`frontend/src/features/agent-workflow/schema-flow-mapper.test.ts\`

- [ ] **Step 1: Write failing nested-path tests**

Add tests for these exact cases:

\`\`\`java
assertEquals(7L, resolver.expandString(
        "${steps.search.output.hits[0].documentId}"));
assertEquals("ok", resolver.expandString(
        "${steps.answer.output.text}"));
assertThrows(ValidationException.class,
        () -> resolver.expandString("${steps.search.output.hits[*]}"));
assertThrows(ValidationException.class,
        () -> resolver.expandString("${steps.search.output.toString()}"));
\`\`\`

Run from \`backend\`:

\`\`\`powershell
mvn -pl kb-agent -am -Dtest=VariableResolverTest test
\`\`\`

Expected: FAIL because nested paths are not yet supported.

- [ ] **Step 2: Implement bounded path parsing**

Allow only roots \`input\` and \`steps\`; allow identifier fields and non-negative numeric indexes. Resolve \`Map\`, \`List\` and arrays. Reject wildcard, method, operator, negative index, missing node and missing field with \`VALIDATION_ERROR\` containing the full path. A whole-value variable preserves object type; embedded variables stringify objects.

- [ ] **Step 3: Preserve optional UI metadata**

Add optional \`inputSchema\` and \`uiSchema\` to frontend \`WorkflowDefinitionV1\`. Ensure mapper round-trip retains both fields and legacy workflows without them remain valid. Backend continues ignoring unknown root metadata.

- [ ] **Step 4: Verify and commit**

Run:

\`\`\`powershell
mvn -pl kb-agent -am -Dtest=VariableResolverTest test
Set-Location ..\frontend
npm run test -- --run src/features/agent-workflow/schema-flow-mapper.test.ts
Set-Location ..
\`\`\`

Expected: all tests PASS.

Commit backend and frontend subrepositories separately, then update root gitlinks:

\`\`\`text
feat(agent): 支持安全变量字段路径
feat(frontend): 保留画布扩展元数据
chore(agent): 更新工作流契约子仓指针
\`\`\`

## Task 2: 增加第一批安全只读 Tool 节点

**Files:**
- Modify: \`backend/kb-agent/src/main/java/com/knowledge/base/agent/tool/GatewayToolHttpClient.java\`
- Create: \`backend/kb-agent/src/main/java/com/knowledge/base/agent/tool/ListDocumentsTool.java\`
- Create: \`backend/kb-agent/src/main/java/com/knowledge/base/agent/tool/ListCategoriesTool.java\`
- Create: \`backend/kb-agent/src/main/java/com/knowledge/base/agent/tool/ListTagsTool.java\`
- Create: \`backend/kb-agent/src/main/java/com/knowledge/base/agent/tool/TextTemplateTool.java\`
- Modify: \`backend/kb-agent/src/main/java/com/knowledge/base/agent/engine/WorkflowNode.java\`
- Test: \`backend/kb-agent/src/test/java/com/knowledge/base/agent/tool/*ToolTest.java\`

- [ ] **Step 1: Write failing tool contract tests**

Mock \`GatewayToolHttpClient\` and assert only these routes are used:

\`\`\`text
GET /api/document/documents/page
GET /api/document/categories/tree
GET /api/document/api/tags/hot
GET /api/document/api/tags/category/{categoryId}
\`\`\`

Assert \`list_documents\` returns \`documents/total/count/untrustedCorpus\`, categories return tree and flat list, tags return normalized fields, and text template rejects non-whitelisted expressions.

- [ ] **Step 2: Add safe query construction**

Add a Gateway client method accepting an approved \`/api/**\` path plus ordered query parameters. URL-encode values and reject complete URLs or non-Gateway paths.

- [ ] **Step 3: Implement tools**

Implement:

\`\`\`text
list_documents: size 1..20, fixed current=1, optional keyword/category/team/status/sort
list_categories: no input, normalized tree and flat categories
list_tags: optional positive categoryId, limit 1..50
text_template: template <= 10000, only variables.<identifier> replacement
\`\`\`

Restrict returned fields and wrap document titles/summaries as untrusted corpus.

- [ ] **Step 4: Extend workflow whitelist**

Allow \`hybrid_search\`, \`get_document\`, \`list_documents\`, \`list_categories\`, \`list_tags\`, and \`text_template\`. Continue rejecting unknown tools.

- [ ] **Step 5: Verify and commit**

Run:

\`\`\`powershell
mvn -pl kb-agent -am -Dtest='*ToolTest,AgentToolRegistryTest' test
\`\`\`

Expected: PASS.

Commit:

\`\`\`text
feat(agent): 增加安全只读工作流节点
\`\`\`

## Task 3: 增加草稿试运行与 Run 来源审计

**Files:**
- Modify: \`backend/sql/schema/kb_agent.sql\`
- Modify: \`backend/kb-agent/src/main/java/com/knowledge/base/agent/run/entity/AgentRunEntity.java\`
- Modify: \`backend/kb-agent/src/main/java/com/knowledge/base/agent/run/service/AgentRunService.java\`
- Modify: \`backend/kb-agent/src/main/java/com/knowledge/base/agent/controller/AgentWorkflowController.java\`
- Modify: \`backend/kb-agent/src/main/java/com/knowledge/base/agent/workflow/service/AgentWorkflowService.java\`
- Test: \`backend/kb-agent/src/test/java/com/knowledge/base/agent/run/service/AgentRunServiceTest.java\`
- Create: \`backend/kb-agent/src/test/java/com/knowledge/base/agent/workflow/AgentDraftRunTest.java\`

- [ ] **Step 1: Write failing authorization and snapshot tests**

Cover owner success, non-owner forbidden, invalid definition rejected before insert, published version unchanged, \`runSource=DRAFT\`, and ordinary run-only user forbidden.

- [ ] **Step 2: Add persistence field**

Add:

\`\`\`sql
run_source VARCHAR(16) NOT NULL DEFAULT 'PUBLISHED'
\`\`\`

For draft runs allow \`workflow_version_id\` to be null and keep published runs unchanged.

- [ ] **Step 3: Implement draft-run endpoint**

Add:

\`\`\`text
POST /api/agent/workflows/{workflowId}/draft-runs
\`\`\`

Request contains \`definitionJson\`, \`input\`, and optional \`idempotencyKey\`. Require workflow edit permission and ownership/admin access. Validate and execute the supplied immutable definition snapshot without creating a published version.

- [ ] **Step 4: Expose runSource and preserve audit**

Add \`runSource\` to Run view. Continue storing Run/Step, user ID, duration, snapshots and errors. Keep user-scoped idempotency and cancellation behavior.

- [ ] **Step 5: Verify and commit**

Run:

\`\`\`powershell
mvn -pl kb-agent -am -Dtest='AgentDraftRunTest,AgentRunServiceTest,LinearWorkflowEngineTest' test
\`\`\`

Expected: PASS.

Commit:

\`\`\`text
feat(agent): 支持草稿工作流试运行
\`\`\`

## Task 4: 建立前端节点目录、线性校验和历史栈

**Files:**
- Modify: \`frontend/src/features/agent-workflow/types.ts\`
- Modify: \`frontend/src/features/agent-workflow/node-catalog.ts\`
- Create: \`frontend/src/features/agent-workflow/workflow-validation.ts\`
- Create: \`frontend/src/features/agent-workflow/workflow-history.ts\`
- Modify: \`frontend/src/features/agent-workflow/schema-flow-mapper.ts\`
- Modify: \`frontend/src/features/agent-workflow/WorkflowNode.tsx\`
- Test: \`frontend/src/features/agent-workflow/*test.ts\`

- [ ] **Step 1: Define catalog metadata**

Catalog entries: \`start\`, \`end\`, \`hybrid_search\`, \`get_document\`, \`list_documents\`, \`list_categories\`, \`list_tags\`, \`text_template\`, \`llm\`. Each defines group, description, color, default input, form fields, output field tree and virtual flag.

- [ ] **Step 2: Write and implement pure flow validation**

\`validateFlow(nodes, edges)\` returns \`valid/errors/warnings\`. Reject duplicate ID, self-loop, missing endpoint, duplicate edge, multiple predecessor/successor, disconnected node, and invalid start/end placement.

- [ ] **Step 3: Write and implement bounded history**

History stores at most 50 schema snapshots and supports \`push/undo/redo/canUndo/canRedo\`. Do not record viewport, selection or run state. Pushing after undo truncates the redo branch.

- [ ] **Step 4: Map virtual nodes**

Store start/end under \`uiSchema\` and \`inputSchema\`; exclude them from executable \`nodes/edges\`. Legacy definitions remain round-trip compatible.

- [ ] **Step 5: Verify and commit**

Run:

\`\`\`powershell
npm run test -- --run src/features/agent-workflow
\`\`\`

Expected: PASS.

Commit:

\`\`\`text
feat(frontend): 建立画布节点目录与线性校验
\`\`\`

## Task 5: 重构 Dify 式工作台与编排交互

**Files:**
- Create: \`frontend/src/features/agent-workflow/AgentWorkbench.tsx\`
- Create: \`frontend/src/features/agent-workflow/WorkflowToolbar.tsx\`
- Create: \`frontend/src/features/agent-workflow/NodePalette.tsx\`
- Create: \`frontend/src/features/agent-workflow/NodeInspector.tsx\`
- Create: \`frontend/src/features/agent-workflow/VariablePicker.tsx\`
- Modify: \`frontend/src/features/agent-workflow/WorkflowCanvasEditor.tsx\`
- Modify: \`frontend/src/features/agent-workflow/WorkflowNode.tsx\`
- Modify: \`frontend/src/features/agent-workflow/WorkflowCanvasEditor.css\`
- Modify: \`frontend/src/pages/admin/AgentAdminPage.tsx\`
- Test: \`frontend/src/features/agent-workflow/AgentWorkbench.test.tsx\`

- [ ] **Step 1: Build the workbench shell**

Top workflow bar; left searchable grouped palette; center canvas; right inspector; bottom debug slot. Preserve existing value/onChange/name compatibility until integration is complete.

- [ ] **Step 2: Implement drag/drop and accessible click add**

Use React Flow \`screenToFlowPosition\`. Drop creates catalog defaults at pointer location and pushes history. Click adds at chain end.

- [ ] **Step 3: Implement start/end and empty state**

New workflow defaults to start → hybrid search → LLM → end. Empty canvas shows three templates and clear drag instructions.

- [ ] **Step 4: Implement guarded connections and chain insertion**

Use \`isValidConnection\` and pure validator before mutation. Edge insert replaces A→B with A→N and N→B. Display exact rejection reasons.

- [ ] **Step 5: Implement deterministic layout and node actions**

Horizontal 260px spacing; fit view after layout. Add duplicate, delete, delete-and-reconnect, keyboard delete, undo and redo.

- [ ] **Step 6: Implement immediate inspector and variable picker**

Render fields from catalog metadata. Changes immediately update node state. Variable picker lists only upstream output paths and inserts safe syntax.

- [ ] **Step 7: Verify and commit**

Run:

\`\`\`powershell
npm run test -- --run src/features/agent-workflow/AgentWorkbench.test.tsx src/features/agent-workflow/workflow-validation.test.ts
npx eslint src/features/agent-workflow src/pages/admin/AgentAdminPage.tsx --max-warnings 0
\`\`\`

Expected: PASS and zero lint warnings/errors.

Commit:

\`\`\`text
feat(frontend): 重构Agent画布工作台
\`\`\`

## Task 6: 接入自动保存、草稿试运行和调试抽屉

**Files:**
- Create: \`frontend/src/features/agent-workflow/DebugDrawer.tsx\`
- Modify: \`frontend/src/features/agent-workflow/AgentWorkbench.tsx\`
- Modify: \`frontend/src/services/agent.service.ts\`
- Modify: \`frontend/src/pages/admin/AgentAdminPage.tsx\`
- Test: \`frontend/src/features/agent-workflow/DebugDrawer.test.tsx\`
- Test: \`frontend/src/pages/admin/AgentAdminPage.test.tsx\`

- [ ] **Step 1: Add draft-run service contract**

Add \`runDraft(workflowId, definitionJson, input, idempotencyKey?)\` returning \`AgentRunView\` with \`runSource\`.

- [ ] **Step 2: Implement revision-safe autosave**

Debounce by 600ms. Associate each request with a local revision. An old response cannot overwrite newer local state. Toolbar states: unsaved, saving, saved, failed with retry.

- [ ] **Step 3: Generate draft input dialog**

Generate form fields from \`inputSchema\`; validate required fields; default query to a test prompt. Draft run never publishes first.

- [ ] **Step 4: Implement DebugDrawer and canvas status mapping**

Show Run summary, ordered steps, status, duration, input/output snapshots, error and cancel hint. Selecting a step selects its canvas node. Poll only while non-terminal and stop on unmount.

- [ ] **Step 5: Verify and commit**

Run:

\`\`\`powershell
npm run test -- --run src/features/agent-workflow/DebugDrawer.test.tsx src/pages/admin/AgentAdminPage.test.tsx
npx eslint src/features/agent-workflow src/pages/admin/AgentAdminPage.tsx src/services/agent.service.ts --max-warnings 0
\`\`\`

Expected: PASS and zero lint warnings/errors.

Commit:

\`\`\`text
feat(frontend): 增加Agent草稿调试闭环
\`\`\`

## Task 7: 增加模板、帮助和完整页面闭环

**Files:**
- Modify: \`frontend/src/features/agent-workflow/node-catalog.ts\`
- Create: \`frontend/src/features/agent-workflow/workflow-templates.ts\`
- Modify: \`frontend/src/pages/admin/AgentAdminPage.tsx\`
- Test: \`frontend/src/features/agent-workflow/workflow-templates.test.ts\`
- Test: \`frontend/src/pages/admin/AgentAdminPage.test.tsx\`
- Modify: \`docs/plans/2026-07-17-agent画布体验优化进度.md\`

- [ ] **Step 1: Add exact template factories**

Templates:

\`\`\`text
知识库问答: start(query) → hybrid_search → llm → end
指定文档总结: start(documentId) → get_document → llm → end
主题资料汇总: start(keyword) → list_documents → text_template → llm → end
\`\`\`

- [ ] **Step 2: Add help affordances**

Add first-use guidance, node descriptions, field explanations, output schemas, variable examples, and a compact save → validate → draft-run → publish checklist. Keep raw JSON collapsed.

- [ ] **Step 3: Verify single source of truth**

Workflow load, create, autosave, explicit save, validate, draft run and publish all use the same current draft. Preserve disabled/forbidden permission gates.

- [ ] **Step 4: Verify and commit**

Run:

\`\`\`powershell
npm run test -- --run src/features/agent-workflow src/pages/admin/AgentAdminPage.test.tsx
npx eslint src/features/agent-workflow src/pages/admin/AgentAdminPage.tsx src/services/agent.service.ts --max-warnings 0
npm run build
\`\`\`

Expected: PASS.

Commit:

\`\`\`text
feat(agent): 增加工作流模板与使用引导
\`\`\`

## Task 8: 集成验收、文档收口和最终提交

**Files:**
- Modify: \`deploy/scripts/verify-phase7-gates.ps1\` only if draft-run checks are absent
- Modify: \`docs/plans/2026-07-17-agent画布体验优化进度.md\`
- Modify: \`docs/第7阶段-地基治理与Agent演进计划.md\`

- [ ] **Step 1: Run backend verification**

\`\`\`powershell
$env:JAVA_HOME='D:\Users\environments\Java21'
$env:Path="$env:JAVA_HOME\bin;$env:Path"
Set-Location backend
mvn test
Set-Location ..
\`\`\`

Expected: all reactor modules \`BUILD SUCCESS\`.

- [ ] **Step 2: Run frontend verification**

\`\`\`powershell
Set-Location frontend
npm run test
npm run build
npx eslint src/features/agent-workflow src/pages/admin/AgentAdminPage.tsx src/services/agent.service.ts --max-warnings 0
Set-Location ..
\`\`\`

Expected: tests PASS, build exit 0, scoped lint exit 0.

- [ ] **Step 3: Run real service gates**

\`\`\`powershell
.\deploy\scripts\verify-phase7-gates.ps1
.\deploy\scripts\verify-all.ps1
\`\`\`

Expected: \`GATES PASS\` and \`ALL PASS\`. Ensure an administrator draft-run succeeds and an ordinary user draft-run returns 403.

- [ ] **Step 4: Verify repository scope**

\`\`\`powershell
git diff --check
git status --short
git -C backend diff --name-only
git -C frontend diff --name-only
\`\`\`

Do not stage \`readme_plan.md\`, generated build output, or line-ending-only state.

- [ ] **Step 5: Update progress and phase documentation**

Mark only evidence-backed items complete, record commit hashes and exact verification commands, and retain graph/statistics nodes as deferred until ACL filtering is implemented.

- [ ] **Step 6: Commit documentation**

\`\`\`text
docs(agent): 完成画布整改验收记录
\`\`\`

Final report includes all commits, tests, gates, known warnings, preserved user changes, and confirms no push.

## Execution Rules

1. Execute tasks in order; each task must pass its focused verification and be committed before the next starts.
2. Commit inside \`backend\` and \`frontend\` first, then commit updated gitlinks in the root repository.
3. Use Java 21 from \`D:\Users\environments\Java21\`.
4. Preserve services and Docker containers; do not stop unrelated processes.
5. Do not stage or rewrite the user's \`readme_plan.md\`.
6. If graph/statistics ACL work, dependency changes, CI changes, or unrelated schema expansion becomes necessary, stop that expansion and keep it deferred.
