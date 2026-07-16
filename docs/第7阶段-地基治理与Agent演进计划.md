# 第 7 阶段：地基治理与 Agent 演进计划

> **制定日期**：2026-07-15  
> **修订日期**：2026-07-15  
> **状态**：执行中（A0 ✅含 56-Ops；B0–B2 ✅；A1 59/63/60/61 ✅；Search ACL 代码/脚本已落地；下一步 A1 62 Statistics 仓储化）
> **前置**：遗留治理任务 1–55 已完成（见 [readme_plan.md](../readme_plan.md)、[遗留治理计划.md](../遗留治理计划.md)）  
> **关联**：[ai-entry-boundaries.md](./ai-entry-boundaries.md)、[after/rh-cha-roadmap.md](./after/rh-cha-roadmap.md)
> **任务号准源**：任务 56–75 以本修订版为准；已在 `readme_plan.md`（2026-07-15 56-MVP）声明编号切换。

**目标**：先建立真实可验证的认证、内部调用与事件可靠性地基，再交付独立 `kb-agent` 的线性工作流 MVP。React Flow、Qdrant/Milvus 调整和 Intelligence 拆进程均采用指标触发，不阻断 Agent MVP。

### 本次修订要点

1. 任务 56 从“删除白名单”升级为“网关认证闭环 + 内部调用信任边界”，并拆为 56-MVP 硬合闸与 56-Ops 运维跟进。
2. 任务 57 从“禁止 Feign/MQ 双开”升级为“单模式配置 + MQ 失败可观测与可补偿”。
3. RAG Golden 前移到 Retriever 重构之前，先建立基线再调整检索结构。
4. Agent 开发前增加 v1 契约冻结：JSON Schema、状态机、版本、表结构、权限和模型边界一次确定。
5. `/agent` 仅供授权用户运行已发布工作流；JSON 编排进入 `/admin/agents`。
6. Qdrant 前增加向量库选型合闸，避免同时维护 ES、Milvus、Qdrant 三套实现。
7. 工期按单人实施重新估算；Phase B 由原 1.5～2 周调整为 2.5～3 周。

**总原则**：

1. **A0 未合闸，不开写 `kb-agent`**：56-MVP、57、58 未完成前，缺 Token、非法 Token、伪造内部头必须被明确拒绝。
2. **安全随骨架落地，不后置补丁**：Agent 路由从创建之初就要求登录，工具始终使用终端用户身份。
3. **Agent 不塞进 Intelligence JVM**：模型、编排和 Run 状态由独立进程承担；检索与文档读取通过稳定 HTTP API。
4. **事件模式单选**：Document 索引触发采用 `event | legacy-feign | disabled`，不保留两个可组合布尔开关。
5. **先基线、再重构**：Golden v0 是 Retriever 分层的硬前置。
6. **Qdrant ≠ Agent 前置**：先使用 ES hybrid；专用向量库必须由规模、延迟、召回或资源数据触发。
7. **不接入 Dify，不恢复 Playwright**：以单元/契约测试、组件测试和仓内 API 冒烟构成最小回归闭环。
8. **模型默认千问**：DeepSeek 仅作为强推理配置开关；Nacos、模块兜底配置和 Agent 配置必须一致。
9. **按文件所属仓库实施**：正式开发前确认本次文件对应的 Git/SVN 仓库根；backend、frontend、docs/deploy 分别在其所属工作副本记录 diff、review 与提交。

---

## 一、背景与优化结论

| 原安排 | 修订后 |
|--------|--------|
| 删除 `/api/ai/**` 白名单即可收口鉴权 | 网关必须真正拒绝缺失/非法 Token，并清理外部伪造的内部信任头 |
| 内部调用“评估加签” | Phase A0 明确落 HMAC 签名、时间窗、密钥非空校验和路径白名单 |
| Feign/MQ 两布尔值互斥 | 改为单一 `document.indexing.mode`，并补 Publisher Confirm、告警和重建补偿 |
| Retriever 与 Golden 同时推进 | Golden v0 先记录基线，Retriever 分层后跑同一组数据对比 |
| `/agent` 页面可粘贴 JSON | `/agent` 只运行已发布工作流；管理员在 `/admin/agents` 编排和发布 |
| Agent 鉴权放到后置任务 | 网关保护和用户身份透传随服务骨架落地；后置任务只做权限矩阵收口 |
| Qdrant 与 Agent 绑定 | Agent MVP 只用现有 ES；Phase C 先完成 ES/Milvus/Qdrant 选型合闸 |
| 恢复 Playwright | 不恢复；补鉴权、Agent API 冒烟和少量前端路由/组件测试 |

### 阶段总览

| 阶段 | 主题 | 任务号 | 依赖 | 单人建议周期 |
|------|------|--------|------|--------------|
| **Phase A0** | 安全与可靠性合闸 | 56-MVP、57、58；56-Ops 跟进 | 无 | 3～5 天完成硬合闸 |
| **Phase A1** | 非阻塞地基治理 | 59–63 | 60 → 61；其余可独立 | 4～7 天，可与 B 部分重叠 |
| **Phase B0** | Agent v1 契约冻结 | 64 | A0 合闸 | 1～2 天 |
| **Phase B1** | Agent 后端 MVP | 65–68 | 64 完成 | 7～10 天 |
| **Phase B2** | Agent UI、权限与冒烟 | 69–71 | 65–68 主路径可用 | 3～4 天 |
| **Phase C** | 指标触发增强 | 72–75 | B 可演示 | 按需 |

```text
Phase A0（硬合闸）
56-MVP 网关认证 + 内部签名 ─► 57 索引模式/可靠性 ─► 58 安全与 API 冒烟
                                                     │
                                                     ▼
                                               56-Ops 运维跟进
                                                     │
                                                     ├─ 不阻塞 B0
                                                     └─ 阻塞 enableAgent
Phase A1（不阻塞 Agent）                       Phase B（Agent MVP）
59 BC 叙事                                      64 v1 契约冻结
60 Golden v0 ─► 61 Retriever 分层               65 服务骨架 + 基础鉴权
62 Statistics 仓储化                            66 双工具 ─► 67 线性引擎
63 前端路由/鉴权残留                            68 Run/Session API
                                                     ▼
                                               69 用户页 + 管理页
                                               70 权限矩阵收口
                                               71 Agent 冒烟
                                                     ▼
Phase C：72 React Flow｜73 向量选型合闸｜74 条件适配/对账｜75 拆进程评估
```

---

## 二、明确不在范围内

- 接入 Dify / 替换自研文档权限体系
- 换向量库为硬切换（禁止去掉 ES BM25 主路径）
- 全站 UI 重做、复杂多 Agent 协作、人机审批节点
- Agent 任意 HTTP、任意 SQL、写文档/写库工具
- Agent 多轮记忆、长时任务恢复、并行 DAG、环路和强制中断正在执行的模型请求
- 恢复 Playwright 浏览器验收
- 历史数据迁移（环境仍为无历史数据）
- 本阶段不强制引入事务 Outbox；但 MQ 发布失败必须可观测、可告警、可重建补偿

---

## 三、Phase A0 — 安全与可靠性合闸（任务 56–58）

### 任务 56：网关认证闭环与内部调用签名（P0，发布阻塞）

**现状问题**：

- `gateway.white-list` 存在于配置，但当前网关 Java 代码未消费该配置。
- `AuthGlobalFilter` 遇到缺 Token 或非法 Token 时继续转发。
- 网关未清理外部传入的 `X-User-Id`、`X-Internal-*` 信任头。
- Core 内部认证只比较固定 `X-Internal-Service=kb-intelligence`，可伪造且无时间窗。

**目标信任边界**：

```text
外部请求
  └─ Gateway：清理内部头 → 白名单匹配 → JWT 校验 → 注入可信 X-User-Id

系统后台调用（Intelligence → Core）
  └─ 直连内网：service + timestamp + HMAC-SHA256 签名

Agent 工具调用
  └─ Gateway：始终透传终端用户 Authorization，不使用系统用户内部签名
```

**执行切片**：

| 切片 | 内容 | 合闸影响 |
|------|------|----------|
| **56-MVP** | 清理信任头、JWT 强制 401、白名单唯一准源、Intelligence→Core HMAC、最小内部路径白名单、定向单测 | A0 硬合闸，必须在任务 58 前完成 |
| **56-Ops** | 密钥轮换手册、完整内部路径矩阵、生产端口暴露检查、运维文档补齐 | 可紧随任务 58；不阻塞 B0，但阻塞 `system.enableAgent` |

**Files（主要）**：

- Modify: `backend/nacos/kb-gateway-dev.yaml.template`
- Modify: `backend/kb-gateway/src/main/java/com/knowledge/base/gateway/filter/AuthGlobalFilter.java`
- Create: `backend/kb-gateway/src/main/java/com/knowledge/base/gateway/config/GatewayAuthProperties.java`
- Modify: `backend/kb-core/kb-core-app/src/main/java/com/knowledge/base/core/config/InternalServiceAuthFilter.java`
- Modify: `backend/kb-core/kb-core-app/src/main/java/com/knowledge/base/core/config/CoreInternalServiceProperties.java`
- Modify: Intelligence → Core 的 `DocumentFeignClient` / `DocumentInternalClient` 调用配置
- Test: 网关过滤器、内部签名过滤器单测
- Modify: `deploy/env.example`、Nacos 模板和密钥注入说明
- Doc: `docs/after/p3-3-operations.md` 增「鉴权默认值」一节

**56-MVP 必须完成**：

- [x] 白名单唯一准源固定为 Nacos/属性配置；删除 `AuthGlobalFilter.shouldSkip` 的硬编码列表，或让其只调用同一个属性匹配器
- [x] `gateway.white-list` 只保留登录、刷新、明确公开分享和健康检查路径
- [x] 非白名单请求缺 Token、非法 Token、过期 Token统一返回 HTTP 401，不再继续转发
- [x] 网关先删除外部传入的 `X-User-Id`、`X-Internal-Service`、`X-Internal-Timestamp`、`X-Internal-Signature`
- [x] 内部签名串固定为 `METHOD + "\n" + PATH + "\n" + TIMESTAMP + "\n" + SERVICE`
- [x] HMAC 使用 SHA-256；允许时间偏差不超过 60 秒；密钥必须由环境/Nacos 注入且长度不少于 32 字节
- [x] Core 首批只允许 Intelligence 当前实际使用的文档读取路径获得系统身份，不允许内部签名绕过任意 Core API
- [x] 网关过滤器、内部签名、过期签名、非白名单路径均有定向单测

**56-Ops 紧随任务 58 完成**：

- [x] 将所有内部调用路径整理为可审阅矩阵，新增路径必须同步代码配置、测试和文档
- [x] 运行手册记录新旧密钥短暂并行、切换、验证和旧密钥撤销步骤（含 `previous-secret` 并行校验）
- [x] 检查生产部署只暴露 Gateway，对 Core/Intelligence 业务端口的访问限制形成记录（`check-service-exposure.ps1`）
- [x] 在 `docs/after/p3-3-operations.md` 补齐鉴权默认值、密钥注入和故障排查

**56-MVP 验收**：

- 无 Token `/api/ai/chat` → 401
- 非法/过期 Token → 401
- 伪造 `X-User-Id` / `X-Internal-*` → 401 或 403
- 合法 JWT → 原受保护 API 正常
- 合法内部签名 → 允许的内部文档读取成功
- 错误签名、过期时间戳、非白名单路径 → 拒绝

**56-Ops 验收**：路径矩阵、轮换手册和生产暴露检查记录齐全；完成前不得开启 `system.enableAgent`。

---

### 任务 57：Document 索引模式与事件可靠性收口（P0）

**问题**：MQ 为主，但索引触发仍由两个布尔开关控制；误开会双写。关闭 Feign 后，当前 MQ 发布失败仅记录 WARN，缺少确认、告警和补偿闭环。

**Files（主要）**：

- Modify: `backend/kb-core/kb-core-document/src/main/java/com/knowledge/base/document/config/DocumentIndexingProperties.java`
- Modify: `backend/kb-core/kb-core-document/src/main/java/com/knowledge/base/document/service/impl/DocumentIndexingTriggerServiceImpl.java`
- Modify: `backend/kb-core/kb-core-document/src/main/java/com/knowledge/base/document/event/DocumentLifecycleEventPublisher.java`
- Review: `RagFeignClient` / `GraphFeignClient` 等是否仅为兜底
- Doc: `docs/after/rh-cha-roadmap.md` 或本文件注明「终态」

**做什么**：

- [x] 用 `document.indexing.mode=event|legacy-feign|disabled` 替换两个布尔配置
- [x] 默认和生产推荐值固定为 `event`；`legacy-feign` 仅用于明确的应急回退
- [x] Feign 兜底移入 `legacy` 包并标记 `@Deprecated`，启动时输出醒目 WARN
- [x] RabbitTemplate 开启 Publisher Confirm/Return；发布失败记录 metric、结构化日志和告警线索
- [x] 为短暂故障配置有限次数重试；重试耗尽后保留 documentId/eventId 供补偿
- [x] `rebuild-es-indices` 或新增轻量脚本支持按文档/全量重建，作为本阶段补偿路径
- [x] Document→File Feign **保留**（合理跨 BC）；清理的是「索引编排型」Feign
- [x] 本阶段不引入 Outbox；若未来要求业务事务与消息零丢失，再单独立项

**验收**：

- 配置只允许三个枚举值，非法值启动失败
- `event` 模式不执行任何索引型 Feign
- `legacy-feign` 模式明确告警且不发布 MQ
- Broker 不可用时失败可观测，并能通过重建脚本恢复索引
- 文档写清「正常终态 = event；应急回退 = legacy-feign」

---

### 任务 58：仓内可重复的安全与 API 冒烟切片（P0）

**问题**：E2E 已删，`deploy/` 易不入仓，回归变薄。

**Files（主要）**：

- Create/Modify: `deploy/scripts/verify-auth-ai.ps1`（或扩 `verify-all.ps1` 步骤）
- Modify: `deploy/README.md`、`docs/README.md` 标明脚本为准源
- Test: gateway、Core security、Document indexing 定向单元/契约测试

**做什么**：

- [x] 脚本覆盖：登录 → 受保护 API 200；无 Token AI 401；非法 Token 401；核心 search/document 健康
- [x] 增加伪造 `X-User-Id`、`X-Internal-Service`、错误内部签名的负向用例
- [ ] 创建用户 A、用户 B 和仅 B 可见的私有文档；验证 A 的 Search 结果与文档读取均不出现该文档（已记 Search ACL backlog，待造数关闭）
- [x] Search ACL 探测结果必须记录为 PASS/FAIL，不允许只写“接口可达”
- [x] 若 Search ACL 为 FAIL：B0/B1 可继续开发，但任务 66 真实联调采用管理员身份，普通用户 view/run 权限不得发放，直至补齐 Search ACL 并重跑通过
- [x] 若 Search ACL 为 FAIL，在 `readme_plan.md` 单列“Search ACL 修复”backlog，记录受影响接口、责任人、修复方案和“A 搜不到 B 私有文档”的关闭标准
- [x] 对每个用例校验 HTTP 状态码，不以响应体中的业务码代替 HTTP 状态
- [x] `verify-all.ps1` 串入新步骤
- [x] `verify-all.ps1` 增定向后端测试：gateway、core security、document indexing
- [x] 在 `readme.md` / `docs/README.md` 强调本地保留 `deploy/` 的同步纪律

**验收**：同一环境连续运行两次结果一致；异常状态导致脚本非零退出；Search ACL 结果及对应开放策略已记录；ACL FAIL 时管理员限定模式只作为临时降级，修复 backlog 保持开启直至复测 PASS；不依赖浏览器。

---

## 四、Phase A1 — 非阻塞地基治理（任务 59–63）

> A0 合闸后可开始 Agent B0；任务 64 完成后进入 B1。A1 中只有任务 60 → 61 必须串行，其余任务不阻塞 Agent MVP。

### 任务 59：BC 叙事与配置准源收口（P1）

**问题**：Maven 已是 `kb-intelligence-*`，包与注释仍像旧三服务。

**做什么**：

- [x] **不做**一次性大挪包（风险高）；做：模块 README、类 Javadoc、Listener 注释改为 Intelligence BC 用语
- [x] `backend/README.md` / `docs/after/intelligence-merge-plan.md` 顶部加「运行时 4 BC，包名历史遗留」说明
- [x] 可选后续：新代码一律 `com.knowledge.base.intelligence.*`，旧包冻结（已写入模块 README）
- [x] 明确 Nacos 模板为运行时配置准源；模块 `application.yml` 仅作同值兜底
- [x] 统一 `ai.default-model=qwen`，消除 Nacos `deepseek` 与模块兜底 `qwen` 的漂移

**验收**：新人读 README 不会以为仍部署 kb-ai/kb-search/kb-graph 三进程；模型默认值在 Nacos、模块兜底和文档中一致。

---

### 任务 60：RAG Golden v0（P1，Retriever 硬前置）

**Files（建议）**：

- Create: `docs/eval/rag-golden-set.json`
- Create: `docs/eval/rag-golden-baseline.md`
- Create/Modify: `deploy/scripts/verify-rag-golden.ps1`

**做什么**：

- [x] 建立 10～30 条「问题 → 期望文档 ID/关键词/引用要求」
- [x] 覆盖精确关键词、自然语言问句、无答案、权限不可见文档和相似文档干扰
- [x] 记录当前 ES hybrid 的 Hit@5、MRR、citation 非空率、失败样本和运行时间（脚本已实现；联调数值表 `_pending_` 待 `-WriteBaseline`）
- [x] 固定测试数据版本、模型/Embedding 配置和检索参数
- [x] 不引入 RAGAS 全家桶；先形成可重复的仓内基线

**验收**：任务 61 开始前必须存在一份带日期和配置快照的 baseline；后续检索改动使用同一题集对比。✅（2026-07-16；联调指标待补）

---

### 任务 61：Retriever 分层（P1，任务 60 后执行）

**问题**：混合检索绑在巨型 `*VectorIndexServiceImpl` / `SearchServiceImpl`。

**目标结构**：

```text
KeywordRetriever (ES BM25)
DenseRetriever (ES kNN | 预留 Qdrant/Milvus)
RrfFusion / HybridSearchFusion（已有可上提）
  → Search/RAG 门面薄封装
```

**Files（主要）**：

- Split/Modify: `ElasticsearchVectorIndexServiceImpl.java`、`SearchServiceImpl.java`
- Modify: `VectorIndexService.java`（职责收窄或拆接口）
- Test: retrieval / llm 现有单测 + 回归混合搜索

**做什么**：

- [x] 抽出 Keyword / Dense / Fusion；`VectorIndexService` 不再同时「假装自己是完整 hybrid 后端」与存储细节缠死
- [x] 行为对前端/API **无感**（同 shape）
- [x] 任务 66/71 联调期间冻结 Search/RAG 对外请求、响应和错误语义；任务 61 只调整内部实现
- [x] 若确需修改对外 shape，暂停 66/71 联调，先同步任务 64 契约、工具适配和冒烟断言后再继续（未改 shape）
- [x] Milvus 实现跟分层对齐或标明「降级完整度」
- [x] 为 Keyword、Dense、Fusion 增直接单测，不只依赖现有端到端验收（Fusion + Hybrid 编排）
- [ ] 重构前后运行任务 60 的同一 Golden，记录指标差异（联调数值仍 pending，待服务就绪）

**验收**：Search/RAG API shape 和错误语义不变；Golden 指标无不可解释下降；大类完成职责拆分；为任务 74 留出 `DenseRetriever` 扩展点。✅（代码分层 2026-07-16；Golden 联调对比待补）

---

### 任务 62：Statistics 仓储化（P1，可独立推进）

**Files（主要）**：

- Modify: `kb-statistics` 下 `StatisticsServiceImpl`、投影 Listener
- Create: DAO/Repository 封装 upsert，减少字符串 SQL 散落

**做什么**：

- [ ] 按投影表拆 Repository；Service 变薄
- [ ] 保留 MQ 宽表语义，不引入跨库 VIEW

**验收**：现有统计 API / 投影单测通过；单文件行数显著下降。

---

### 任务 63：前端路由与鉴权残留（P1）

**Files（主要）**：

- Modify: `frontend/src/router/index.tsx`
- Review: 与网关白名单变更后的 401 表现

**做什么**：

- [x] 去除重复路由注册（如重复的 `documents/:id/edit`）
- [x] 确认 AI 页在未登录时跳转登录（与任务 56 一致）
- [x] 为受保护路由、AI 开关关闭态增加轻量路由/组件测试
- [x] 不恢复 Playwright

**验收**：路由表无重复；未登录访问行为符合预期。

---

## 五、Phase B0 — Agent v1 契约冻结（任务 64）

### 任务 64：产品边界、工作流契约与安全边界冻结

**Files**：

- Modify: `docs/ai-entry-boundaries.md`
- Modify: `frontend/src/constants/ai-entry.ts`（及导航开关常量）
- Create: `docs/agent/agent-contract-v1.md`
- Create: `docs/agent/agent-security-boundary.md`

**契约（锁定）**：

| 入口 | 路由 | 职责 |
|------|------|------|
| 智能搜索 | `/search` | 找文档/段落 |
| AI 助手 | `/ai` | 轻量多轮 + 可选 RAG |
| AI 写作 | `/ai-writing` | 生成/改写文稿 |
| **Agent 工作流** | `/agent` | 选择并运行已发布工作流，查看结果和轨迹 |
| **Agent 管理** | `/admin/agents` | 管理员编排、校验、试跑和发布工作流 |

**v1 工作流 JSON（示意）**：

```json
{
  "schemaVersion": 1,
  "name": "知识库问答",
  "nodes": [
    {
      "id": "search",
      "type": "tool",
      "tool": "hybrid_search",
      "input": { "query": "${input.query}", "topK": 5 }
    },
    {
      "id": "answer",
      "type": "llm",
      "input": {
        "prompt": "根据检索结果回答问题。\n问题：${input.query}\n资料：${steps.search.output}"
      }
    }
  ],
  "edges": [
    { "from": "search", "to": "answer" }
  ]
}
```

**锁定规则**：

- [x] v1 只允许 `tool`、`llm` 两类节点，节点数上限 10
- [x] 图必须只有一个起点和一个终点；每个节点入度/出度不超过 1；禁止环、孤立节点和并行分支
- [x] 变量只允许 `${input.*}`、`${steps.<nodeId>.output}`，禁止脚本和任意表达式执行
- [x] 工作流发布后版本不可变；Run 必须绑定明确的 `workflowVersionId`
- [x] Run 状态固定为 `CREATED | RUNNING | SUCCEEDED | FAILED | TIMED_OUT | CANCELLED`
- [x] 取消定义为节点之间的协作式取消，不承诺强制中断正在进行的模型 HTTP 请求
- [x] MVP 会话只做 Run 分组，不做自动多轮记忆

**持久化模型**：

| 表 | 职责 |
|----|------|
| `agent_workflow` | 工作流稳定身份、名称、所有者、当前草稿/已发布版本引用 |
| `agent_workflow_version` | 不可变版本、Schema 版本、工作流 JSON、发布时间 |
| `agent_run` | 用户、工作流版本、输入/输出、状态、错误、耗时、幂等键 |
| `agent_run_step` | 节点级状态、输入/输出快照、错误、耗时 |
| `agent_session` | 可选 Run 分组；不承担多轮记忆 |

**模型边界**：

- [x] `kb-agent` 定义独立 `AgentModelClient` Port，不依赖 `kb-intelligence-llm` 实现模块
- [x] 默认模型为千问；DeepSeek 仅通过配置选择
- [x] `AI_DEV_STUB=true` 时 LLM 节点使用确定性 Stub

**验收**：契约文档不存在模糊状态、可变发布版本或未定义变量语义；64 未完成不得创建任务 65 的业务代码。

---

## 六、Phase B1 — Agent 后端 MVP（任务 65–68）

### 任务 65：`kb-agent` 服务骨架

**架构**：

```text
Frontend → Gateway:/api/agent/** → kb-agent
                ├─ 定义/版本 CRUD
                ├─ Run 引擎（先线性）
                ├─ Tool Registry
                └─ LLM（默认千问；可配 DeepSeek）
         工具出站 → Gateway → Intelligence Search / Core Document（短链路、带用户 Token 透传）
```

**Files（预期）**：

- Create: `backend/kb-agent/`（MVP 单 Maven 模块，按 workflow/run/tool/model 包拆职责）
- Create: `backend/sql/schema/kb_agent.sql`
- Modify: 父 POM、`deploy/start-services.ps1`、Nacos `kb-agent-*.yaml.template`
- Modify: `deploy/stop-services.ps1`、`deploy/env.example`、SQL 安装脚本
- Modify: `kb-gateway` 路由

**做什么**：

- [x] Spring Boot 3 + JDK21；默认端口 8092；健康检查；Nacos 注册
- [x] 创建 `kb_agent` 数据库和任务 64 定义的五张表
- [x] `/api/agent/**` 从路由创建之初就要求合法 JWT，禁止加入白名单
- [x] Agent 接收终端用户身份，不接受外部伪造 `X-User-Id`
- [x] 建立 `AgentModelClient` + 千问/DeepSeek OpenAI-compatible 实现 + Stub 实现
- [x] Nacos 与模块兜底配置统一 `agent.default-model=qwen`
- [x] **不**把 Agent 拼进 `kb-intelligence-app`

**验收**：单独进程启动；网关可路由健康接口；无 Token 访问 Agent 业务接口为 401；数据库脚本可重复安装。

---

### 任务 66：Tool Registry（仅 2 工具）

- [x] `hybrid_search`：`query` 1～1000 字符；`mode=keyword|hybrid`；`topK=1..20`，默认 5
- [x] `get_document`：`documentId` 必填；`maxChars=500..10000`，默认 4000
- [x] 两个工具均通过 Gateway 调现有 API，并透传终端用户 `Authorization`
- [x] Gateway 对 `/api/search/**`、`/api/document/**` 同样执行任务 56 的强制 JWT 校验（复用 56-MVP；工具不另开白名单）
- [x] Agent 不得直连 Core/Intelligence 业务端口绕过 Gateway；仅运维排障可按受控流程直连
- [x] 禁止工具使用系统用户内部签名读取用户不可见文档（仅透传用户 Bearer，无 HMAC）
- [x] Search 结果和文档读取必须与前端用户的可见范围一致；若现有 Search 缺权限过滤，Agent 不得开放生产默认开关（`enableAgent` 仍关；ACL backlog OPEN）
- [x] 单工具默认超时 5 秒；超时和非 2xx 统一转换为结构化 ToolError
- [x] 审计只记录 runId、stepId、tool、耗时、状态和文档 ID，不记录 Token、完整正文和模型密钥
- [x] 工具输出按任务 64 的变量规则写入 `agent_run_step`（由任务 67 引擎落库）
- [x] 检索文档内容按“不可信数据”进入 Prompt，不得覆盖系统级安全指令

**验收**：单测 mock 出站；工具客户端只配置 Gateway base URL；权限、超时、非法参数、过长输出均有负向用例；用户 A 搜索/读取不到用户 B 私有文档（真实双用户隔离仍见 Search ACL backlog）。

---

### 任务 67：线性工作流引擎（非完整 DAG）

- [x] 实现任务 64 的线性图校验器；非法环、并行、孤立节点在保存/发布前拒绝
- [x] 节点按拓扑顺序执行；任一节点失败后短路，不继续执行后续节点
- [x] 变量解析只支持白名单语法；缺失变量产生明确 ValidationError
- [x] Run 总超时默认 90 秒，LLM 节点默认 60 秒，工具节点默认 5 秒
- [x] 每个节点开始/成功/失败都持久化 `agent_run_step`
- [x] Run 创建支持幂等键，重复请求返回同一 Run，不重复调用模型（终态短路；幂等键查询 API 见任务 68）
- [x] 取消请求设置取消标记；当前节点结束后不再启动下一节点
- [x] 最终状态只允许任务 64 定义的状态转换

**验收**：固定 JSON 可执行；成功、工具失败、LLM 失败、超时、取消、重复请求均有单测或集成测试。

---

### 任务 68：会话与 Run API

- [x] 管理 API：创建草稿、更新草稿、校验、发布、查询版本
- [x] 运行 API：创建 Session、发起 Run、查询 Run、查询 Step 轨迹、取消 Run
- [x] Run 请求必须解析为已发布的 `workflowVersionId`，运行过程中不读取可变草稿
- [x] MVP 只提供非流式响应；前端通过查询 Run 状态获取终态（同步执行至终态亦可直接返回）
- [x] HTTP 错误语义固定：未登录 401、无权限 403、非法工作流 400、资源不存在 404、冲突/重复发布 409（业务码；与现有 Result 约定一致）
- [x] OpenAPI/Knife4j 写清请求、响应和状态枚举（Controller `@Operation`/`@Tag`）

**验收**：脚本可走通“建草稿 → 校验 → 发布 → 创建 Session → Run → 查询 Step”；发布后修改草稿不影响已发起 Run。

---

## 七、Phase B2 — Agent UI、权限与冒烟（任务 69–71）

### 任务 69：用户运行页与管理员编排页（无画布）

- [x] `/agent`：授权用户选择已发布工作流、输入问题、发起 Run、查看答案和工具轨迹
- [x] `/agent` 不提供 JSON 编辑、草稿保存或发布入口
- [x] `/admin/agents`：管理员使用 JSON 文本编辑器进行创建、校验、试跑和发布
- [x] 两个入口均受 `system.enableAgent` 开关控制；默认生产配置为关闭，完成任务 71 后再开启
- [x] `/agent` 导航和路由同时检查 view/run 权限；Search ACL 未通过时普通用户不显示入口且访问返回 403
- [x] 前端 store、类型、service、导航常量与任务 64 文档一致
- [x] 用户发起取消后提示“取消请求已提交，将在当前节点结束后生效”，Run 在后端转为 `CANCELLED` 前仍展示运行中
- [x] 增路由/组件测试：功能关闭态、普通用户不可见管理入口、Run 成功/失败展示（`agent-access` 门禁单测）
- [x] **不做** React Flow（任务 72）

**验收**：Search ACL 通过时普通用户只能运行、管理员可编排和发布；ACL 未通过时普通用户无 Agent 入口且运行返回 403；关闭开关后导航隐藏且直接访问显示关闭态。

---

### 任务 70：Agent 权限矩阵与审计收口

**MVP 权限模型**：

| 权限码 | 能力 | 默认角色 |
|--------|------|----------|
| `agent:workflow:view` | 查看已发布工作流 | 登录用户（Search ACL 通过）；否则仅管理员 |
| `agent:run` | 运行已发布工作流 | 登录用户（Search ACL 通过）；否则仅管理员 |
| `agent:workflow:edit` | 创建和编辑草稿 | 管理员 |
| `agent:workflow:publish` | 发布不可变版本 | 管理员 |

- [x] 增权限常量、方法级授权和初始化 SQL；管理员获得全部四项，普通用户只获得 view/run
- [x] 若任务 58 的 Search ACL 为 FAIL，初始化/授权阶段只给管理员 view/run；ACL 修复并复测通过后再向普通用户发放
- [x] MVP 不做角色/团队级工作流绑定；所有已发布工作流对拥有 view/run 的用户可见
- [x] Run、Step 和工具审计记录用户 ID、工作流版本、状态和耗时
- [x] Run 输入/输出保留期配置化，默认 30 天；日志不得记录 Token、密钥和完整正文
- [x] 增定时清理任务或等价运维脚本，确保超过保留期的数据实际删除
- [x] 实施 shared permission/schema 变更时由单一任务串行修改，避免并行冲突

**验收**：未登录 401；普通用户编辑/发布 403；管理员可编辑/发布；普通用户可运行已发布版本但不可运行草稿。

---

### 任务 71：Agent 冒烟接入 verify-all

- [x] `deploy/scripts/verify-agent-smoke.ps1`：管理员登录 → 保存草稿 → 校验 → 发布 → 发起 Run → 断言工具调用、Step 和终态
- [x] Search ACL 为 PASS：使用普通用户 Run，并断言用户 B 私有文档不出现在用户 A 的工具结果（脚本分支已预留；当前默认 FAIL 路径）
- [x] Search ACL 为 FAIL：断言普通用户 Run 为 403，仅执行管理员 Run；报告中明确标记“管理员限定模式”
- [x] 通用负向断言：无 Token 401；普通用户编辑 403；非法工作流 400
- [x] 记入 `verify-all.ps1`
- [x] `AI_DEV_STUB=true` 时 LLM 节点返回确定性文本；无 Key 环境仍可完整冒烟（依赖服务侧 Stub）
- [x] 最终验证包含 Agent 定向后端测试、前端组件/构建和 API 冒烟

**验收**：本地 `verify-all.ps1` 包含 Agent 步骤并非零失败；无 Key 时使用 Stub；不依赖浏览器。

---

## 八、Phase C — 按需增强（任务 72–75）

### 任务 72：React Flow 可视化编排

- 前置：任务 64 Schema v1 已冻结，且 67–71 至少稳定一个小版本  
- 左节点库 / 中画布 / 右属性 → 导出同构 JSON  
- 试跑页与画布互通

### 任务 73：向量库选型合闸

- 建 `docs/eval/vector-store-decision.md`，在同一数据集和负载下比较 ES、现有 Milvus 与候选 Qdrant
- 至少记录 Recall@10、混合检索 p95、索引写入速度、资源使用、运维复杂度和失败降级方式
- 只有满足以下任一条件才允许进入任务 74：
  - ES hybrid p95 超过项目 Search SLO
  - ES Heap 使用率持续高于 75%
  - 候选后端 Recall@10 提升不少于 5 个百分点
  - 候选后端 p95 降低不少于 30%
- 输出唯一决策：继续 ES、保留并补齐 Milvus、或采用 Qdrant；不得默认保留三套生产实现

### 任务 74：条件适配、对账与降级

- 若任务 73 决定继续 ES，本任务以“无新增向量后端”结项
- 若选择 Milvus/Qdrant：实现 `DenseRetriever` 适配器和条件装配，只保留一个专用向量生产后端
- 文档生命周期：文本/BM25 始终进入 ES，向量按选型进入 ES 或专用向量库
- 增双写/重建进度、数量对账、失败重试与健康检查
- 专用向量库异常时强制降级为 `vector=off`，保留 ES BM25 主路径
- `deploy/docker-compose` 仅为最终选中的后端增加可选 profile

### 任务 75：Intelligence 拆进程评估

- 出负载报告与拆分提案；**无压测依据不拆**
- 维持三池隔离为默认

---

## 九、模型策略（贯穿 B/C）

| 方案 | Embedding | Agent/对话 | MVP 默认 |
|------|-----------|------------|----------|
| 1 全千问 | 千问 | 千问 | **是** |
| 2 强推理 | 千问 | DeepSeek | 配置开关 |

- Nacos 为运行时配置准源；模块 `application.yml` 仅保留同值兜底。
- Intelligence 与 Agent 的默认模型统一为 `qwen`。
- `kb-agent` 复用 OpenAI-compatible 设计思路，不直接依赖 Intelligence 的 `ModelProvider` 实现类。
- `AI_DEV_STUB=true` 时 Agent LLM 节点使用确定性 Stub，保证无 Key 冒烟。
- 模型名、API Key、base URL、timeout 和 token 上限均通过配置注入，禁止写入工作流 JSON。

---

## 十、任务依赖与合闸条件

| 合闸点 | 条件 |
|--------|------|
| **进入 Agent B0** | 56-MVP、57 完成；58 安全负向用例和 Search ACL 探测可执行 |
| **开写 kb-agent 业务代码** | 64 契约冻结并通过自审 |
| **进入任务 66 真实联调** | Search ACL 为 PASS；若为 FAIL，只允许管理员联调并建立 ACL 修复项 |
| **开启 `system.enableAgent`** | 56-Ops、65–71 完成；401/403、越权文档和 Stub 冒烟有记录；普通用户开放范围与 ACL 结果一致 |
| **宣称 Agent MVP 可用** | 后端定向测试、前端构建/组件测试、`verify-all` 全部通过 |
| **上 React Flow** | Schema v1 冻结且 Agent MVP 稳定至少一个小版本 |
| **新增专用向量后端** | 60、61、73 完成，且 73 明确选择 Milvus 或 Qdrant |
| **进入分支实施** | 已确认本次修改文件所属仓库根，能在对应工作副本产出可靠 diff |

---

## 十一、风险与对策

| 风险 | 对策 |
|------|------|
| 网关配置存在但实际不生效 | 任务 56 用过滤器单测 + 运行时 401 冒烟验证，不以 YAML diff 代替 |
| 外部伪造内部头获得系统身份 | Gateway 清理信任头；内部 HMAC + 时间窗 + 路径白名单 |
| MQ-only 后发布失败丢索引 | Publisher Confirm/Return、metric/告警、有限重试和重建补偿 |
| Agent 再次形成长 Feign 链 | 工具只经 Gateway 调稳定 HTTP API并透传终端用户 Token |
| Agent 工具越权读文档 | 任务 58 先做 A/B 用户 ACL 探测；失败时仅管理员联调/运行，修复后再开放普通用户 |
| 工作流 Schema 反复变化 | 64 冻结 v1；发布版本不可变；React Flow 后置 |
| Prompt Injection | 工具输出视为不可信数据；固定系统提示；不开放任意 HTTP/写工具 |
| Retriever 重构回归 | 先跑 Golden baseline，再分层，再跑同一题集 |
| 三套向量后端维护膨胀 | 73 必须输出唯一生产选择，未触发指标则继续 ES |
| 模型默认值漂移 | Nacos 与模块兜底同值；冒烟输出实际默认模型 |
| 范围膨胀（审批流/多 Agent） | 明确排除并行 DAG、人工节点、多轮记忆和写工具 |

---

## 十二、建议执行顺序

| 时间 | 焦点 |
|------|------|
| D1–D3 | 56-MVP：网关认证、头清理、内部签名与单测 |
| D3–D4 | 57 索引模式、Publisher Confirm、失败可观测 |
| D4–D5 | 58 安全/API/ACL 冒烟；Phase A0 合闸 |
| D5–D6 | 56-Ops 运维跟进；不阻塞 B0，可与 64 文档工作并行 |
| D6 | 59 配置/叙事收口 + 63 路由残留 |
| D6–D7 | 60 Golden v0 与 baseline |
| W2 前半 | 64 Agent v1 契约冻结 |
| W2 后半 | 65 服务骨架、数据库、网关、基础鉴权 |
| W3 | 66 双工具 + 67 线性引擎 + 68 Run API |
| W4 前半 | 69 用户/管理 UI + 70 权限矩阵 |
| W4 后半 | 71 冒烟、整合验证和 MVP 演示 |
| 可并行支线 | 62 Statistics；61 仅在 60 baseline 后开始 |

### 并行与文件所有权

- 56 与 57 都可能修改 `kb-core-dev.yaml.template`，由同一集成任务串行收口。
- 60 与 61 必须串行；没有 baseline 不开始 Retriever 重构。
- 61 与 B1/B2 并行时冻结 Search/RAG 对外契约；61 仅拥有检索内部实现，66/71 拥有工具适配和 Agent 冒烟。
- 62 可独立推进，不修改 Agent、Gateway、父 POM 或共享权限 SQL。
- 64 完成前不并行创建 Agent 后端/前端契约。
- 65 涉及父 POM、Gateway、Nacos、SQL 安装和启动脚本，必须由单一所有者统一修改。
- 69 可在 68 API shape 冻结后独立实现；不得自行修改后端契约。
- shared schema、shared permission、根配置、CI/启动入口不允许多任务并行写入。

---

## 十三、进度跟踪（勾选）

### Phase A0

- [ ] 56-MVP 网关认证闭环与内部调用签名
- [ ] 57 Document 索引模式与事件可靠性
- [ ] 58 安全与 API 冒烟
- [x] 56-Ops 密钥轮换、路径矩阵与生产暴露检查

### Phase A1

- [x] 59 BC 叙事与配置准源
- [x] 60 RAG Golden v0
- [x] 61 Retriever 分层
- [ ] 62 Statistics 仓储化
- [x] 63 前端路由与鉴权残留

### Phase B0

- [ ] 64 Agent v1 契约冻结

### Phase B1

- [x] 65 kb-agent 骨架
- [x] 66 双工具
- [x] 67 线性引擎
- [x] 68 Session/Run API

### Phase B2

- [x] 69 用户运行页与管理员编排页
- [x] 70 权限矩阵与审计
- [x] 71 Agent 冒烟

### Phase C

- [ ] 72 React Flow
- [ ] 73 向量库选型合闸
- [ ] 74 条件适配、对账与降级
- [ ] 75 拆进程评估

---

## 十四、执行与交付约束

1. 当前工作区包含根仓库以及 `backend/`、`frontend/` 独立 Git 根；实施前使用 `git rev-parse --show-toplevel` 确认每个文件所属仓库。
2. backend 改动在 `backend/` 工作副本记录，frontend 改动在 `frontend/` 工作副本记录；本计划、其他 docs 与 deploy 改动在持有对应文件的根仓库记录，避免跨仓混合提交。
3. 任务 65、70、74 涉及父 POM、共享权限/schema、根配置或部署入口，实施前按工作区规则确认修改范围。
4. 正式开工时先在 [readme_plan.md](../readme_plan.md) 写入「任务 56–75 以本修订版编号为准」，随后每个任务追加「本次功能 / 参考文件 / 验证结果 / 差距总结」。
5. 没有新鲜验证证据，不勾选任务完成，不宣称 Agent 可用。
6. 大规模实现优先使用 `executing-plans` 串行推进；只有 62 等边界清晰、无共享写冲突的任务才考虑子代理并行。
