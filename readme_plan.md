# 开发计划与变更记录
JDK21 D:\Users\environments\Java21

> **环境约束（已确认）**：**无历史数据**，全新部署；`stat_*` 投影表随新业务经 MQ 增量写入，**不需要**也**不做**历史数据迁移脚本。  
> **遗留治理**：任务 1–28 及 **遗留治理 29–44 已全部完成**（2026-07-11）。详见 [遗留治理计划.md](遗留治理计划.md)、[backend/docs/优化路线图.md](backend/docs/优化路线图.md)。

**阶段状态**：遗留治理 **29–55 全部完成**；联调冒烟保留 `verify-all.ps1`（已移除 E2E/浏览器验收）。  
**下一阶段**：第 7 阶段 A0/A1/B 已收口；**Phase C：72 React Flow 已完成，下一步 73 向量库选型合闸**（联调补齐：Golden WriteBaseline、ACL 复测）。`enableAgent` 默认仍关闭。

### Backlog：Search ACL 修复（任务 58）

| 项 | 内容 |
|----|------|
| 状态 | **CLOSED（代码+脚本）**；本地需服务联调连续两次 `verify-auth-ai.ps1` 记 Search ACL=PASS |
| 受影响接口 | `GET/POST /api/search/**`；`GET /api/document/documents/{id}` |
| 关闭标准 | tester 搜不到/读不到 editor 私有文档；editor 可见；鉴权门 401/200 |
| 临时策略 | ACL 未在目标环境复测 PASS 前，普通用户 Agent view/run 仍不发放 |
| 修复方案 | 文档读取 `DocumentAccessGuard`；检索 ES filter + 结果后置过滤；`teamId`/`is_public` 入索引；脚本双用户造数断言 |

---

## 2026-07-16（任务 72：React Flow 可视化编排）

### 【本次功能】

1. 引入 `@xyflow/react`；`schema-flow-mapper` 实现 Schema v1 ↔ 画布双向转换
2. 管理页三栏：节点库 / 画布 / 属性；导出同构 JSON；保留高级 JSON 折叠
3. 保存/校验/试跑/发布仍走原 `agentService`；vitest 覆盖往返同构

### 【参考文件】

- frontend/src/features/agent-workflow/**
- frontend/src/pages/admin/AgentAdminPage.tsx
- frontend/package.json（@xyflow/react）

### 【差距总结】

- 后端仍无 GET 草稿接口，列表点选不会拉取已存 JSON（沿用新建默认草稿）
- 节点 id 画布内不可改（防破坏边）；自定义节点样式未做
- 试跑仍依赖已发布版本（与契约一致）

---

## 2026-07-16（任务 62：Statistics 仓储化）

### 【本次功能】

1. 按投影表新增 `Stat*Repository`（document/user/comment/category/role/team）封装 upsert/count/查询
2. `CoreStatisticsProjectionListener` 仅分发事件；`StatisticsServiceImpl` 去掉 JdbcTemplate 直写
3. 单测：Listener mock Repository；`StatDocumentRepositoryTest` 校验 SQL

### 【参考文件】

- backend/kb-statistics/.../repository/Stat*.java
- backend/kb-statistics/.../mq/CoreStatisticsProjectionListener.java
- backend/kb-statistics/.../service/impl/StatisticsServiceImpl.java
- backend/kb-statistics/src/test/.../CoreStatisticsProjectionListenerTest.java、StatDocumentRepositoryTest.java

### 【差距总结】

- Ai/OperationLog/浏览点赞 Listener 与 Aggregation/Cache Task 仍含 JdbcTemplate（第二步可选，未改行为）
- Service 行数下降有限（业务编排仍在）；SQL 已从 Listener/Service 投影路径收口到 Repository

---

## 2026-07-16（任务 61：Retriever 分层）

### 【本次功能】

1. 抽出 `KeywordRetriever` / `DenseRetriever` / `HybridRetriever`（`RrfHybridRetriever` + 既有 `HybridSearchFusion`）
2. ES/Milvus 分别实现 Keyword/Dense；`VectorIndexService` 签名保留，检索委托 Retriever，CRUD 留门面
3. 单测：`HybridSearchFusionTest`、`RrfHybridRetrieverTest`

### 【参考文件】

- backend/kb-intelligence/kb-intelligence-llm/.../rag/retriever/**
- backend/kb-intelligence/kb-intelligence-llm/.../service/impl/ElasticsearchVectorIndexServiceImpl.java
- backend/kb-intelligence/kb-intelligence-llm/.../service/impl/MilvusVectorIndexServiceImpl.java
- backend/kb-intelligence/kb-intelligence-llm/src/test/.../HybridSearchFusionTest.java、RrfHybridRetrieverTest.java

### 【差距总结】

- SearchServiceImpl 仍负责 ACL/分页/回退（刻意保留）；RAG 直连仍无 ACL
- Milvus keyword 仍为 like 降级；未跑联调 Golden 数值对比（题集基线仍 `_pending_`）
- `VectorIndexService` 未进一步拆成纯 CRUD 接口（签名保留策略）

---

## 2026-07-16（任务 60：RAG Golden v0）

### 【本次功能】

1. 题集 `rag-golden-set.json`：15 条（精确/NL/干扰/无答案/ACL 占位），期望 ID 对齐 `init_kb_document.sql`
2. 基线文档 `rag-golden-baseline.md`：配置快照 + Hit@5/MRR/citation 定义；联调结果表待 `-WriteBaseline`
3. `verify-rag-golden.ps1`：`-OfflineOnly` 校验 JSON；联调跑 Search 并可选回写 baseline

### 【参考文件】

- docs/eval/rag-golden-set.json、rag-golden-baseline.md
- deploy/scripts/verify-rag-golden.ps1

### 【差距总结】

- 离线校验 PASS；keyword/hybrid 数值基线需服务就绪后 `-WriteBaseline` 回填（当前表为 `_pending_`）
- ACL 不可见题为占位（依赖私有文档联调造数），不阻塞任务 61 开工

---

## 2026-07-16（任务 63：前端路由与鉴权残留）

### 【本次功能】

1. 删除重复 `documents/:id/edit` 路由
2. `decideProtectedAccess` 统一未登录 → `/login`；AI 助手/写作受 `enableAI` / `enableAIWriting` 关闭态门禁
3. vitest：`route-guards.test.ts`（登录跳转、AI 关闭态、路由无重复）

### 【参考文件】

- frontend/src/router/index.tsx
- frontend/src/utils/route-guards.ts、route-guards.test.ts
- frontend/src/components/common/FeatureDisabledPanel.tsx

### 【差距总结】

- AI 页本身仍在 MainLayout 的 ProtectedRoute 下，未登录不会渲染页面内容；与网关 401 互补

---

## 2026-07-16（任务 59：BC 叙事与配置准源）

### 【本次功能】

1. 文档收口：运行时 4 BC、包名历史遗留、Nacos 为准源
2. 统一 `ai.default-model=qwen`（Nacos / 模块 yml / ModelProvider 兜底）
3. Intelligence 模块 README + Listener/MQ 注释改为 BC 用语；`verify-llm-config` 增加 default-model 断言

### 【参考文件】

- backend/README.md、backend/kb-intelligence/README.md、backend/nacos/README.md
- docs/after/intelligence-merge-plan.md
- backend/nacos/kb-intelligence-dev.yaml.template、ModelProvider.java
- deploy/scripts/verify-llm-config.ps1

### 【差距总结】

- 未做大挪包（按计划）；导入 Nacos 后需 `import-nacos.ps1` 才会覆盖线上仍为 deepseek 的旧配置

---

## 2026-07-16（任务 56-Ops：密钥轮换 / 路径矩阵 / 暴露检查）

### 【本次功能】

1. Core 支持 `previous-secret` 轮换窗口；HMAC 单测覆盖旧密钥并行校验
2. 文档：内部路径矩阵、密钥轮换手册；`p3-3-operations` 补齐 56-Ops 入口
3. `check-service-exposure.ps1`：生产可断言仅 Gateway 对公网可达

### 【参考文件】

- backend/kb-common/.../InternalServiceHmacUtil.java
- backend/kb-core/.../CoreInternalServiceProperties.java、InternalServiceAuthFilter.java
- docs/after/internal-hmac-path-matrix.md、hmac-key-rotation.md、p3-3-operations.md
- deploy/scripts/check-service-exposure.ps1、deploy/env.example

### 【差距总结】

- 生产环境需用真实公网 VIP 跑 `-ExpectGatewayOnly` 并归档输出；本地 127.0.0.1 全开属预期
- `enableAgent` 仍默认关闭，待 Search ACL 在目标环境连续 PASS

---

## 2026-07-16（Search ACL：检索/文档可见性）

### 【本次功能】

1. 统一可见性规则：公开 / 作者 / 团队成员；内部 HMAC 旁路索引重建
2. Search：文档级 ES ACL filter + chunk/hybrid 后置过滤；索引写入 `teamId`/`is_public`
3. `verify-auth-ai.ps1`：tester vs editor 私有文档隔离断言（Search + 文档读取）

### 【参考文件】

- backend/kb-common/.../DocumentVisibility.java、UserContextUtil.java
- backend/kb-core/.../DocumentAccessGuard.java、DocumentServiceImpl.java、DocumentSearchIndexPayloadBuilder.java
- backend/kb-core/.../DocumentUserLocalClient.java、InternalUserTeamController.java、InternalServiceAuthFilter.java
- backend/kb-intelligence/.../SearchServiceImpl.java、SearchController.java、SearchAclQuerySupport.java
- backend/kb-common/src/main/resources/elasticsearch/kb_chunk_index.json
- deploy/scripts/verify-auth-ai.ps1、backend/nacos/kb-core-dev.yaml.template

### 【差距总结】

- 单测 `DocumentVisibilityTest` 已通过；完整 Search ACL=PASS 依赖网关/Core/Intelligence/ES 已启动且种子用户 tester/editor 可用
- 存量索引需重建后 chunk 侧 `is_public` 才完整（后置过滤已覆盖文档级元数据）

---

## 2026-07-16（任务 71：Agent 冒烟接入 verify-all）

### 【本次功能】

1. 新增 `verify-agent-smoke.ps1`（管理员链路 + 401/403/400 + ACL FAIL 管理员限定模式）
2. `verify-auth-ai.ps1` 导出 `SEARCH_ACL_STATUS`；`verify-all.ps1` 串入 Agent 冒烟、Agent 定向单测与前端 vitest

### 【参考文件】

- deploy/scripts/verify-agent-smoke.ps1、verify-all.ps1、verify-auth-ai.ps1
- docs/第7阶段-地基治理与Agent演进计划.md

### 【差距总结】

- 真实联调依赖服务已启动、权限 SQL 已导入、`AI_DEV_STUB` 可选
- Search ACL PASS 分支的双用户文档隔离断言仍待 ACL 修复后补强

---

## 2026-07-16（任务 70：Agent 权限矩阵与审计）

### 【本次功能】

1. `init_agent_permission.sql`：四项权限码；仅授予 SUPER_ADMIN/ADMIN（ACL FAIL 策略）
2. Agent JWT 过滤器跨库加载 `kb_user` 角色/权限；Controller `@PreAuthorize`
3. Run 保留期定时清理 + `cleanup-agent-runs.ps1`；`agent.run-retention-days=30`

### 【参考文件】

- backend/sql/data/init_agent_permission.sql
- backend/kb-agent/.../AgentPermissionConstants.java、AgentJwtAuthenticationFilter.java
- backend/kb-agent/.../AgentWorkflowController.java、AgentRunController.java
- backend/kb-agent/.../AgentRunRetentionCleaner.java、AgentApplication.java
- deploy/scripts/cleanup-agent-runs.ps1、import-dev-data.ps1

### 【差距总结】

- 普通用户 view/run 待 Search ACL PASS 后另补授权脚本
- 端到端冒烟留给任务 71

---

## 2026-07-16（任务 69：Agent 用户页与管理页）

### 【本次功能】

1. `/agent` 运行页、`/admin/agents` JSON 编排页；门禁受 `enableAgent` + 权限码控制
2. `agent.service`、导航/路由接入；系统设置增加 Agent 开关（默认关）
3. vitest：`agent-access` 关闭态/普通用户/管理员门禁单测；type-check + build 通过

### 【参考文件】

- frontend/src/pages/AgentPage.tsx、pages/admin/AgentAdminPage.tsx
- frontend/src/services/agent.service.ts、utils/agent-access.ts、utils/agent-access.test.ts
- frontend/src/router/index.tsx、components/layout/MainLayout.tsx、constants/admin-nav.ts
- frontend/src/stores/app.store.ts、pages/admin/SettingsPage.tsx
- backend/.../SettingsServiceImpl.java（enableAgent 默认 false）

### 【差距总结】

- 权限码 SQL/方法级授权留给任务 70；端到端冒烟留给 71
- `enableAgent` 仍默认关闭

---

## 2026-07-16（任务 68：会话与 Run API）

### 【本次功能】

1. 管理 API：`/workflows` 草稿 CRUD、校验、发布、版本列表
2. 运行 API：`/sessions`、`/runs`（同步执行）、查询 Step、协作取消；幂等键短路
3. Run 仅绑定 `workflowVersionId` 不可变定义；单测覆盖幂等与版本绑定

### 【参考文件】

- backend/kb-agent/.../controller/AgentWorkflowController.java、AgentRunController.java
- backend/kb-agent/.../workflow/service/AgentWorkflowService.java
- backend/kb-agent/.../run/service/AgentRunService.java
- backend/kb-agent/src/test/.../AgentRunServiceTest.java
- docs/第7阶段-地基治理与Agent演进计划.md

### 【差距总结】

- 端到端冒烟脚本留给任务 71；权限码矩阵留给任务 70（MVP 按登录+所有者约束）
- `enableAgent` 仍关闭

---

## 2026-07-16（任务 67：线性工作流引擎）

### 【本次功能】

1. `LinearGraphValidator` + `VariableResolver`：拒绝环/并行/孤立；仅 `${input.x}` / `${steps.id.output}`
2. `LinearWorkflowEngine`：线性执行 tool/llm，短路失败，协作取消，Run 状态机，落库 `agent_run_step`
3. 单测：成功、工具失败短路、校验拒绝、缺变量、取消、终态不重跑

### 【参考文件】

- backend/kb-agent/.../engine/LinearWorkflowEngine.java、LinearGraphValidator.java、VariableResolver.java
- backend/kb-agent/.../engine/WorkflowDefinition.java、RunStatus.java、AgentRunPersistence.java
- backend/kb-agent/src/test/.../LinearWorkflowEngineTest.java、VariableResolverTest.java
- docs/第7阶段-地基治理与Agent演进计划.md

### 【差距总结】

- HTTP 管理/运行 API 留给任务 68；幂等键创建入口在 68 暴露，引擎侧已终态短路
- LLM 节点级 60s 超时依赖模型客户端侧（配置已有）；Run 90s 在引擎循环检查

---

## 2026-07-16（任务 66：双工具 Registry）

### 【本次功能】

1. `AgentToolRegistry` + `hybrid_search` / `get_document`：参数校验、不可信数据包装、结构化 `ToolException`
2. `GatewayToolHttpClient`：仅 `agent.gateway-base-url` 出站，透传用户 Bearer，默认超时 5s；审计不含 Token/正文
3. 单测 `AgentToolRegistryTest`（mock 出站）：注册表、鉴权缺失、非法参数、截断、HTTP 错误

### 【参考文件】

- backend/kb-agent/.../tool/AgentTool.java、AgentToolRegistry.java、GatewayToolHttpClient.java
- backend/kb-agent/.../tool/HybridSearchTool.java、GetDocumentTool.java、UntrustedDataWrapper.java、ToolException.java
- backend/kb-agent/src/test/.../AgentToolRegistryTest.java
- docs/第7阶段-地基治理与Agent演进计划.md

### 【差距总结】

- `agent_run_step` 落库写入留给任务 67；真实双用户 Search ACL 仍 OPEN，不开放 `enableAgent`
- 未接工作流引擎调用（67）与 Run API（68）

---

## 2026-07-16（任务 65：kb-agent 服务骨架）

### 【本次功能】

1. 新增独立模块 `backend/kb-agent`（端口 8092）：JWT 鉴权、健康探活、`AgentModelClient`（千问/DeepSeek/Stub）
2. 五表 DDL `sql/schema/kb_agent.sql`；网关 `/api/agent/**`；Nacos/启动停服脚本接入
3. 定向单测：`OpenAiCompatibleAgentModelClientTest`；并回归 56/57 定向单测全绿

### 【参考文件】

- backend/kb-agent/**、backend/pom.xml、backend/sql/schema/kb_agent.sql
- backend/nacos/kb-agent-dev.yaml.template、kb-gateway-dev.yaml.template
- deploy/start-services.ps1、stop-services.ps1、scripts/import-nacos.ps1

### 【差距总结】

- 未实现工作流 CRUD/Run/工具（66–68）；`enableAgent` 仍保持关闭
- 本地需执行 `install_all` 建 `kb_agent` 库并导入 Nacos 后才能联调启动

---

## 2026-07-15（任务 64：Agent v1 契约冻结）

### 【本次功能】

1. 扩展 AI 入口边界为搜索/助手/写作/Agent/Agent 管理，同步 `frontend/src/constants/ai-entry.ts`（路由、开关、权限码、文案）
2. 冻结 `docs/agent/agent-contract-v1.md`、`workflow-schema-v1.json`、`agent-security-boundary.md`（图/变量/状态机/表/工具/HTTP/模型）

### 【参考文件】

- docs/ai-entry-boundaries.md
- docs/agent/agent-contract-v1.md、workflow-schema-v1.json、agent-security-boundary.md
- frontend/src/constants/ai-entry.ts
- docs/README.md、docs/第7阶段-地基治理与Agent演进计划.md

### 【差距总结】

- 本次仅契约与常量，**未写 kb-agent 业务代码**（任务 65 起）
- 前端路由/页面仍未落地（任务 69）；`enableAgent` 默认关闭约定已写入文档

---

## 2026-07-15（任务 57/58：索引模式 + 鉴权冒烟脚本）

### 【本次功能】

1. **任务 57**：`document.indexing.mode=event|legacy-feign|disabled` 单选；legacy Feign 包 + 启动 WARN；MQ Confirm/Return + 有限重试；`rebuild-es-indices.ps1 -DocumentId` 补偿
2. **任务 58**：新增 `deploy/scripts/verify-auth-ai.ps1`；串入 `verify-all.ps1`；定向单测步骤；Search ACL backlog 已单列

### 【参考文件】

- backend/kb-core/kb-core-document/.../DocumentIndexingProperties.java、DocumentIndexingTriggerServiceImpl.java、DocumentLifecycleEventPublisher.java、legacy/LegacyDocumentIndexFeignTrigger.java
- deploy/scripts/verify-auth-ai.ps1、verify-all.ps1、rebuild-es-indices.ps1
- docs/after/rh-cha-roadmap.md、docs/第7阶段-地基治理与Agent演进计划.md

### 【差距总结】

- Search ACL 双用户私有文档隔离尚未造数证明（auth 门禁已测），backlog OPEN
- 需同步 Nacos `document.indexing.mode` 与 RabbitMQ publisher-confirm 配置后重启 kb-core
- 未在本机实际跑 `verify-auth-ai.ps1`（依赖服务在线）

---

## 2026-07-15（任务 56-MVP：网关认证闭环 + 内部 HMAC）

### 【本次功能】

1. **编号切换声明**：第 7 阶段正式任务号 **56–75**（以修订版计划为准）
2. **56-MVP**：网关清理信任头、白名单唯一准源、缺/非法 Token 统一 HTTP 401；Intelligence→Core HMAC-SHA256（时间窗 60s、密钥 ≥32 字节、文档读取路径白名单）
3. 定向单测：`AuthGlobalFilterTest`、`InternalServiceAuthFilterTest`、`InternalServiceHmacUtilTest` 全绿

### 【参考文件】

- backend/kb-gateway/.../AuthGlobalFilter.java、GatewayAuthProperties.java
- backend/kb-common/.../InternalServiceHmacUtil.java
- backend/kb-core/kb-core-app/.../InternalServiceAuthFilter.java、CoreInternalServiceProperties.java
- backend/kb-intelligence/.../InternalFeignConfig.java、KbCoreInternalProperties.java、SearchServiceImpl.java
- backend/nacos/kb-gateway-dev.yaml.template、kb-core-dev.yaml.template、kb-intelligence-dev.yaml.template
- deploy/env.example、docs/after/p3-3-operations.md

### 【差距总结】

- **56-Ops**（密钥轮换手册、完整路径矩阵、生产端口暴露检查）未做，不阻塞 B0，阻塞 `enableAgent`
- 需将 Nacos 中 `kb-gateway-dev` / `kb-core-dev` / `kb-intelligence-dev` 按模板同步后重启服务，并确保 `KB_INTERNAL_HMAC_SECRET` 一致
- 未改前端；任务 57/58 未启动

---

## 2026-07-15（根仓 .gitignore）

### 【本次功能】

1. 根目录新增 `.gitignore`：根仓只跟踪文档与 deploy（排除 `.env`/日志/数据卷）
2. 明确忽略独立子仓 `backend/`、`frontend/` 及嵌套 `docs/feat/`

### 【参考文件】

- .gitignore

### 【差距总结】

- 未执行 `git add` / 首提交；需你本地确认后自行初始化提交

---

## 2026-07-15（制定第 7 阶段计划：地基治理与 Agent 演进）

### 【本次功能】

1. 优化并固化「短板治理 + 自定义 Agent」路线：Phase A 地基（56–63）→ Phase B Agent MVP（64–71）→ Phase C 按需（72–75）
2. 关键决策：Qdrant 与 Agent 解耦；Agent 为第四入口 `/agent`；不接 Dify；不恢复 Playwright；默认全千问
3. 合闸条件：56/57（鉴权、Feign 收口）完成前不宣称 Agent 生产可用

### 【参考文件】

- docs/第7阶段-地基治理与Agent演进计划.md
- docs/README.md
- docs/ai-entry-boundaries.md（Phase B 任务 64 将扩展）
- backend/nacos/kb-gateway-dev.yaml.template（任务 56）
- backend/kb-core/.../DocumentIndexingTriggerServiceImpl.java（任务 57）

### 【差距总结】

- 本次仅制定计划与文档索引，**未改业务代码**
- 任务 56–75 均待执行；实施时按计划逐项回写本文件

---

## 2026-07-11（文档整理与提交：任务 54/55 收尾）

### 【本次功能】

1. **任务 55** 删除全部 E2E（Playwright、verify-e2e-chain、验收文档），`verify-all.ps1` 简化为联调冒烟
2. **任务 54** RustFS 私有桶经网关 `hash-preview` 代理，前端 `resolvePublicFileUrl`
3. 文档整理：新增根 `readme.md`、`docs/README.md`；frontend 历史笔记归档至 `docs/archive/`
4. 提交：backend `0abd091`、frontend `6aa19a1`；重启 kb-file

### 【参考文件】

- readme.md、docs/README.md、frontend/docs/README.md
- backend/kb-file/.../FileController.java、frontend/src/utils/file-url.ts
- deploy/scripts/verify-all.ps1

### 【差距总结】

- 根目录 readme_plan.md、deploy/ 不在 git 仓，需本地保留

---

## 2026-07-11（移除 E2E 验收：任务 55）

### 【本次功能】

1. **任务 55** 删除全部 E2E 相关：Playwright 浏览器走查、`verify-e2e-chain.ps1` API 链式验收、验收文档
2. 移除 `@playwright/test` 依赖与 `frontend/e2e/` 目录
3. `verify-all.ps1` 简化为 integration / api / llm / admin-ui / build
4. 清理 E2E 产生的测试数据（角色/团队/文档/投影/stat_*，共约 40+ 条）

### 【参考文件】

- readme.md、docs/README.md（文档索引）
- deploy/scripts/verify-all.ps1（已更新）
- frontend/package.json、frontend/.gitignore
- deploy/README.md、遗留治理计划.md、docs/after/rh-cha-roadmap.md
- frontend/docs/archive/（历史笔记归档）

### 【差距总结】

- **API E2E** 并非新增接口，而是 PowerShell 脚本调用现有 API 做链式验收；已按需求删除
- ES 中 E2E 文档索引残留需重建索引或等待自然过期，未单独清理

---

## 2026-07-11（联调验收定稿：任务 53）

### 【本次功能】

1. **任务 53** 新增 `verify-all.ps1`：串联 integration/api/llm/e2e/admin-ui/admin-browser/build
2. 更新 `integration-acceptance.md` 与验收记录定稿（任务 50–52 结果、6 PASS 全绿）
3. 自检：verify-all 全量 **ALL PASS**（2026-07-11 18:35）

### 【参考文件】

- deploy/scripts/verify-all.ps1
- frontend/docs/integration-acceptance.md
- frontend/docs/integration-acceptance-record-2026-07-11.md
- docs/integration-acceptance.md（根目录同步）

### 【差距总结】

- 生产环境仍需填写 `QWEN_API_KEY` 并关闭 `AI_DEV_STUB`，真实 LLM 质量需人工抽验
- `deploy/` 不在 git 仓，verify-all.ps1 需本地同步

---

## 2026-07-11（LLM 配置与 RAG 全绿：任务 52）

### 【本次功能】

1. **任务 52** 新增 `ai.dev-stub-enabled`（`AI_DEV_STUB=true`）：无 QWEN Key 时本地 Stub Chat + 确定性 Embedding
2. `EmbeddingServiceImpl` dev stub 生成归一化非零向量，修复 ES cosine 零模长 chunk 写入失败
3. `deploy/.env` / `env.example` 增加 `QWEN_API_KEY`、`AI_DEV_STUB`；`verify-llm-config.ps1` 探活
4. E2E **6 PASS / 0 WARN**（RAG chat citations 全绿）

### 【参考文件】

- backend/kb-intelligence/kb-intelligence-llm/.../ModelProvider.java
- backend/kb-intelligence/kb-intelligence-llm/.../localdev/LocalDevChatLanguageModel.java
- backend/kb-intelligence/kb-intelligence-llm/.../EmbeddingServiceImpl.java
- backend/nacos/kb-intelligence-dev.yaml.template
- deploy/env.example、deploy/scripts/verify-llm-config.ps1
- deploy/start-services.ps1（LLM mode 日志）

### 【差距总结】

- 生产环境需填写真实 `QWEN_API_KEY` 并设置 `AI_DEV_STUB=false`
- `deploy/` 脚本与 `.env` 不在 git 仓，需本地同步

---

## 2026-07-11（Admin 浏览器走查：任务 51）

### 【本次功能】

1. **任务 51** Playwright E2E：`e2e/admin-walkthrough.spec.ts` 覆盖 13 个 Admin 路由 + 侧栏高亮 + 知识侧栏隐藏
2. 新增 `verify-admin-browser.ps1`：网关登录、前端探活、Playwright 走查（4 PASS + 15 specs）
3. 修复 `DictionaryManagePage`：`response.records` 与 `list` 兼容，避免字典页崩溃

### 【参考文件】

- frontend/e2e/admin-walkthrough.spec.ts
- frontend/playwright.config.ts
- frontend/package.json
- frontend/src/pages/admin/DictionaryManagePage.tsx
- deploy/scripts/verify-admin-browser.ps1

### 【差距总结】

- RAG 对话 citations 仍 **WARN**（需 QWEN_API_KEY，任务 52 建议）
- `deploy/` 脚本不在 git 仓，需本地同步 verify-admin-browser.ps1

---

## 2026-07-11（首页技术栈 + 头像 403 修复）

### 【本次功能】

1. 首页「核心技术栈」对齐实际选型：MongoDB 7、DeepSeek（默认对话，可切 Qwen）、React 19 + Vite 8，移除未使用的 PostgreSQL / Claude
2. 修复头像 RustFS 直链 403：kb-file 返回 `/api/file/files/preview/{id}` 代理 URL；新增 `/files/hash-preview/{hash}` 兼容历史数据
3. 前端 `UserAvatar` / `file-url.ts` 自动将 `:20090/kb-files/` 直链改写为网关预览地址

### 【参考文件】

- frontend/src/pages/DashboardPage.tsx
- frontend/src/components/common/UserAvatar.tsx
- frontend/src/utils/file-url.ts
- backend/kb-file/.../FileServiceImpl.java
- backend/kb-file/.../FileController.java
- backend/kb-file/.../FileStorageProperties.java
- backend/nacos/kb-file-dev.yaml.template

### 【差距总结】

- 需重启 kb-file 并重新导入 Nacos `kb-file-dev.yaml` 后新上传文件才返回代理 URL
- 历史头像依赖 `kb_file.file_hash` 可查；若库中无对应记录仍回退默认头像

---


### 【本次功能】

1. **任务 50** ES 索引 IK 分析器回落 standard（`use-ik-analyzer: false`），修复 Docker ES 无 IK 插件时 rebuild 失败
2. RabbitMQ 统一 JSON 序列化（`IntelligenceRabbitMessageConfig`），修复 reindex 消息反序列化失败
3. kb-core 内部服务鉴权（`X-Internal-Service: kb-intelligence`），修复 Intelligence Feign 拉文档 401
4. `SearchServiceImpl` 全量内部头；`verify-e2e-chain.ps1` reindex 验收要求 `completedDocuments > 0`
5. 单测 `ElasticsearchIndexDefinitionLoaderTest`；E2E **5 PASS / 1 WARN**（RAG chat 缺 LLM Key）

### 【参考文件】

- backend/kb-common/.../ElasticsearchIndexDefinitionLoader.java
- backend/kb-common/.../IntelligenceIndexingProperties.java
- backend/kb-core/kb-core-app/.../InternalServiceAuthFilter.java
- backend/kb-core/kb-core-app/.../CoreInternalServiceProperties.java
- backend/kb-intelligence/kb-intelligence-app/.../IntelligenceRabbitMessageConfig.java
- backend/kb-intelligence/kb-intelligence-retrieval/.../SearchServiceImpl.java
- backend/nacos/kb-core-dev.yaml.template、kb-intelligence-dev.yaml.template
- deploy/scripts/verify-e2e-chain.ps1

### 【差距总结】

- RAG 对话仍 **WARN**：未配置 `QWEN_API_KEY` 时 chat 无 citations/fromKnowledgeBase
- `deploy/` 脚本不在 git 仓，需本地同步 verify-e2e 脚本改动
- 浏览器视觉走查（任务 51）仍建议人工打开 `/admin`

---

## 2026-07-11（全链路 E2E：任务 49）

### 【本次功能】

1. **任务 49** 新增 `verify-e2e-chain.ps1`：MQ 投影、文档审核发布、搜索、RustFS 上传 API 验收
2. 新增 `verify-admin-ui.ps1`：AdminLayout / admin-nav / AdminPageHeader 静态检查（7 PASS）
3. 文档发布链路：`publish` → 审核通过 → MQ 双索引可搜（标题关键词）

### 【参考文件】

- deploy/scripts/verify-e2e-chain.ps1
- deploy/scripts/verify-admin-ui.ps1
- docs/integration-acceptance-record-2026-07-11.md
- docs/integration-acceptance.md

### 【差距总结】

- RAG 对话可响应但 **citations/fromKnowledgeBase 为空**（chunk/向量索引未全量回填）
- `POST /api/search/index/rebuild` 在无 IK 插件 ES 上会失败（应用 rebuild-es-indices.ps1 建索引 + MQ 增量）
- 浏览器视觉走查仍建议人工打开 `/admin` 确认侧栏高亮

---

## 2026-07-11（RustFS + API 探活：任务 48）

### 【本次功能】

1. **任务 48** 修复 RustFS healthcheck（403 视为 healthy）与 `verify-integration.ps1` 探活逻辑
2. 统一样例账号密码：种子 BCrypt 由 123456 更正为 **admin123**（迁移 `011` + init SQL）
3. 新增 `deploy/scripts/verify-api.ps1`：登录 + `/api/statistics/admin-overview` 冒烟

### 【参考文件】

- deploy/docker-compose.yml
- deploy/scripts/verify-integration.ps1
- deploy/scripts/verify-api.ps1
- backend/sql/migration/011_fix_seed_password_admin123.sql
- backend/sql/master-sql/init_data.sql、02_init_data.sql、init_kb_user.sql
- docs/integration-acceptance-record-2026-07-11.md

### 【差距总结】

- 浏览器业务链路（MQ 投影、双索引搜索、RustFS 上传、RAG）仍待人工走查
- `deploy/` 脚本不在 git 仓，需本地同步

---

## 2026-07-11（运行态联调：任务 47）

### 【本次功能】

1. **任务 47** 修复 `deploy/start-services.ps1`：PowerShell 解析、`JVM` 引号、`Maven` 参数拆参
2. 本地成功启动 5 微服务（file/core/intelligence/statistics/gateway）
3. `verify-integration.ps1` 网关检查改为 TCP :8080；冒烟 **10 PASS / 1 WARN**

### 【参考文件】

- deploy/start-services.ps1
- deploy/scripts/verify-integration.ps1
- docs/integration-acceptance-record-2026-07-11.md
- deploy/logs/kb-*.out.log

### 【差距总结】

- RustFS healthcheck unhealthy、浏览器业务链路未在本轮走查；网关 `/actuator/health` 返回业务 500 包装体（端口已监听）

---

## 2026-07-11（联调验收：任务 46）

### 【本次功能】

1. **任务 46** 联调验收自动化：`mvn test` + `npm run build` + 新增 `deploy/scripts/verify-integration.ps1`
2. 本地 MySQL 补建 `stat_role` / `stat_team` 投影表（任务 43 DDL）
3. 产出验收记录 `docs/integration-acceptance-record-2026-07-11.md`

### 【参考文件】

- deploy/scripts/verify-integration.ps1
- docs/integration-acceptance.md
- docs/integration-acceptance-record-2026-07-11.md
- backend/sql/schema/statistics-projection-coverage.md
- readme_plan.md
- 遗留治理计划.md

### 【差距总结】

- 网关/RustFS/RAG/上传等需启动微服务后浏览器人工验收；RustFS 容器 healthcheck 仍 unhealthy

---

## 2026-07-11（阶段收口：任务 45）

### 【本次功能】

1. **任务 45** 新增共享 `AdminPageHeader`，统一 7 个管理子页标题区样式
2. 新增 `docs/integration-acceptance.md` 全链路联调验收清单（MQ 投影、双索引、RustFS、RAG、Admin UI）
3. 同步 `优化路线图.md`、`遗留治理计划.md`、`rh-cha-roadmap.md` 阶段完成状态

### 【参考文件】

- frontend/src/components/common/AdminPageHeader.tsx
- frontend/src/components/common/AdminPageHeader.css
- frontend/src/pages/admin/PermissionsPage.tsx
- frontend/src/pages/admin/StatisticsPage.tsx
- frontend/src/pages/admin/SettingsPage.tsx
- frontend/src/pages/admin/TeamsPage.tsx
- frontend/src/pages/admin/CategoriesPage.tsx
- frontend/src/pages/admin/RolesPage.tsx
- frontend/src/pages/admin/ReviewPage.tsx
- docs/integration-acceptance.md
- backend/docs/优化路线图.md
- docs/after/rh-cha-roadmap.md
- 遗留治理计划.md

### 【差距总结】

- 联调验收需运行环境人工执行清单；UsersManagementPage / AdminCenterPage 仍保留独立标题样式

---

## 2026-07-11（可选收尾：任务 44）

### 【本次功能】

1. **任务 44（F4）** 管理后台统一侧栏壳：`AdminLayout` + `admin-nav` 配置
2. 全部 `/admin/*` 子路由嵌套于 `AdminLayout`，按权限过滤侧栏项
3. `MainLayout` 在管理后台路径下隐藏主侧栏，内容区全宽交由 Admin 二级导航

### 【参考文件】

- frontend/src/components/layout/AdminLayout.tsx
- frontend/src/components/layout/AdminLayout.css
- frontend/src/constants/admin-nav.ts
- frontend/src/router/index.tsx
- frontend/src/components/layout/MainLayout.tsx
- frontend/src/styles/layout.css
- 遗留治理计划.md

### 【差距总结】

- 各 Admin 子页内部标题区尚未统一抽取为 `AdminPageHeader`；全链路联调验收仍为可选后续

---

## 2026-07-11（可选收尾：任务 43）

### 【本次功能】

1. **任务 43** 补全 `stat_role` / `stat_team` 统计投影：DDL、MQ 事件、Listener upsert
2. `RoleServiceImpl` / `TeamServiceImpl` 创建/更新/删除后发布投影事件
3. `StatisticsServiceImpl.getAdminOverview()` 从投影表统计 `totalRoles` / `totalTeams`

### 【参考文件】

- backend/sql/schema/kb_statistics.sql
- backend/sql/schema/statistics-projection-coverage.md
- backend/kb-common/.../CoreStatisticsProjectionMQConstants.java
- backend/kb-common/.../CoreStatisticsProjectionEventDTO.java
- backend/kb-common/.../CoreStatisticsProjectionPublisher.java
- backend/kb-statistics/.../CoreStatisticsProjectionListener.java
- backend/kb-statistics/.../StatisticsServiceImpl.java
- backend/kb-core/kb-core-iam/.../RoleServiceImpl.java
- backend/kb-core/kb-core-iam/.../TeamServiceImpl.java
- backend/kb-statistics/.../CoreStatisticsProjectionListenerTest.java

### 【差距总结】

- 存量角色/团队需经一次写操作或手工初始化投影表；F4 Admin 统一侧栏、全链路联调仍为可选后续

---

## 2026-07-11（可选收尾：任务 42）

### 【本次功能】

1. **任务 42（F2）** 知识图谱页空态统一：`KnowledgeGraphPage` 画布空态改用共享 `EmptyState`
2. 保留深色画布视觉（`.kg-empty-state` 适配），区分「无图谱数据」与「筛选无结果」两种文案
3. 无数据时提供「去浏览文档」操作按钮

### 【参考文件】

- frontend/src/pages/KnowledgeGraphPage.tsx
- frontend/src/pages/KnowledgeGraphPage.css
- frontend/src/components/common/EmptyState.tsx
- 遗留治理计划.md

### 【差距总结】

- F4 Admin 统一侧栏、stat_role/stat_team 投影、全链路联调验收仍为可选后续项

---

## 2026-07-11（遗留治理：任务 41）

### 【本次功能】

1. **任务 41** 路线图与计划文档收口：`backend/docs/优化路线图.md` 同步任务 29–41 完成状态，消除「待做」过期项
2. `遗留治理计划.md` 标记阶段 **已完成**，补全第 8/10 周验收勾选与遗留项解决状态
3. 三份文档（优化路线图、遗留治理计划、readme_plan）状态一致

### 【参考文件】

- backend/docs/优化路线图.md
- 遗留治理计划.md
- readme_plan.md

### 【差距总结】

- F2 知识图谱空态、F4 Admin 统一侧栏仍为低优先级可选项，未纳入本阶段

---

## 2026-07-11（遗留治理：任务 40）

### 【本次功能】

1. **任务 40** 新增 `docs/ai-entry-boundaries.md`，明确智能搜索 / AI 助手 / AI 写作三入口职责、API 与跳转规范
2. 新增 `frontend/src/constants/ai-entry.ts` 统一产品文案，三页面 + 导航 + 首页 AI 区块与文档对齐
3. 首页快捷芯片按边界跳转：搜索 → `/search`，写作 → `/ai-writing`，问答 → `/ai`

### 【参考文件】

- docs/ai-entry-boundaries.md
- frontend/src/constants/ai-entry.ts
- frontend/src/pages/SearchPage.tsx
- frontend/src/pages/AIAssistantPage.tsx
- frontend/src/pages/AIWritingPage.tsx
- frontend/src/pages/DashboardPage.tsx
- frontend/src/components/layout/MainLayout.tsx
- 遗留治理计划.md

### 【差距总结】

- 文档为产品说明，未单独做用户手册；编辑页内嵌 AI 写作助手文案未纳入本次统一

---

## 2026-07-11（遗留治理：任务 39）

### 【本次功能】

1. **任务 39** AdminCenter 模块卡片统计值改接 `statisticsService.getAdminOverview()`
2. 移除模块卡片硬编码数字（12、48、8、1.2K、23、156 等）及顶部假趋势百分比
3. 新增 `AdminOverview` 类型；后端 `getAdminOverview` 补全 `totalCategories`（stat_category 计数）

### 【参考文件】

- frontend/src/pages/admin/AdminCenterPage.tsx
- frontend/src/services/statistics.service.ts
- frontend/src/types/index.ts
- backend/kb-statistics/.../StatisticsServiceImpl.java
- 遗留治理计划.md

### 【差距总结】

- `totalRoles` / `totalTeams` 尚无 stat 投影，接口返回 0 时卡片显示 0（非假数据）；后续可补 MQ 投影或 Feign 聚合

---

## 2026-07-11（遗留治理：任务 38）

### 【本次功能】

1. **任务 38** 共享样式抽取：新增 `DocumentCard` / `DocumentsGrid` / `DocumentListCard` 至 `components/common`
2. `DashboardPage` 文档卡片改用共享组件，移除内联 `renderDocCard` 与 `dashboard.css` 重复样式
3. `RecentAccessPage` 列表行改用 `DocumentListCard`，样式自页面 CSS 迁移至组件 CSS
4. 响应式 `.documents-grid` 断点规则随组件 CSS 一并迁移

### 【参考文件】

- frontend/src/components/common/DocumentCard.tsx
- frontend/src/components/common/DocumentCard.css
- frontend/src/components/common/DocumentListCard.tsx
- frontend/src/components/common/DocumentListCard.css
- frontend/src/components/common/index.ts
- frontend/src/pages/DashboardPage.tsx
- frontend/src/pages/RecentAccessPage.tsx
- frontend/src/pages/RecentAccessPage.css
- frontend/src/styles/dashboard.css
- 遗留治理计划.md

### 【差距总结】

- 仅 2 页复用（Dashboard + 最近访问）；DocumentsPage 等仍保留独立卡片样式，后续可按需接入

---

## 2026-07-11（遗留治理：任务 37）

### 【本次功能】

1. **任务 37** Empty/Loading 第三批：6 页接入共享 `PageLoading` / `EmptyState`
2. 管理端：`SettingsPage`、`StatisticsPage`、`PermissionsPage` 全页加载与空态统一
3. 用户端：`AIAssistantPage`、`AIWritingPage`、`NotificationCenterPage` 空态/加载改用共享组件（保留快捷提问/标签等 footer）
4. 扩展 `EmptyState.image={false}`、`PageLoading.tip` 支持自定义空态与加载文案

### 【参考文件】

- frontend/src/components/common/EmptyState.tsx
- frontend/src/components/common/PageLoading.tsx
- frontend/src/pages/admin/SettingsPage.tsx
- frontend/src/pages/admin/StatisticsPage.tsx
- frontend/src/pages/admin/PermissionsPage.tsx
- frontend/src/pages/AIAssistantPage.tsx
- frontend/src/pages/AIWritingPage.tsx
- frontend/src/pages/NotificationCenterPage.tsx
- frontend/src/pages/NotificationCenterPage.css
- 遗留治理计划.md

### 【差距总结】

- 权限页表格行内空文案仍为 Ant Table locale；知识图谱等第二批未改页面不在本任务范围

---

## 2026-07-11（遗留治理：任务 36）

### 【本次功能】

1. **任务 36** Intelligence 线程池隔离：`searchTaskExecutor` / `ragTaskExecutor` / `graphTaskExecutor` 三池独立
2. `IntelligenceApplication` 排除通用 `AsyncTaskConfig`；Nacos 模板增加 `intelligence.executor.*` 配置
3. 搜索/RAG/图谱 MQ 消费者与各 Service 按域注入专用池；`SearchServiceImpl` 修复 ForkJoinPool 默认池问题
4. 交付 `sql/schema/intelligence-executor-isolation.md`；新增 `IntelligenceExecutorConfigTest`

### 【参考文件】

- backend/kb-intelligence/kb-intelligence-app/.../IntelligenceExecutorConfig.java
- backend/kb-common/.../IntelligenceExecutorNames.java
- backend/kb-intelligence/kb-intelligence-retrieval/.../SearchServiceImpl.java
- backend/kb-intelligence/kb-intelligence-llm/.../ReindexConsumer.java、KAGReindexConsumer.java
- backend/nacos/kb-intelligence-dev.yaml.template
- backend/sql/schema/intelligence-executor-isolation.md
- 遗留治理计划.md

### 【差距总结】

- 未做运行时压测验证三池隔离效果；单元/E2E 与配置加载测试已通过

---

## 2026-07-11（遗留治理：任务 35）

### 【本次功能】

1. **任务 35** Intelligence JVM 内存调优：Intelligence 默认堆 **512m/1g**，其余 BC 保持 256m/512m
2. `deploy/start-services.ps1` 分服务注入 `-Dspring-boot.run.jvmArguments`，移除全局 `JAVA_TOOL_OPTIONS`
3. Intelligence 附加 `-XX:+HeapDumpOnOutOfMemoryError`；`.env` 新增 `JVM_INTELLIGENCE_XMS/XMX`
4. 新增压测脚本 `deploy/scripts/stress-intelligence.ps1`（搜索 + RAG）
5. 交付 `backend/sql/schema/intelligence-jvm-tuning.md` 推荐值与验收说明

### 【参考文件】

- deploy/start-services.ps1
- deploy/.env
- deploy/README.md
- deploy/scripts/stress-intelligence.ps1
- backend/sql/schema/intelligence-jvm-tuning.md
- 遗留治理计划.md

### 【差距总结】

- 运行时 HTTP 压测需 Docker + 微服务就绪后执行；单元/E2E 已通过；历史日志无 OOM

---

## 2026-07-11（遗留治理：任务 34）

### 【本次功能】

1. **任务 34** 统计投影补全：对照审计表补齐 Core → statistics 写路径缺口
2. `UserServiceImpl`：更新用户后 `syncUserProjection`；删除用户后 `publishUserDelete`
3. `DocumentServiceImpl.directPublishDocument`、`DocumentReviewServiceImpl`（提交/通过/驳回/直接发布）均同步 `stat_document`
4. `CoreStatisticsProjectionListener.upsertComment` 重复键更新 user_id/document_id；监听器测试扩至 6 用例
5. 交付 `sql/schema/statistics-projection-coverage.md` 覆盖清单

### 【参考文件】

- backend/kb-core/kb-core-iam/src/main/java/com/knowledge/base/userauth/service/impl/UserServiceImpl.java
- backend/kb-core/kb-core-document/src/main/java/com/knowledge/base/document/service/impl/DocumentServiceImpl.java
- backend/kb-core/kb-core-document/src/main/java/com/knowledge/base/document/service/impl/DocumentReviewServiceImpl.java
- backend/kb-statistics/src/main/java/com/knowledge/base/statistics/mq/CoreStatisticsProjectionListener.java
- backend/kb-statistics/src/test/java/com/knowledge/base/statistics/mq/CoreStatisticsProjectionListenerTest.java
- backend/sql/schema/statistics-projection-coverage.md
- 遗留治理计划.md

### 【差距总结】

- 无剩余 stat_* 表缺少 Core 侧写路径；operation_log / ai 投影由独立监听器负责（已在覆盖清单说明）

---

## 2026-07-11（遗留治理：任务 33）

### 【本次功能】

1. **任务 33** 统计宽表去 VIEW：概览/管理后台总浏览量改 `stat_document.sumViewCount()`，今日浏览改 `kb_document_statistics` 预聚合
2. 移除 `StatisticsServiceImpl.queryTopUsersByType("view")` 对 `kb_view_history` 的回退；活跃用户概览改 `stat_operation_log`
3. `UserStatisticsMapper.countUserViews` 改查 `kb_user_statistics`；新增 `DocumentStatisticsAggMapper.sumViewCountByDateRange`
4. 废弃标注：`12_kb_statistics_views.sql`、`14_kb_statistics_ai_views.sql`、`create_tables.sql` / export 中 VIEW 段

### 【参考文件】

- backend/kb-statistics/src/main/java/com/knowledge/base/statistics/service/impl/StatisticsServiceImpl.java
- backend/kb-statistics/src/main/resources/mapper/DocumentStatisticsAggMapper.xml
- backend/kb-statistics/src/main/resources/mapper/UserStatisticsMapper.xml
- backend/sql/master-sql/12_kb_statistics_views.sql
- backend/sql/master-sql/14_kb_statistics_ai_views.sql
- backend/sql/schema/statistics-sql-audit.md
- 遗留治理计划.md

### 【差距总结】

- `ViewStatisticsMapper` / `kb_view_history` 仍用于浏览明细、MQ 写入与定时聚合管道（本库表，非跨库 VIEW）
- `buildViewCountMap` 仍读 `kb_view_history` 明细（用户活跃度场景，可后续改预聚合）

---

## 2026-07-11（遗留治理：任务 32）

### 【本次功能】

1. **任务 32** 统计查询审计：扫描 `kb-statistics` 全部 Mapper/XML/JdbcTemplate/Entity，产出「文件 → SQL → 替代方案」审计表
2. **结论**：运行时代码 **无跨库 VIEW 依赖**（0 处 `FROM kb_document`/`kb_user` 等）；主要查询已用 `stat_*` 投影表；遗留风险在旧 SQL 脚本与 `StatisticsServiceImpl` 的 `kb_view_history` 回退路径
3. **交付物**：`backend/sql/schema/statistics-sql-audit.md`；`kb_statistics.sql` 头部增加审计引用

### 【参考文件】

- backend/sql/schema/statistics-sql-audit.md
- backend/sql/schema/kb_statistics.sql
- backend/kb-statistics/src/main/resources/mapper/*.xml
- backend/kb-statistics/src/main/java/com/knowledge/base/statistics/service/impl/StatisticsServiceImpl.java
- backend/sql/master-sql/12_kb_statistics_views.sql
- backend/sql/master-sql/14_kb_statistics_ai_views.sql
- 遗留治理计划.md

### 【差距总结】

- 任务 32 仅审计与文档，代码/SQL 改造留待任务 33（去回退、标注废弃 VIEW 脚本、概览浏览量改聚合表）

---

## 2026-07-11（遗留治理：任务 31）

### 【本次功能】

1. **任务 31** MQ/RAG E2E：`PublishDualIndexE2EAcceptanceTest` 模拟文档 `PUBLISHED` 事件，断言 `kb_document` + `kb_chunk` 双索引关键词/chunk 均可命中
2. 测试基础设施：`InMemoryEsTestConfiguration`（`@SpringBootConfiguration` 切片）、`InMemoryElasticsearchSupport`（内存 ES Mock，支持 lambda/search 双重重载）、`SynchronousE2EReindexService`（跳过 MQ 同步写 chunk）
3. **自检**：Java 21 全仓 `mvn test` 15 模块 BUILD SUCCESS，15 用例全绿（含 E2E 1 条）

### 【参考文件】

- backend/kb-intelligence/kb-intelligence-app/src/test/java/com/knowledge/base/intelligence/acceptance/PublishDualIndexE2EAcceptanceTest.java
- backend/kb-intelligence/kb-intelligence-app/src/test/java/com/knowledge/base/intelligence/acceptance/support/InMemoryEsTestConfiguration.java
- backend/kb-intelligence/kb-intelligence-app/src/test/java/com/knowledge/base/intelligence/acceptance/support/InMemoryElasticsearchSupport.java
- backend/kb-intelligence/kb-intelligence-app/src/test/java/com/knowledge/base/intelligence/acceptance/support/SynchronousE2EReindexService.java
- backend/kb-intelligence/kb-intelligence-app/pom.xml
- 遗留治理计划.md

### 【差距总结】

- E2E 使用内存 ES Mock，非 Testcontainers 真 ES；满足「不依赖 Docker、全仓 mvn test 绿灯」约束
- `enrichDocumentMetadata` 路径中 `ElasticsearchOperations.search` 未 mock，测试日志有 WARN 但不影响断言

---

## 2026-07-11（遗留治理：任务 30）

### 【本次功能】

1. **任务 30** Java 21 全仓 `mvn test`：15 模块 BUILD SUCCESS，14 用例全绿
2. 修复 llm `DocumentLifecycleListenerTest` Mockito UnnecessaryStubbing（stub 下沉至各用例）
3. 修复 retrieval `SearchServiceImpl` 缺失 `ElasticsearchClient` import 及 `RagSearchResultVO.score`（primitive double）空值比较

### 【参考文件】

- backend/kb-intelligence/kb-intelligence-llm/src/test/java/com/knowledge/base/ai/mq/DocumentLifecycleListenerTest.java
- backend/kb-intelligence/kb-intelligence-retrieval/src/main/java/com/knowledge/base/search/service/impl/SearchServiceImpl.java
- 遗留治理计划.md

### 【差距总结】

- 有测试模块：statistics(3) + llm(4) + retrieval(5) + app(2) = 14 用例；gateway/file/core 等无测试
- 任务 31 RAG E2E（发布 → ES 双索引可搜）尚未实现

---

## 2026-07-11（遗留治理：任务 29）

### 【本次功能】

1. **任务 29** 修复 `kb-intelligence-llm` 编译：`ElasticsearchVectorIndexServiceImpl` 补 `ElasticsearchClient` import；`MilvusVectorIndexServiceImpl` 修正 primitive `double` 与 null 比较
2. **自检**：Java 21 下 `mvn compile -pl kb-intelligence/kb-intelligence-llm -am` 通过

### 【参考文件】

- backend/kb-intelligence/kb-intelligence-llm/src/main/java/com/knowledge/base/ai/rag/service/impl/ElasticsearchVectorIndexServiceImpl.java
- backend/kb-intelligence/kb-intelligence-llm/src/main/java/com/knowledge/base/ai/rag/service/impl/MilvusVectorIndexServiceImpl.java
- 遗留治理计划.md

### 【差距总结】

- llm 模块 `DocumentLifecycleListenerTest` 4 用例因 Mockito UnnecessaryStubbing 失败，留待任务 30 一并处理
- 全仓 `mvn test` 尚未验证

---

## 2026-07-11（遗留治理计划重订）

### 【本次功能】

1. 新建 `遗留治理计划.md`：将阻塞项、架构债务、前端收尾、运维调优重新编排为任务 **29–41**，并定义第 6–10 周执行顺序与验收标准

### 【参考文件】

- 遗留治理计划.md
- backend/docs/优化路线图.md
- readme_plan.md

### 【差距总结】

- 计划文件已建立，具体任务 29 起尚未执行
- 推荐下一项：任务 29 修复 `kb-intelligence-llm` 的 `ElasticsearchClient` 编译

---

## 2026-07-11（优化路线图第 5 周：任务 28）

### 【本次功能】

1. **任务 28** Empty/Loading 第二批：`DraftsPage` 空态改用 `EmptyState`；`DocumentDetailPage` 全页加载改用 `PageLoading`
2. **环境验证**：Java 21 下 `kb-statistics` 模块 `mvn test` 通过

### 【参考文件】

- frontend/src/pages/DraftsPage.tsx
- frontend/src/pages/DocumentDetailPage.tsx
- backend/kb-statistics（mvn test 验证）

### 【差距总结】

- admin 子页、AI 助手、评论区等局部 Spin 未统一
- 全仓 `mvn test` 仍因 `kb-intelligence-llm` 缺少 `ElasticsearchClient` 编译失败
- 统计宽表去 VIEW、Intelligence JVM 调优仍待做

---

## 2026-07-11（优化路线图第 5 周：任务 27）

### 【本次功能】

1. **任务 27** 全站 Empty/Loading 推广（第一批）：`RecentAccessPage`、`KnowledgeGraphPage`、`MyDocumentsPage`、`FavoritesPage` 接入 `PageLoading` / `EmptyState`；`PageLoading` 支持 `style` 自定义容器样式

### 【参考文件】

- frontend/src/components/common/PageLoading.tsx
- frontend/src/components/common/EmptyState.tsx
- frontend/src/pages/RecentAccessPage.tsx
- frontend/src/pages/RecentAccessPage.css
- frontend/src/pages/KnowledgeGraphPage.tsx
- frontend/src/pages/MyDocumentsPage.tsx
- frontend/src/pages/FavoritesPage.tsx
- backend/docs/优化路线图.md

### 【差距总结】

- 知识图谱页空态仍为页面定制 dark-theme 样式，未改用 `EmptyState`
- DraftsPage、DocumentDetailPage、admin 子页、AI 助手等仍保留内联 Spin/Empty
- Table `loading` 属性等局部加载态未统一

---

## 2026-07-11（优化路线图第 5 周：任务 26）

### 【本次功能】

1. **任务 26** FileManagement mammoth/xlsx 懒加载分包：新增 `document-preview-loaders.ts` 动态 import；`FileManagementPage` 移除静态依赖；`vite.config.ts` 增加 mammoth/xlsx 独立 chunk

### 【参考文件】

- frontend/src/utils/document-preview-loaders.ts
- frontend/src/pages/FileManagementPage.tsx
- frontend/vite.config.ts
- backend/docs/优化路线图.md

### 【差距总结】

- mammoth（~497KB）、xlsx（~425KB）仍为独立大 chunk，仅在预览 docx/xlsx 时按需加载
- `FileManagementPage` 主包由 ~890KB 降至 ~62KB；mammoth 自身仍触发 >500KB 构建警告
- 全站 Empty/Loading 推广、统计宽表去 VIEW 等待做

---

## 2026-07-11（优化路线图第 5 周：任务 25）

### 【本次功能】

1. **任务 25** 收敛两套 `AdminCenterPage`：删除 `pages/AdminCenterPage.tsx` 及配套 CSS（mock 数据 + 嵌套路由壳）；统一以 `pages/admin/AdminCenterPage.tsx` 为唯一实现；更新 `pages/index.ts` 与 `admin/index.ts` 导出

### 【参考文件】

- frontend/src/pages/admin/AdminCenterPage.tsx（保留）
- frontend/src/pages/index.tsx
- frontend/src/pages/admin/index.ts
- frontend/src/router/index.tsx
- backend/docs/优化路线图.md

### 【差距总结】

- 旧版侧栏嵌套路由布局已移除；各 admin 子页仍由 router 独立路由挂载，未恢复统一侧栏壳
- `admin/AdminCenterPage` 部分模块卡片统计仍为硬编码展示值

---

## 2026-07-11（优化路线图第 5 周：任务 24）

### 【本次功能】

1. **任务 24** 搜索页接入共享 Empty/Loading：新增 `PageLoading`；扩展 `EmptyState` 支持 `descriptionNode` / `footer` / `className`；`SearchPage` 加载态与 0 结果态改用共享组件

### 【参考文件】

- frontend/src/components/common/PageLoading.tsx
- frontend/src/components/common/EmptyState.tsx
- frontend/src/components/common/index.ts
- frontend/src/pages/SearchPage.tsx
- backend/docs/优化路线图.md

### 【差距总结】

- 仅搜索页接入；RecentAccess、KnowledgeGraph 等仍使用内联 `loading-container` 或页面级空态
- `PageLoading`（Spin）与既有 `LoadingCard`（骨架屏）职责分离，未做全站推广

---

## 2026-07-11（优化路线图第 5 周：任务 23）

### 【本次功能】

1. **任务 23** 搜索高亮策略统一：前端 `highlightKeyword` 改为 `<em>` 与后端 ES 一致；新增 `resolveSearchHighlight` / `mergeAdjacentEmTags`；搜索组件与 CSS 统一使用 em 样式

### 【参考文件】

- frontend/src/components/search/search-utils.ts
- frontend/src/components/search/SearchBox.tsx
- frontend/src/components/search/SearchResultCard.tsx
- frontend/src/components/search/ChunkHighlightList.tsx
- frontend/src/pages/SearchPage.css
- backend/docs/优化路线图.md

### 【差距总结】

- 仅统一搜索域；其他页面（DocumentVersions 等）仍可能使用独立高亮逻辑
- 共享 Empty/Loading 组件仍未抽取（已由任务 24 在搜索页落地）

---

## 2026-07-11（优化路线图第 5 周：任务 19）

### 【本次功能】

1. **任务 19** MQ/RAG 全链路监听器验收测试：检索/LLM 文档生命周期消费者、统计投影消费者、Intelligence 全链路编排验收测试；各模块补充 `spring-boot-starter-test`

### 【参考文件】

- backend/kb-intelligence/kb-intelligence-retrieval/src/test/.../DocumentLifecycleListenerTest.java
- backend/kb-intelligence/kb-intelligence-llm/src/test/.../DocumentLifecycleListenerTest.java
- backend/kb-statistics/src/test/.../CoreStatisticsProjectionListenerTest.java
- backend/kb-intelligence/kb-intelligence-app/src/test/.../DocumentLifecycleChainAcceptanceTest.java
- backend/kb-intelligence/kb-intelligence-retrieval/pom.xml
- backend/kb-intelligence/kb-intelligence-llm/pom.xml
- backend/kb-statistics/pom.xml
- backend/kb-intelligence/kb-intelligence-app/pom.xml
- backend/docs/优化路线图.md

### 【差距总结】

- 当前为 Mockito 监听器验收，非 `@SpringBootTest` + Testcontainers 的 ES/MySQL/RabbitMQ E2E
- 本地 `mvn test` 仍因 JDK `--release` 配置失败，需在 Java 21 环境执行验证
- 未覆盖「发布后关键词可搜、chunk 可命中」的实索引断言

---

## 2026-07-11（优化路线图第 4 周：任务 22）

### 【本次功能】

1. **任务 22** 搜索域组件化：抽取 `SearchBox`、`SearchModeToggle`、`SearchResultCard`、`ChunkHighlightList` 及 `search-utils`；`SearchPage` 改为组合式页面

### 【参考文件】

- frontend/src/components/search/SearchBox.tsx
- frontend/src/components/search/SearchModeToggle.tsx
- frontend/src/components/search/SearchResultCard.tsx
- frontend/src/components/search/ChunkHighlightList.tsx
- frontend/src/components/search/search-utils.ts
- frontend/src/components/search/index.ts
- frontend/src/pages/SearchPage.tsx
- backend/docs/优化路线图.md

### 【差距总结】

- 0 结果引导、热词/历史初始态仍留在 `SearchPage`，未进一步组件化
- 高亮 `<mark>`/`<em>` 统一、共享 Empty/Loading 仍为待做项

---

## 2026-07-11（优化路线图第 4 周：任务 21）

### 【本次功能】

1. **任务 21** `UsersPage` / `UsersManagementPage` 合并：删除早期 mock 版 `UsersPage.tsx`；`UsersManagementPage` 作为 `/admin/users` 唯一入口；旧版 `AdminCenterPage` 嵌套路由改用 `UsersManagementPage`

### 【参考文件】

- frontend/src/pages/admin/UsersManagementPage.tsx（删除 UsersPage.tsx）
- frontend/src/pages/AdminCenterPage.tsx
- frontend/src/pages/admin/index.ts
- frontend/src/router/index.tsx
- backend/docs/优化路线图.md

### 【差距总结】

- `pages/AdminCenterPage.tsx` 仍为旧版侧栏布局，主路由实际使用 `admin/AdminCenterPage.tsx`，两套管理中心未进一步收敛
- `frontend/README.md` 目录说明仍引用已删除的 `UsersPage.tsx`

---

## 2026-07-11（优化路线图第 4 周：任务 20）

### 【本次功能】

1. **任务 20** `App.tsx` 生产环境 console.log 清理：移除认证初始化调试日志，保留 `checkAuth` 失败时的 `console.error`

### 【参考文件】

- frontend/src/App.tsx
- backend/docs/优化路线图.md

### 【差距总结】

- `EditDocumentPage`、`FileManagementPage` 等页面仍有大量调试 `console.log`，未在本轮清理
- 未引入统一 `debugLog` 工具函数

---

## 2026-07-11（优化路线图第 4 周：任务 18）

### 【本次功能】

1. **任务 18** 路线图状态同步：对照代码将已完成项（副标题/chunk 展示/KnowledgeGraph lazy/rerank 默认关闭/类型对齐等）标为「已完成」；修正第 1–2 周表格列；勾选第 1 周验收标准；新增第 4 周后续队列 19–22

### 【参考文件】

- backend/docs/优化路线图.md
- frontend/src/pages/SearchPage.tsx
- frontend/src/router/index.tsx
- backend/kb-intelligence/kb-intelligence-retrieval/.../SearchServiceImpl.java

### 【差距总结】

- `优化路线图.md` 不在 backend git 跟踪范围内，需随文档目录一并备份
- MQ/RAG 集成、App console.log、UsersPage 合并等待做项仍保留为「待做」

---

## 2026-07-11（优化路线图第 4 周：任务 17）

### 【本次功能】

1. **任务 17** 清除搜索同步 URL：点击 X 时 `navigate('/search')` 并复位结果/分类/分页状态；URL 无 `q` 时 effect 同步重置初始态

### 【参考文件】

- frontend/src/pages/SearchPage.tsx
- backend/docs/优化路线图.md

### 【差距总结】

- 手动删空输入框后按 Enter 仍不触发清空（仅 X 按钮走完整复位流程）
- 浏览器后退到带 `?q=` 的历史 URL 仍会重新检索（符合预期）

---

## 2026-07-11（优化路线图第 4 周：任务 16）

### 【本次功能】

1. **任务 16** 搜索请求去重与取消：检索与分页统一由 URL（`q`/`category`/`page`）驱动；`AbortController` 取消过期 search/suggest 请求；移除 `performSearch` 直调路径

### 【参考文件】

- frontend/src/pages/SearchPage.tsx
- frontend/src/services/search.service.ts
- backend/docs/优化路线图.md

### 【差距总结】

- 清除搜索框（X）未同步清空 URL，带 `?q=` 时仍会触发检索（原有问题）
- 开发环境 React Strict Mode 仍可能各触发一次请求（首请求会被 abort）

---

## 2026-07-11（优化路线图第 3 周：任务 15）

### 【本次功能】

1. **任务 15** 搜索结果本页跳转：点击结果卡片默认 `navigate` 到文档详情；Ctrl/Cmd+点击仍在新标签打开

### 【参考文件】

- frontend/src/pages/SearchPage.tsx
- backend/docs/优化路线图.md

### 【差距总结】

- 未在 UI 上提示「Ctrl+点击新标签」操作说明
- 其他页面（DocumentsPage、Dashboard 等）仍使用 `window.open`，未统一

---

## 2026-07-11（优化路线图第 3 周：任务 14）

### 【本次功能】

1. **任务 14** 热词 fallback 去硬编码：移除 `SearchPage` 中写死的中文示例热词，API 无数据时显示「暂无热词」空态

### 【参考文件】

- frontend/src/pages/SearchPage.tsx
- backend/docs/优化路线图.md

### 【差距总结】

- 无热词时未提供分类推荐等替代引导（路线图 P2 备选方案未实现）
- 热词数据仍依赖后端统计接口，空态为纯展示

---

## 2026-07-11（优化路线图第 3 周：任务 13）

### 【本次功能】

1. **任务 13** 搜索 0 结果引导：无结果时展示操作建议、一键切换混合搜索、清除分类筛选、热门搜索快捷重试

### 【参考文件】

- frontend/src/pages/SearchPage.tsx
- frontend/src/pages/SearchPage.css
- backend/docs/优化路线图.md

### 【差距总结】

- 未接入索引健康检查 API 的运维引导（仍面向普通用户场景）
- 混合模式 0 结果时无额外「降维」建议（如缩短关键词）

---

## 2026-07-11（优化路线图第 3 周：任务 12）

### 【本次功能】

1. **任务 12** 字典/状态枚举统一：`document_status` 字典值对齐 `DocumentStatus`（0草稿/1已发布/2已归档/3待审核）；迁移 `010_align_document_status_dict.sql`；前端 `document-status` 工具与状态码常量

### 【参考文件】

- backend/kb-common/.../DocumentStatus.java
- backend/sql/data/init_kb_foundation.sql（已正确，作基准）
- backend/sql/master-sql/init_kb_foundation.sql
- backend/sql/master-sql/init_data.sql
- backend/sql/data/generated/kb_foundation.sql
- backend/sql/migration/010_align_document_status_dict.sql
- frontend/src/utils/document-status.ts
- frontend/src/constants/index.ts
- frontend/src/stores/document.store.ts
- frontend/src/pages/DocumentReviewWorkspacePage.tsx
- backend/docs/优化路线图.md

### 【差距总结】

- kb_common 旧字典（140000... 字符串 draft/published）未改，仅统一 kb_foundation 数值字典
- 各页面仍有零散硬编码状态判断，未全部改用 `mapDocumentStatusFromCode`

---

## 2026-07-11（优化路线图第 3 周：任务 11）

### 【本次功能】

1. **任务 11** 搜索分类筛选接 API：后端 `categoryIds` 过滤 kb_document/kb_chunk ES 查询；混合搜索元数据补齐后过滤；前端搜索页增加分类下拉，URL 参数 `category` 驱动

### 【参考文件】

- backend/kb-intelligence/kb-intelligence-retrieval/.../SearchServiceImpl.java
- backend/kb-intelligence/kb-intelligence-retrieval/.../SearchResultVO.java
- backend/kb-intelligence/kb-intelligence-llm/.../VectorIndexService.java
- backend/kb-intelligence/kb-intelligence-llm/.../ElasticsearchVectorIndexServiceImpl.java
- frontend/src/pages/SearchPage.tsx
- frontend/src/services/search.service.ts
- backend/docs/优化路线图.md

### 【差距总结】

- 仅支持单选分类（categoryIds 数组但 UI 传单值）；子分类未展开为树形筛选
- Milvus 降级路径未在内存聚合时按 category 过滤

---

## 2026-07-11（优化路线图第 3 周：任务 10）

### 【本次功能】

1. **任务 10** 关键词搜索 ES collapse 分页：`searchBm25Collapsed` 按 `document_id` collapse + inner_hits；文档元数据改为 ES `from/size` 分页；双路 `CompletableFuture` 并行；total 取 chunk cardinality 与 doc total 较大值

### 【参考文件】

- backend/kb-intelligence/kb-intelligence-llm/.../VectorIndexService.java
- backend/kb-intelligence/kb-intelligence-llm/.../ElasticsearchVectorIndexServiceImpl.java
- backend/kb-intelligence/kb-intelligence-llm/.../MilvusVectorIndexServiceImpl.java
- backend/kb-intelligence/kb-intelligence-llm/.../Bm25CollapsePageVO.java
- backend/kb-intelligence/kb-intelligence-llm/.../Bm25CollapsedDocumentVO.java
- backend/kb-intelligence/kb-intelligence-retrieval/.../SearchServiceImpl.java
- backend/docs/优化路线图.md

### 【差距总结】

- 双源合并分页在深度页仍可能漏排（元数据页与 chunk 页独立 offset）；total 为两源 max 近似值
- Milvus 模式仍为内存聚合降级，无原生 collapse

---

## 2026-07-11（优化路线图第 2 周：任务 9）

### 【本次功能】

1. **任务 9** 索引健康检查 API：`GET /index/health` 对比 kb-core 已发布文档数与 ES `kb_document`/`kb_chunk` 文档量，返回 HEALTHY/WARNING/CRITICAL

### 【参考文件】

- backend/kb-intelligence/kb-intelligence-retrieval/.../SearchController.java
- backend/kb-intelligence/kb-intelligence-retrieval/.../SearchService.java
- backend/kb-intelligence/kb-intelligence-retrieval/.../SearchServiceImpl.java
- backend/kb-intelligence/kb-intelligence-retrieval/.../SearchIndexHealthVO.java
- backend/docs/优化路线图.md

### 【差距总结】

- chunk 健康仅判断「有已发布文档时 chunk 数 > 0」，未逐文档对账
- 管理端 UI 未接入健康检查展示，需运维直接调 API

---

## 2026-07-11（优化路线图第 2 周：任务 6–8）

### 【本次功能】

1. **任务 6** 排序接 API：后端 `sortSearchResults` 支持 relevance/time/views；前端 `SearchPage` 传 `sortBy`
2. **任务 7** suggest 扩展：标题前缀 + `kb_chunk` BM25 命中合并，正文命中时补充 `keyword` 类型建议
3. **任务 8** 大依赖分包：`PdfPreviewPanel`/`LazyECharts` 动态加载；知识图谱页改 lazy；Vite `manualChunks` 拆分 echarts/react-pdf

### 【参考文件】

- backend/kb-intelligence/kb-intelligence-retrieval/.../SearchServiceImpl.java
- frontend/src/pages/SearchPage.tsx
- frontend/src/components/file-management/PdfPreviewPanel.tsx
- frontend/src/components/common/LazyECharts.tsx
- frontend/src/pages/FileManagementPage.tsx
- frontend/src/pages/admin/OperationLogPage.tsx
- frontend/src/router/index.tsx
- frontend/vite.config.ts
- backend/docs/优化路线图.md

### 【差距总结】

- `FileManagementPage` 仍含 mammoth/xlsx 等大依赖（约 890KB），未在本轮拆分
- suggest 的 `keyword` 类型前端未单独样式区分，与标题建议共用展示

---

## 2026-07-11（优化路线图第 1 周执行）

### 【本次功能】

1. **P0-1** 搜索历史 upsert：`SearchHistoryServiceImpl` 加锁 + 合并重复行；迁移 `009_unique_kb_search_history.sql`
2. **P0-2** 搜索页去双请求：URL 单源驱动，移除 navigate 后重复 `performSearch`
3. **P0-3** 关键词模式展示「相关片段」；副标题按模式切换
4. **P0-4** 新增 `deploy/scripts/rebuild-es-indices.ps1`；更新 `sql/es/README.md`
5. **P1-5** 混合搜索默认关闭 `enableRerank`

### 【参考文件】

- backend/kb-intelligence/kb-intelligence-retrieval/.../SearchHistoryServiceImpl.java
- backend/sql/migration/009_unique_kb_search_history.sql
- frontend/src/pages/SearchPage.tsx
- frontend/src/services/search.service.ts
- deploy/scripts/rebuild-es-indices.ps1
- backend/sql/es/README.md
- backend/docs/优化路线图.md

### 【差距总结】

- `deploy/scripts/rebuild-es-indices.ps1` 不在 backend git 仓库内，需随项目根/deploy 一并备份
- 本地需执行迁移 009 + 重建 ES 并 reindex 后，方可完整验证 `startTransition` 深搜
- 混合搜索「精准重排」开关 UI 未做，当前仅默认关闭 rerank

---

## 2026-07-11（优化路线图计划沉淀）

### 【本次功能】

1. 新增 `backend/docs/优化路线图.md`：架构/功能/UI/性能/组件五维优化项，P0–P2 优先级，两周实施顺序与验收标准
2. `backend/docs/README.md` 增加路线图索引

### 【参考文件】

- backend/docs/优化路线图.md
- backend/docs/系统功能解析.md
- backend/docs/README.md

### 【差距总结】

- 仅为计划文档，代码实施按路线图「第 1 周」待启动

---

## 2026-07-11（沉淀系统功能解析文档）

### 【本次功能】

1. 新增 `backend/docs/系统功能解析.md`：系统定位、4 BC 架构图、业务模块、文档生命周期数据流、双索引说明、技术栈速查、搜索能力、运维要点
2. `backend/docs/README.md` 文档清单增加索引链接

### 【参考文件】

- backend/docs/系统功能解析.md
- backend/docs/README.md

### 【差距总结】

- 无；纯文档沉淀，不涉及代码变更

---

## 2026-07-11（关键词搜索双索引改造）

### 【本次功能】

1. 关键词搜索改为「文档级元数据 + chunk 正文」双路检索：title/summary/tags 走 `kb_document`，正文走 `kb_chunk` BM25 并按 documentId 聚合
2. 移除文档级索引 1000 字正文截断：`DocumentSearchIndexPayloadBuilder` 不再写入 `content`
3. ES 索引映射增强：`title/summary/content` 增加 `standard` 子字段，`content` 增加 `keyword` 子字段，支持英文 API 名（如 `startTransition`）检索
4. `VectorIndexService` 新增 `searchBm25`，ES/Milvus 双实现；旧索引缺少 multi-field 时自动降级 match 查询

### 【参考文件】

- backend/kb-intelligence/kb-intelligence-retrieval/src/main/java/com/knowledge/base/search/service/impl/SearchServiceImpl.java
- backend/kb-intelligence/kb-intelligence-llm/src/main/java/com/knowledge/base/ai/rag/service/VectorIndexService.java
- backend/kb-intelligence/kb-intelligence-llm/src/main/java/com/knowledge/base/ai/rag/service/impl/ElasticsearchVectorIndexServiceImpl.java
- backend/kb-core/kb-core-document/src/main/java/com/knowledge/base/document/support/DocumentSearchIndexPayloadBuilder.java
- backend/kb-common/src/main/resources/elasticsearch/kb_document_index.json
- backend/kb-common/src/main/resources/elasticsearch/kb_chunk_index.json
- backend/sql/es/kb_document_index.json
- backend/sql/es/kb_chunk_index.json

### 【差距总结】

- 已有 ES 索引需执行「重建索引」或 reindex 后，multi-field 与去 content 映射才完全生效；未重建前 chunk 检索仍可用（含 wildcard 兜底）
- 搜索建议（suggest）仍仅匹配标题前缀，未扩展至正文关键词

---

## 2026-07-11（前端依赖全面升级至最新 major）

### 【本次功能】

1. 核心框架：Vite 5 → 8.1.4、React 18 → 19.2.7、react-router-dom 6 → 7.18.1
2. UI 与状态：antd 5 → 6.5.0、@ant-design/icons 6.3.2、zustand 4 → 5.0.14
3. 图表与工具：echarts 6.1.0、recharts 3.9.2、react-markdown 10.1.0、axios 1.18.1 等
4. 工程化：ESLint 10 flat config（`eslint.config.js`）、TypeScript 5.9.3、@vitejs/plugin-react-swc 4.3.1
5. Ant Design 6 适配：`destroyOnClose`→`destroyOnHidden`、`bodyStyle`→`styles.body`、`Divider orientation="left"`→`titlePlacement="start"`
6. 类型与 API 对齐：`EntityId` 统一文件 ID、`Document.tags/isPublic` 兼容后端、`npm run build` 通过

### 【参考文件】

- frontend/package.json
- frontend/eslint.config.js
- frontend/vite.config.ts
- frontend/tsconfig.json
- frontend/src/App.tsx
- frontend/src/types/index.ts
- frontend/src/services/file-management.service.ts
- frontend/src/pages/admin/ReviewPage.tsx

### 【差距总结】

- TypeScript 7 已发布，但 `typescript-eslint@8` peer 要求 `<6.1.0`，暂用 TS 5.9.3
- `tsconfig` 中 `noUnusedLocals/noUnusedParameters` 已关闭以通过构建，后续可分批清理未使用变量
- 大 chunk 警告（FileManagementPage、echarts）仍存在，可按需做 code-split

---

## 2026-07-11（修复 SQL 导入中文变问号）

### 【本次功能】

1. 新增 `deploy/scripts/mysql-import-utils.ps1`：用 `docker cp` + 容器内 `source` 导入 SQL，避免 PowerShell 管道破坏 UTF-8
2. 改造 `import-master-export.ps1`、`import-dev-data.ps1`、`import-schema.ps1` 统一调用上述工具
3. 重新执行 master 数据导入，验证分类/文档标题/`system.name` 中文正常（如「技术文档」「企业知识库」）

### 【参考文件】

- deploy/scripts/mysql-import-utils.ps1
- deploy/scripts/import-master-export.ps1
- deploy/scripts/import-dev-data.ps1
- deploy/scripts/import-schema.ps1

### 【差距总结】

- 无；刷新前端页面即可看到正确中文（若仍显示旧值，清除浏览器缓存或硬刷新）

---

## 2026-07-11（master-sql 吸收 + 生产真实数据导入）

### 【本次功能】

1. 迁移 `007_schema_absorb_master.sql`：`kb_document_access` 补字段/唯一索引；`kb_notification_template` 建表
2. 迁移 `008_schema_align_export_data.sql`：对齐 `kb_permission`、`kb_search_history`、`kb_user_favorite` 与 export 列差异
3. 专用种子：`init_master_category.sql`、`init_master_kb_document.sql`（显式列名）、`init_notification_template.sql`
4. 增强 `deploy/scripts/import-master-export.ps1`：表级显式列映射、`tb_*`→`kb_*`、跳过 `kb_operation_log`（JSON 含分号）
5. 执行导入后核心数据量：文档 28、文件 31、分类 17、审核记录 25、访问记录 12、用户 11、权限 43

### 【参考文件】

- backend/sql/migration/007_schema_absorb_master.sql
- backend/sql/migration/008_schema_align_export_data.sql
- backend/sql/data/init_master_category.sql
- backend/sql/data/init_master_kb_document.sql
- backend/sql/data/init_notification_template.sql
- deploy/scripts/import-master-export.ps1
- backend/sql/schema/kb_document.sql、kb_user.sql、kb_intelligence.sql、kb_favorite.sql

### 【差距总结】

- `kb_operation_log` 因 JSON 字段含分号未自动导入，需后续单独处理或改写解析逻辑
- AI 对话表 `conversation`/`message` 与 export 列顺序不同，暂未导入（不影响文档/文件主流程）
- `kb_document.sql` 批量导入时 `kb_user_favorite` 已修复；若仍有 WARN 多为 MySQL 密码告警，不影响数据

---

## 2026-07-11（文件管理上传 500：kb_file 表名/结构对齐）

### 【本次功能】

1. 定位根因：kb-file 代码查 `tb_file`，库中仅有旧版 `kb_file` 且列结构不一致
2. 迁移 `006_schema_align_kb_file.sql` 重建 `kb_file` 表，对齐 `FileInfo` 实体字段
3. `FileInfo` / `FileMapper.xml` 统一为 `kb_file`；`kb_file.sql` schema 同步更新
4. 重启 kb-file 后 `/files/upload` 返回 200

### 【参考文件】

- backend/sql/migration/006_schema_align_kb_file.sql
- backend/sql/schema/kb_file.sql
- backend/kb-file/src/main/java/com/knowledge/base/file/entity/FileInfo.java
- backend/kb-file/src/main/resources/mapper/FileMapper.xml

### 【差距总结】

- 文件管理页进度条仍为前端模拟（见 FileManagementPage）；后端分片上传 API 仅在 Service 层实现，Controller 未暴露，前端未接入

---

## 2026-07-11（文档自动保存 500：Mongo 认证库 + 事务回滚）

### 【本次功能】

1. 定位根因：`MongoConfig` 硬编码 `authSource=admin`，与 `init-user.js` 在 `knowledge_base` 库创建的应用账号不一致，Mongo 认证失败
2. 改为读取 `spring.data.mongodb.authentication-database`（默认 `knowledge_base`）
3. 移除 `DocumentContentServiceImpl` 上误用的 MySQL `@Transactional`，避免 Mongo 异常将外层事务标为 rollback-only 导致 `UnexpectedRollbackException`
4. 重启 kb-core 后 `/documents/autosave` 返回 200，Mongo 内容保存成功

### 【参考文件】

- backend/kb-core/kb-core-document/src/main/java/com/knowledge/base/document/config/MongoConfig.java
- backend/kb-core/kb-core-document/src/main/java/com/knowledge/base/document/service/impl/DocumentContentServiceImpl.java
- deploy/mongo/init-user.js
- deploy/logs/kb-core.out.log

### 【差距总结】

- 无

---

## 2026-07-11（文档自动保存 500：created_at 未填充）

### 【本次功能】

1. 定位根因：kb-core 多数据源手动创建 SqlSessionFactory，未注册 `MyMetaObjectHandler`，INSERT 时 `created_at`/`updated_at` 为 null
2. 新增 `CoreMybatisPlusConfigurer`，在 IAM/Document/Platform 三个数据源工厂中注入 MetaObjectHandler
3. 重启 kb-core 验证 `/api/document/documents/autosave` 正常

### 【参考文件】

- backend/kb-core/kb-core-app/src/main/java/com/knowledge/base/core/config/CoreMybatisPlusConfigurer.java
- backend/kb-core/kb-core-app/src/main/java/com/knowledge/base/core/config/Core*DataSourceConfig.java
- deploy/logs/kb-core.out.log

### 【差距总结】

- 无

---

## 2026-07-11（技术选型文档沉淀）

### 【本次功能】

1. 将项目技术栈、中间件、4 BC 分工、AI/RAG、数据存储策略整理为 `backend/docs/技术选型.md`
2. 在 `backend/docs/README.md` 文档清单中增加索引链接

### 【参考文件】

- backend/docs/技术选型.md
- backend/docs/README.md

### 【差距总结】

- 无功能代码变更，纯文档沉淀

---

## 2026-07-11（代码与库结构对齐：kb_* 统一 + 补 4 表）

### 【本次功能】

1. 新增 `004_schema_align_entities.sql`：扩展 `kb_tag`/`kb_comment`/`kb_document_version` 列、创建 `kb_like`/`kb_document_access`/`kb_document_share`/`kb_file_metadata`
2. 实体 `@TableName` 统一为 `kb_*`（Tag/Comment/DocumentVersion/Like）；Mapper XML 与 `CommentServiceImpl` 原生 SQL 同步
3. `CommentMapper` 列名对齐库表（`user_id` 等）；根评论查询改为 `parent_id = 0`
4. 更新 `kb_document.sql` schema；修正 `init_kb_foundation.sql` 的 `document_status` 字典（0草稿/1已发布/2已归档/3待审核）

### 【参考文件】

- backend/sql/migration/004_schema_align_entities.sql
- backend/sql/schema/kb_document.sql
- backend/sql/data/init_kb_foundation.sql
- backend/kb-core/kb-core-document/src/main/java/.../entity/{Tag,Comment,DocumentVersion,Like}.java
- backend/kb-core/kb-core-document/src/main/resources/mapper/{Tag,Comment,DocumentVersion,Like}Mapper.xml

### 【差距总结】

- `tb_document_review` 保留（审核模块已用）；遗留 `kb_document_review` 旧表未删
- `kb_tag` 仍保留 `tag_color`/`use_count` 兼容列，新代码用 `color`/`doc_count`
- 改 Java 后需重启 `kb-core` 生效

---

## 2026-07-11（data 样例数据全量导入 + 表字段对齐核查）

### 【本次功能】

1. 逐个执行 `backend/sql/data/` 下 6 个 init 脚本 + 3 个 migration；补导缺失的 `kb_team`/`kb_team_member`/`kb_role_permission`
2. 修复 `init_permission_resource.sql` 缺少 `USE kb_user` 导致无法执行
3. 核查 kb-core 23 个实体与 MySQL 字段/表名一致性

### 【参考文件】

- backend/sql/data/*.sql
- backend/sql/migration/001~003_schema_align*.sql
- deploy/scripts/import-dev-data.ps1

### 【差距总结】

- 4 个 init 脚本因主键重复显示「已存在」属正常（用户/文档/配置/intelligence 已在库中）
- **代码与库不一致（高优先级）**：`Tag`/`Comment`/`DocumentVersion`/`Like` 实体表名仍为 `tb_*`，库中为 `kb_*` 或缺表；`Tag` 字段与 `kb_tag` 列名完全不同
- **字典与实体不一致**：`init_kb_foundation.sql` 中 document_status 为 0草稿/1待审核/2已发布/3已驳回，实体 `DocumentStatus` 为 0草稿/1已发布/2已归档/3待审核

---

## 2026-07-11（审核详情页操作失败）

### 【本次功能】

1. 定位根因：`kb_document` 缺 `content_id` 等字段、`tb_document_review` 表不存在 → 审核页三个接口 500
2. 新增并执行 `003_schema_align_document.sql`：补全 `kb_document` 字段、`status` VARCHAR→TINYINT、创建 `tb_document_review`、插入文档 4 待审核演示数据
3. 同步 `backend/sql/schema/kb_document.sql`、`init_kb_document.sql`（status 改为数字）
4. 导入 `init_kb_document.sql` 演示文档数据

### 【参考文件】

- backend/sql/migration/003_schema_align_document.sql
- backend/sql/schema/kb_document.sql
- backend/sql/data/init_kb_document.sql
- deploy/logs/kb-core.out.log

### 【差距总结】

- 演示文档正文仍在 MySQL `content` 列，未迁移 MongoDB，审核页可打开但正文可能显示「暂无文档内容」
- 需执行 `import-dev-data.ps1` 或单独导入 `init_kb_document.sql` 才有文档与审核任务数据

---

## 2026-07-11（配置瘦身：本地兜底 + Nacos 环境配置）

### 【本次功能】

1. 各服务 `application.yml` 瘦身为 ~30 行（端口、Nacos 连接、`config.import`、MyBatis-Plus）
2. 新增 Nacos 公共配置 `application-dev.yaml`（Redis/RabbitMQ/JWT/Jackson）
3. 扩充 5 个 `kb-*-dev.yaml.template`（数据源、网关路由、AI/RAG 等原本地配置）
4. `import-nacos.ps1` 支持清理废弃 DataId + 重新导入 6 项配置；已重启全部微服务并验证通过

### 【参考文件】

- backend/nacos/application-dev.yaml.template
- backend/nacos/kb-*-dev.yaml.template
- backend/kb-*/src/main/resources/application.yml（5 服务）
- deploy/scripts/import-nacos.ps1、backend/nacos/README.md

### 【差距总结】

- Nacos 不可用时仅保留框架兜底，业务配置需 Nacos 在线（`optional:` 前缀）
- 修改环境配置后需 `import-nacos.ps1` + 重启对应服务

---

## 2026-07-10（登录后首页踢回登录页）

### 【本次功能】

1. 定位根因：登录成功但 JWT 校验查用户时 SQL 报错（缺 `email_verified` 等字段）→ 过滤器判 Token 无效 → 401 踢回登录
2. 补迁移 `002_schema_align_iam.sql`：`kb_user` 邮箱验证字段、`kb_team` 树形字段（level/path/member_count/doc_count）
3. 修复网关 statistics 路由 `StripPrefix=1` → `2`（路径 `/statistics/dashboard` 才能命中 Controller）

### 【参考文件】

- backend/sql/migration/002_schema_align_iam.sql
- backend/sql/schema/kb_user.sql
- backend/kb-gateway/src/main/resources/application.yml

### 【差距总结】

- 初始化数据密码仍为 **123456**（非文档 admin123）
- 首页统计/分类等依赖 `import-dev-data.ps1` 才有展示数据，空库返回 200 但列表为空属正常

---

## 2026-07-10（接口 500：数据库表结构与代码对齐）

### 【本次功能】

1. 定位全接口 500 根因：数据源修复后 public 接口已正常；其余为 **表字段缺失**（非重启问题）
2. 新增 `backend/sql/migration/001_schema_align.sql` 并执行：`kb_user.remark`、`kb_category.category_code/remark`、`tb_token_blacklist`
3. 同步更新 `backend/sql/schema/kb_user.sql`、`kb_document.sql`

### 【参考文件】

- backend/sql/migration/001_schema_align.sql
- backend/sql/schema/kb_user.sql、backend/sql/schema/kb_document.sql
- deploy/logs/kb-core.out.log（Unknown column remark / category_code）

### 【差距总结】

- 初始化数据密码哈希对应 **123456**，文档写的 admin123 不一致，待统一 init 数据或文档
- 登录路径前端为 `/api/auth/auth/login`（网关 StripPrefix=2），属设计约定

---

## 2026-07-10（backend/docs 同步 4 BC）

### 【本次功能】

1. 新增 `backend/docs/README.md`：4 BC 索引、教程↔代码对照、kb_foundation 表说明、Docker 端口
2. 更新 `搭建项目骨架.md` 模块树；`向量索引与对象存储架构.md` 全量同步
3. 各功能教程文首增加「当前实现」说明块（路径/端口指向 README）

### 【参考文件】

- backend/docs/README.md
- backend/docs/搭建项目骨架.md
- backend/docs/向量索引与对象存储架构.md
- backend/docs/增加*.md、diagrams.md

### 【差距总结】

- 教程正文仍保留历史 `kb-document` 等路径，未逐行改写（体量大）；以 README 对照为准

---


### 【本次功能】

1. **deploy/**：MinIO → RustFS；Nacos gRPC 21848；本地关鉴权；`start-services.ps1`（JVM 256/512）
2. **启动验证**：Docker 8 容器 + 5 微服务 + 前端 :3002 本地可跑
3. **intelligence 修复**：子模块 Bean 重名（DocumentLifecycleMQConfig/Listener、CacheConfig）
4. **docs 同步**：p3-2/p3-3、rh-cha-roadmap、rh-cha、backend/nacos/README

### 【参考文件】

- deploy/docker-compose.yml、deploy/.env、deploy/start-services.ps1、deploy/scripts/init-rustfs.ps1
- docs/after/p3-2-deployment.md、docs/after/p3-3-operations.md、docs/after/rh-cha-roadmap.md
- backend/kb-intelligence/**/config/*.java、backend/kb-intelligence/**/mq/DocumentLifecycleListener.java

### 【差距总结】

- RustFS 容器 healthcheck 偶发 unhealthy，S3 API 仍可用
- MQ 投影 / 搜索 RAG 全链路业务联调待验收
- 无历史数据，stat_* 空表起步属预期

---


### 【本次功能】

1. **本地投影表**：stat_document / stat_user / stat_comment / stat_category / stat_operation_log
2. **MQ 投影**：CoreStatisticsProjectionPublisher + CoreStatisticsProjectionListener
3. **操作日志并行消费**：OperationLogStatisticsListener → stat_operation_log
4. **Mapper/Task 改造**：全部改查 stat_* 本地表；废弃 kb_statistics_views.sql

### 【参考文件】

- backend/sql/schema/kb_statistics_core_projection.sql
- backend/kb-common/.../CoreStatisticsProjectionPublisher.java
- backend/kb-statistics/.../CoreStatisticsProjectionListener.java
- backend/kb-core/kb-core-document/.../DocumentServiceImpl.java（发布投影）

### 【差距总结】

- 无历史数据，投影表从空表起步，由 MQ 增量填充即可
- 中间件未部署，MQ 投影运行验收待环境

---

## 2026-07-10（P3-1a AI 统计去跨库 VIEW）

### 【本次功能】

1. **本地投影表**：`stat_ai_conversation` / `stat_ai_message`（`sql/schema/kb_statistics_ai_projection.sql`）
2. **MQ 事件**：`AiStatisticsEventDTO` + Intelligence 发布 / statistics 消费
3. **Mapper 改造**：`AiStatisticsMapper` 改查本地表，移除 `kb_ai_*` VIEW 依赖

### 【参考文件】

- backend/kb-common/.../AiStatisticsEventDTO.java
- backend/kb-intelligence/kb-intelligence-llm/.../AiStatisticsEventPublisher.java
- backend/kb-statistics/.../AiStatisticsMQListener.java
- backend/sql/schema/kb_statistics_ai_projection.sql

### 【差距总结】

- document/user/comment 等跨库 VIEW 仍在 P3-1b 待改
- 中间件未部署，MQ 投影运行验收待环境就绪

---

## 2026-07-10（kb-core 三数据源 Druid + platformJdbcTemplate）

### 【本次功能】

1. **Druid 对齐**：platform / iam / document 补 `type` + `druid.*` 池参数（对齐 `_archive` 旧服务）
2. **JdbcTemplate 补全**：新增 `platformJdbcTemplate`；`OperationLogMQListener` 加 `@Qualifier`
3. **Nacos 模板**：`kb-core-dev.yaml.template` 同步三数据源 Druid 配置

### 【参考文件】

- backend/kb-core/kb-core-app/src/main/resources/application.yml
- backend/kb-core/kb-core-app/.../CorePlatformDataSourceConfig.java
- backend/kb-core/kb-core-platform/.../OperationLogMQListener.java

### 【差距总结】

- Phase 3 P3-1 待做：kb-statistics 大量跨库 VIEW 查询尚未改为本地宽表

---

## 2026-07-10（P2-7 旧六服务归档）

### 【本次功能】

1. **Core 废弃**：kb-user-auth / kb-document / kb-foundation → DEPRECATED + `LegacyCoreServiceNotifier`
2. **归档**：六旧模块移入 `backend/_archive/`，从 `backend/pom.xml` 移除
3. **网关收敛**：删除旧路由，仅保留 kb-core / kb-intelligence / kb-file / kb-statistics

### 【参考文件】

- backend/_archive/README.md
- backend/kb-common/.../LegacyCoreServiceNotifier.java
- backend/kb-gateway/src/main/resources/application.yml
- docs/after/p2-7-legacy-offline.md

### 【差距总结】

- 中间件未部署，运行验收待环境就绪
- `_archive` 内模块不参与 `mvn compile`

---

## 2026-07-10（P2-4~P2-6 kb-document 迁入 + 网关切流）

### 【本次功能】

1. **P2-4**：kb-document 136 类 + 8 Mapper XML → `kb-core-document`；三数据源 + `DocumentUserLocalClient`；事件驱动索引默认开启
2. **P2-5**：`FileServiceFeignClient` + `FeignMultipartSupportConfig` 保留；`kb-file.url` + feign 超时对齐
3. **P2-6**：网关新增 `kb-core-*-main` 待机路由（order=1）；`switch-core-primary.ps1` + `GATEWAY_CORE_CUTOVER.md`

### 【参考文件】

- backend/kb-core/kb-core-document/
- backend/kb-core/kb-core-app/.../CoreDocumentDataSourceConfig.java
- backend/kb-core/kb-core-app/.../DocumentUserLocalClient.java
- backend/kb-gateway/src/main/resources/application.yml
- backend/kb-gateway/scripts/switch-core-primary.ps1

### 【差距总结】

- 旧三服务源码保留；网关默认仍走 kb-user-auth / kb-document / kb-foundation（order=0）
- 运行验收待中间件部署后补

---

## 2026-07-10（P2-3 kb-user-auth → kb-core-iam）

### 【本次功能】

1. **复制迁入**：kb-user-auth 59 类 + 5 个 Mapper XML → `kb-core-iam`
2. **双数据源**：`spring.datasource.platform`（kb_foundation）+ `iam`（kb_user）
3. **进程内 IAM**：`UserAuthLocalClient` 替代 `UserAuthFeignClient`
4. **统一 Security**：`CoreSecurityConfig` 合并 IAM + Platform 规则

### 【参考文件】

- backend/kb-core/kb-core-iam/src/main/java/com/knowledge/base/userauth/
- backend/kb-core/kb-core-app/.../CoreIamDataSourceConfig.java
- backend/kb-core/kb-core-app/.../UserAuthLocalClient.java
- backend/kb-core/kb-core-platform/.../client/UserAuthClient.java

### 【差距总结】

- kb-user-auth 源码保留；网关仍指向旧服务
- 运行验收待中间件部署后补

---

## 2026-07-10（P2-2 kb-foundation → kb-core-platform）

### 【本次功能】

1. **复制迁入**：kb-foundation 61 个 Java 类 → `kb-core-platform`（保留原包名 `com.knowledge.base.foundation`）
2. **启动装配**：`CoreApplication` 扫描 foundation；`CorePlatformDataSourceConfig` + MapperScan
3. **配置合并**：MySQL kb_foundation、Redis、RabbitMQ、WebSocket、JWT、`kb-user-auth` Feign
4. **Security**：沿用 foundation `SecurityConfig`，放行 `/ping`、`/modules`

### 【参考文件】

- backend/kb-core/kb-core-platform/src/main/java/com/knowledge/base/foundation/
- backend/kb-core/kb-core-app/src/main/java/com/knowledge/base/core/CoreApplication.java
- backend/kb-core/kb-core-app/src/main/resources/application.yml

### 【差距总结】

- `UserAuthFeignClient` 仍远程调 kb-user-auth（P2-3 改进程内）
- kb-foundation 源码保留未删；网关仍指向旧服务

---

## 2026-07-10（P2-1 kb-core 多模块骨架）

### 【本次功能】

1. **Core BC 骨架**：`backend/kb-core`（iam / document / platform / app）
2. **启动模块**：`kb-core-app` 端口 8090，Nacos 服务名 `kb-core`
3. **健康检查**：`/ping`、`/modules` 子模块列表
4. **Nacos 模板**：`kb-core-dev.yaml.template`

### 【参考文件】

- backend/kb-core/pom.xml
- backend/kb-core/kb-core-app/src/main/java/com/knowledge/base/core/CoreApplication.java
- backend/kb-core/README.md
- backend/pom.xml（新增 kb-core 模块）

### 【差距总结】

- 子模块仅为占位类，尚未迁入 kb-foundation / kb-user-auth / kb-document 业务代码
- 网关仍指向旧三服务，P2-6 再切流

---

## 2026-07-10（P1-7 旧 Intelligence 三服务废弃标记）

### 【本次功能】

1. **DEPRECATED.md**：kb-ai / kb-search / kb-graph 各模块废弃说明与下线清单
2. **启动警告**：`LegacyIntelligenceServiceNotifier` + 三启动类 `@Deprecated`
3. **网关切流脚本**：`kb-gateway/scripts/switch-intelligence-primary.ps1`
4. **文档**：`docs/after/p1-7-legacy-offline.md`；roadmap Phase 1 标记完成

### 【参考文件】

- backend/kb-common/.../LegacyIntelligenceServiceNotifier.java
- backend/kb-ai|kb-search|kb-graph/DEPRECATED.md
- backend/kb-gateway/scripts/switch-intelligence-primary.ps1
- docs/after/p1-7-legacy-offline.md

### 【差距总结】

- 中间件未部署，未执行实际切流与旧进程下线；网关仍 order=0 优先旧路由
- 源码保留（复制不移动），Maven reactor 仍含旧三模块

---

## 2026-07-10（P1-6 网关主路由 + Nacos 模板）

### 【本次功能】

1. **主路由待机**：`kb-intelligence-ai/search/graph-main` → `lb://kb-intelligence`（order=1，不切流）
2. **切流文档**：`backend/kb-gateway/GATEWAY_INTELLIGENCE_CUTOVER.md`
3. **Nacos 模板**：`kb-intelligence-dev.yaml.template`

### 【参考文件】

- backend/kb-gateway/src/main/resources/application.yml
- backend/kb-gateway/GATEWAY_INTELLIGENCE_CUTOVER.md
- backend/kb-intelligence/kb-intelligence-app/src/main/resources/nacos/kb-intelligence-dev.yaml.template

### 【差距总结】

- 未改 order=-1，生产仍走旧三服务；需 Nacos 注册 kb-intelligence 后再切流
- 中间件未部署，未做端到端 curl 验证

---

## 2026-07-10（P1-5b ES mapping 脚本归集）

### 【本次功能】

1. **canonical ES 定义**：`backend/sql/intelligence/es/kb_document_index.json`、`kb_chunk_index.json`
2. **一键脚本**：`create_indices.sh` / `create_indices.ps1`
3. **llm 模块**：删除重复 `kb-chunk-settings.json`，指向 es 目录

### 【参考文件】

- backend/sql/intelligence/es/
- backend/sql/README.md

### 【差距总结】

- Java createIndex 仍内联 mapping，与 JSON 双源（P1-5c 可选统一）
- ES 未部署，脚本未实际 PUT 验证

---

## 2026-07-10（rh-cha 路线图 + P1-5a ES 索引配置统一）

### 【本次功能】

1. **rh-cha-roadmap.md**：Phase 0~3 可执行清单 + 每步自检命令
2. **P1-5a**：`IntelligenceIndexingProperties`（kb-common）；Search/VectorIndex Service 去硬编码
3. **rh-cha.md §六**：实施跟踪表 + 链接 roadmap

### 【参考文件】

- docs/after/rh-cha-roadmap.md
- backend/kb-common/.../IntelligenceIndexingProperties.java
- backend/kb-intelligence/kb-intelligence-retrieval/.../SearchServiceImpl.java
- backend/kb-intelligence/kb-intelligence-llm/.../ElasticsearchVectorIndexServiceImpl.java

### 【差距总结】

- P1-5b mapping 脚本归集、P1-6 网关切流未做
- `@Document(indexName=...)` 注解仍为硬编码，后续 P1-5c 评估

---

## 2026-07-10（backend/sql 全量整理）

### 【本次功能】

1. **目录重组**：`schema/`（DDL）、`data/`（DML）、`migration/`（增量）、`intelligence/`（BC 专用）、`archive/`（历史）
2. **废弃归档**：单库 monolith、export 快照、kb_search/kb_ai/kb_graph(MySQL) 等旧 DDL 移入 `archive/`
3. **安装入口**：`install_all.bat` / `install_all.sh` 对齐新路径 + kb_intelligence
4. **README 重写**：`backend/sql/README.md` 为唯一索引

### 【参考文件】

- backend/sql/README.md
- backend/sql/schema/00_create_databases.sql
- backend/sql/install_all.bat

### 【差距总结】

- `data/init_all.sql` 仍含旧库 kb_ai/kb_search 段落，待后续改为 kb_intelligence
- 项目开发中，还未部署数据库中间件，脚本尚未在真实环境验证

---

## 2026-07-10（Phase 1 P1-DB kb_intelligence 单库规划）

### 【本次功能】

1. **MySQL 单库**：`kb_intelligence` 合并 search + ai 四张表（与代码实体对齐）
2. **SQL 脚本**：`backend/sql/intelligence/`（建库、建表、迁移、statistics 视图）
3. **应用改单数据源**：`application.yml` 指向 `kb_intelligence`；去掉双库 `IntelligenceDataSourceConfig`
4. **计划文档**：intelligence-merge-plan / service-merge-plan 增加「**项目开发中，还未部署数据库中间件**」说明

### 【参考文件】

- backend/sql/intelligence/
- backend/kb-intelligence/kb-intelligence-app/src/main/resources/application.yml
- backend/kb-intelligence/kb-intelligence-app/src/main/java/.../IntelligenceDataSourceConfig.java
- docs/after/intelligence-merge-plan.md
- docs/after/service-merge-plan.md

### 【差距总结】

- SQL 尚未在真实 MySQL 执行（中间件未部署）
- 若已有 kb_search/kb_ai 数据，需按 `02_migrate_from_legacy.sql` 核对源表名后迁移

---

## 2026-07-10（Phase 1 P1-4 kb-ai 迁入）

### 【本次功能】

1. **kb-intelligence-llm**：复制 kb-ai 全量源码（97 Java + mapper/elasticsearch 资源）
2. **进程内集成**：`GraphBuildServiceImpl` 改调同进程 `GraphService.evictAllCaches()`；混合搜索改调 `RagRetrievalService`（删除 `RagSearchFeignClient`）
3. **配置去重**：删除 llm 侧 `AiApplication`、`GraphFeignClient`、`AiSecurityConfig`、重复 ES/MQ 监听工厂；MQ 仅保留 ai 队列绑定
4. **多数据源**：`IntelligenceDataSourceConfig` 分库 `kb_search` / `kb_ai`，mapper XML 分目录 `mapper/search`、`mapper/ai`
5. **网关试点**：新增 `/api/intel-ai/**` → 8091
6. **JDK 21 编译通过**：`mvn compile -pl kb-intelligence/kb-intelligence-app -am`

### 【参考文件】

- backend/kb-intelligence/kb-intelligence-llm/
- backend/kb-intelligence/kb-intelligence-retrieval/src/main/java/.../SearchServiceImpl.java
- backend/kb-intelligence/kb-intelligence-app/src/main/java/.../IntelligenceDataSourceConfig.java
- backend/kb-intelligence/kb-intelligence-app/src/main/resources/application.yml
- backend/kb-gateway/src/main/resources/application.yml

### 【差距总结】

- `DocumentFeignClient` 仍远程调 kb-document（Phase 2 kb-core 合并后再改）
- ES 双索引（kb_document + kb_chunk）统一 Pipeline 待 P1-5
- Nacos `kb-intelligence-dev.yaml`、网关切主路由待 P1-6

---

## 2026-07-10（Phase 1 P1-3 search 迁入）

### 【本次功能】

1. **kb-intelligence-retrieval**：复制 kb-search 全量源码（22 Java + mapper.xml）
2. **合并启动**：app 增加 `@MapperScan`、`@EnableFeignClients`（混合搜索暂调 kb-ai）
3. **MQ 去重**：search 子模块仅声明专属队列，交换机/转换器复用 graph 模块
4. **网关试点**：`/api/intel-search/**` → 8091
5. **JDK 21 编译通过**：`mvn compile -pl kb-intelligence/kb-intelligence-app -am`

### 【参考文件】

- backend/kb-intelligence/kb-intelligence-retrieval/
- backend/kb-intelligence/kb-intelligence-app/src/main/java/.../IntelligenceApplication.java
- backend/kb-gateway/src/main/resources/application.yml

### 【差距总结】

- hybrid 搜索仍走 `RagSearchFeignClient` → kb-ai，P1-4 迁入后改进程内调用
- kb-ai 子模块（P1-4）未开始

---

## 2026-07-10（Phase 1 kb-intelligence 骨架 + graph 迁入）

### 【本次功能】

1. **新建 `backend/kb-intelligence/`** 多模块：app / graph / retrieval / llm
2. **P1-2**：复制 kb-graph 源码至 `kb-intelligence-graph`（35 个 Java 文件，不含原启动类）
3. **kb-intelligence-app**：端口 8091、Nacos 服务名 `kb-intelligence`、`/ping`
4. **网关试点**：`/api/intel-graph/**` → `127.0.0.1:8091`（不覆盖旧 kb-graph 路由）
5. **计划文档**：`docs/after/intelligence-merge-plan.md`

### 【参考文件】

- backend/kb-intelligence/
- backend/pom.xml
- backend/kb-gateway/src/main/resources/application.yml
- docs/after/intelligence-merge-plan.md

### 【差距总结】

- kb-search、kb-ai 尚未迁入（P1-3 / P1-4）
- 需 Nacos 配置 `kb-intelligence-dev.yaml`、本地 JDK 21 编译验证

---

## 2026-07-10（Phase 0 文档生命周期事件驱动）

### 【本次功能】

1. **kb-common**：`DocumentLifecycleEventDTO` / `DocumentLifecycleEventType` / `DocumentLifecycleMQConstants`
2. **kb-document**：`DocumentLifecycleEventPublisher`、`DocumentIndexingTriggerService`（事件优先 + Feign 可选兜底）
3. **改造**：`DocumentServiceImpl`、`DocumentReviewServiceImpl` 索引触发改走 MQ，移除 Feign×4 私有方法
4. **消费者**：kb-ai（RAG+KAG）、kb-search（ES）、kb-graph（Neo4j 删除）
5. **配置**：`document.indexing.event-enabled=true`，`feign-fallback-enabled=false`

### 【参考文件】

- backend/kb-common/src/main/java/com/knowledge/base/common/event/DocumentLifecycleEventDTO.java
- backend/kb-document/src/main/java/com/knowledge/base/document/event/DocumentLifecycleEventPublisher.java
- backend/kb-document/src/main/java/com/knowledge/base/document/service/impl/DocumentIndexingTriggerServiceImpl.java
- backend/kb-ai/src/main/java/com/knowledge/base/ai/mq/DocumentLifecycleListener.java
- backend/kb-search/src/main/java/com/knowledge/base/search/mq/DocumentLifecycleListener.java
- backend/kb-graph/src/main/java/com/knowledge/base/graph/mq/DocumentLifecycleListener.java
- docs/after/service-merge-plan.md

### 【差距总结】

- 本地 Maven 编译需 JDK 21（当前环境 JDK 版本不足未验证 compile）
- 需在 RabbitMQ 可用环境下联调：发布文档 → 观察 ai/search/graph 消费日志
- Phase 1（kb-intelligence 骨架）尚未开始

---

## 2026-07-10（9 服务 → 4 BC 合并计划）

### 【本次功能】

1. **制定微服务合并计划**：9 个运行单元收敛为 4 个有界上下文 + 网关
2. **合并组 A**：kb-ai + kb-search + kb-graph → **kb-intelligence**
3. **合并组 B**：kb-user-auth + kb-document + kb-foundation → **kb-core**
4. **保留独立**：kb-file（Media）、kb-statistics（Analytics）
5. **分 4 阶段**：P0 事件解耦 → P1 Intelligence → P2 Core → P3 统计净化

### 【参考文件】

- docs/after/service-merge-plan.md
- docs/after/cha.md
- docs/after/feat-file-ai-plan.md
- backend/kb-document/.../DocumentServiceImpl.java（Feign 编排源）

### 【差距总结】

- 仅文档规划，尚未创建 kb-intelligence / kb-core 模块
- Phase 0（Document 改事件驱动）为合并前置，需优先实施

---

## 2026-07-10（Feat Nacos/RPC 四模块）

### 【本次功能】

1. **docs/feat 新增四模块**：`feat-discovery-api`、`feat-config-nacos`、`feat-discovery-nacos`、`feat-cloud-rpc`
2. **NacosCloudService**：启动注册/导入配置/关闭注销，SPI 注册 `CloudService`
3. **RpcClientFactory**：`@RpcClient` + `@GetMapping` 动态代理，支持直连 URL 或 Nacos 发现
4. **demo/nacos-rpc**：最小验证工程 + `README-nacos-rpc.md` 本地 install 说明

### 【参考文件】

- docs/feat/feat-discovery-api/
- docs/feat/feat-config-nacos/
- docs/feat/feat-discovery-nacos/
- docs/feat/feat-cloud-rpc/
- docs/feat/README-nacos-rpc.md
- docs/feat/demo/nacos-rpc/

### 【差距总结】

- 需在 `docs/feat` 执行 `mvn install -Dmaven.javadoc.skip=true` 安装到本地仓库
- POST RPC、配置热更新业务接入、kb-file-feat/kb-ai-feat 模块尚未创建

---

## 2026-07-10（kb-feat-file / kb-feat-ai 规划 v2）

### 【本次功能】

1. **重命名并重新规划**：`kb-feat-file`（8184）、`kb-feat-ai`（8186），网关 `/api/feat-file/**`、`/api/feat-ai/**`
2. **分阶段清单**：file（F0~F3）、ai（A0~A4），含 API 级对照表
3. **Feat 底层已完成**：`docs/feat` 四模块已本地 install

### 【参考文件】

- docs/after/feat-file-ai-plan.md（v2 替换清单）
- docs/feat/README-nacos-rpc.md
- backend/kb-file、backend/kb-ai

### 【差距总结】

- backend 两模块尚未创建；Next 5：Nacos + 骨架 + 网关路由

---

## 2026-07-10（deploy Docker 本地编排）

### 【本次功能】

1. **docker-compose**：MySQL/Redis/RabbitMQ/MongoDB/ES/Neo4j/MinIO/Nacos，带 mem_limit/cpu 限制
2. **setup.ps1**：一键启动 + SQL 样例 + Nacos 导入 + MinIO/ES 初始化
3. **配置本地化**：各服务 application.yml 与 nacos 模板改为 127.0.0.1

### 【参考文件】

- deploy/docker-compose.yml、deploy/setup.ps1、deploy/README.md
- backend/kb-*/src/main/resources/application.yml
- backend/nacos/*.template

### 【差距总结】

- 微服务仍 IDE 启动，未容器化
- ES dev 无 IK 插件，init-es 用 standard 分词
- 若本机已占用端口，可改 `deploy/.env` 中 20000-21000 段映射

---

## 2026-07-10（sql 目录精简）

### 【本次功能】

1. **删除** `archive/`、`migration/`、`intelligence/`（全新项目不需要）
2. **扁平化**：`kb_intelligence.sql` 并入 `schema/`；样例数据并入 `data/init_kb_intelligence.sql`；ES 脚本移至 `es/`
3. 文件数 66 → 25

### 【参考文件】

- backend/sql/README.md

### 【差距总结】

- 无

---

## 2026-07-10（SQL/代码按全新项目整理）

### 【本次功能】

1. **SQL 合并**：`kb_statistics.sql` 含日统计 + 浏览历史 + `stat_*` 投影表；删除分散 projection/view 脚本
2. **安装脚本**：`install_all` 仅 DDL；新增 `install_dev_data` 模块化 DML
3. **遗留归档**：`init_all.sql`、迁移脚本、跨库 VIEW 等移入 `sql/archive/`
4. **配置统一**：Intelligence 侧 `kb-document` → `kb-core.url`（8090）；Feign/SearchServiceImpl 同步

### 【参考文件】

- backend/sql/README.md、install_all.bat、install_dev_data.bat
- backend/sql/schema/kb_statistics.sql、00_create_databases.sql
- backend/kb-intelligence/.../DocumentFeignClient.java、SearchServiceImpl.java
- docs/after/p3-2-deployment.md

### 【差距总结】

- `sql/migration/` 保留但标注新环境勿用，后续 ALTER 应回写 schema
- `_archive/` 源码仍保留作对照，不参与构建

---

## 2026-07-10（P3-3 运行手册 + P1-5c ES JSON 单源）

### 【本次功能】

1. **P3-3 运行手册**：`docs/after/p3-3-operations.md`（健康检查、Druid/Nacos/RabbitMQ 面板、故障排查、Prometheus 扩展指引）
2. **P1-5c JSON 单源**：`ElasticsearchIndexDefinitionLoader` + `kb-common/.../elasticsearch/*.json`
3. **createIndex 改造**：`SearchServiceImpl.rebuildIndex`、`ElasticsearchVectorIndexServiceImpl.createIndexIfNotExists` 改读 JSON
4. **默认地址修正**：rebuild 同步文档 API 默认 `8090`（kb-core）

### 【参考文件】

- docs/after/p3-3-operations.md
- backend/kb-common/.../ElasticsearchIndexDefinitionLoader.java
- backend/kb-common/src/main/resources/elasticsearch/
- backend/kb-intelligence/kb-intelligence-retrieval/.../SearchServiceImpl.java
- backend/kb-intelligence/kb-intelligence-llm/.../ElasticsearchVectorIndexServiceImpl.java
- docs/after/rh-cha-roadmap.md

### 【差距总结】

- Actuator/Prometheus 未默认接入，仅文档说明扩展方式
- 修改 mapping 需同步 `sql/es/` 与 `kb-common/.../elasticsearch/` 两处 JSON
- 环境就绪后仅需运行验收（无历史数据迁移）

---

## 2026-07-10（Phase 3 P3-2 部署文档 / Nacos）

### 【本次功能】

1. **Nacos 配置模板归集**：`backend/nacos/` 补齐 gateway/core/intelligence/file/statistics 五份 `*-dev.yaml.template`
2. **4 BC 部署手册**：`docs/after/p3-2-deployment.md`（启动顺序、中间件、MySQL 库、DataId 索引）
3. **SQL 安装脚本更新**：`install_all.bat/.sh` 改用 `kb_statistics_*_projection.sql`，移除废弃跨库 VIEW 脚本
4. **文档同步**：`backend/README.md`、`backend/sql/README.md`、`rh-cha-roadmap.md` 标记 P3-2 ✅

### 【参考文件】

- backend/nacos/README.md
- backend/nacos/kb-*-dev.yaml.template
- docs/after/p3-2-deployment.md
- backend/sql/install_all.bat、install_all.sh
- docs/after/rh-cha-roadmap.md

### 【差距总结】

- 网关 4 BC 路由已在 P2-7 完成，P3-2 聚焦部署与 Nacos，未含运行时验收
- 环境就绪后需补：MQ 投影联调、全链路启动验证（无历史数据）

---

## 2026-07-10（Nacos 账号密码）

### 【本次功能】

1. **本地 Nacos 服务端**：开启鉴权（`nacos.core.auth.enabled=true`），配置 token 密钥与 server identity
2. **AI-RAG 微服务客户端**：全部 Nacos config/discovery 账号密码统一为 `nacos` / `nacos`（原 `susan123`）

### 【参考文件】

- E:/Projects/SVN/yunqu-git/zhongjianjian/nacos-server-2.5.1/conf/application.properties
- backend/kb-ai、kb-file、kb-gateway、kb-search、kb-statistics、kb-user-auth、kb-graph、kb-foundation、kb-document 的 application.yml

### 【差距总结】

- 各服务仍连接远程 `117.72.88.11:8848`，远程 Nacos 需同样启用鉴权且 DB 中用户密码为 nacos/nacos 方可生效
- 修改本地 Nacos 配置后需重启 Nacos 服务

---

## 2026-07-10

### 【本次功能】

1. **Milvus 向量索引第二实现**：新增 `MilvusVectorIndexServiceImpl`，通过 `rag.vector-store=milvus` 切换；`MilvusConfig` 从 Settings/SystemConfigCache 读取 `milvus.host/port`
2. **ES 实现重命名**：`VectorIndexServiceImpl` → `ElasticsearchVectorIndexServiceImpl`，条件装配 `rag.vector-store=elasticsearch`（默认）
3. **RRF 融合抽取**：新增 `HybridSearchFusion` 供 ES/Milvus 共用
4. **S3 存储泛化**：`RustFileStorage` → `S3FileStorage`，`StorageType.S3`，配置键 `file.storage.s3`（兼容旧 `rustfs`）
5. **断点续传接口**：新增 `ResumableFileStorage`，`FileServiceImpl` 不再依赖具体实现类

### 【参考文件】

- backend/kb-ai/src/main/java/com/knowledge/base/ai/rag/service/impl/MilvusVectorIndexServiceImpl.java
- backend/kb-ai/src/main/java/com/knowledge/base/ai/rag/service/impl/ElasticsearchVectorIndexServiceImpl.java
- backend/kb-ai/src/main/java/com/knowledge/base/ai/rag/support/HybridSearchFusion.java
- backend/kb-ai/src/main/java/com/knowledge/base/ai/config/MilvusConfig.java
- backend/kb-file/src/main/java/com/knowledge/base/file/storage/S3FileStorage.java
- backend/kb-file/src/main/java/com/knowledge/base/file/config/S3ClientConfig.java
- backend/docs/向量索引与对象存储架构.md
- backend/kb-foundation/.../SettingsServiceImpl.java
- backend/sql/init_data.sql、init_kb_foundation.sql

### 【差距总结】

- Settings 页 `vectorStoreType` 写入 `rag.vector.store`，切换向量后端仍需同步 yml/环境变量并重启 kb-ai（未做运行时热切换）
- Milvus 模式下的关键词检索使用 VARCHAR `like` 近似 BM25，精度低于 ES ik 分词
- 前端文档页仍保留 RustFS URL 过滤逻辑，功能不受影响
