从架构设计角度看，这个项目不是「能不能换软件」，而是「当前分层是否合理、有没有更干净的设计模式可替代」。下面按架构层次说明。

一、当前架构定位
项目整体是：

表现层
领域服务层 - 9个微服务
数据/索引层
Event
Feign 编排
Feign 编排
Feign 编排
Feign 编排
React SPA
API Gateway
Identity & Access
Document BC
File BC
Search Read Model
AI/RAG/KAG
Graph Query
Analytics
Platform Services
MySQL 分库
MongoDB 正文
Elasticsearch
Neo4j
Redis 共享读模型
RabbitMQ 领域事件
设计意图是对的：微服务 + Database per Service + CQRS 读模型 + 事件驱动。
主要问题不在「用了什么中间件」，而在边界划得太碎、读写模型重复、同步/异步混用。

二、架构上「可替换」的不是组件，是设计模式
1. 微服务边界 — 可替换为「更少的有界上下文」
现状：9 个服务，Document 成为编排中心，发布一篇文档要同步调 4 个 Feign：

DocumentServiceImpl
  → SearchIndexFeignClient   (ES 全文索引)
  → RagFeignClient           (向量索引)
  → KAGFeignClient           (图谱构建)
  → GraphFeignClient         (图谱删除)
这是典型的 Orchestrator（编排器）反模式落在错误的服务上——Document 本应只管文档生命周期，却承担了「索引协调器」职责。

架构替代方案	设计思路	适用性
A. 合并为 3~4 个 BC
Core（auth+document+foundation）、Media（file）、Intelligence（ai+search+graph）、Analytics（statistics）
中小团队最合理
B. 保留微服务，引入 Indexing BC
Document 只发 DocumentPublished 事件，Indexing 服务统一写 ES/向量/图谱
保持扩展性，边界更清晰
C. 模块化单体
Maven 多模块但单进程部署，模块间用接口+事件
业务复杂度未到 9 服务时更干净
架构结论：不是 Nacos/Gateway 要换，而是 kb-search / kb-graph 作为独立 BC 的必要性不足，应合并进 Intelligence 层或改为事件消费者。

2. 数据架构 — 可替换「元数据/正文/索引」三角
现状（设计合理）：

MySQL     → 文档元数据、权限、状态机
MongoDB   → 大文本正文、自动保存快照
ES/Neo4j  → 检索/推理用的派生数据（读模型）
这是标准的 Core + Content Store + Read Model 分离，和 Notion/GitBook 类系统一致，不应为了「简化」合并成单库。

可替换的设计	说明
MongoDB → 对象存储 + 内容地址
若正文只做整篇读写、不做片段查询，可改为 Blob Store
MySQL 多库 → 单库多 schema
若不做独立扩缩容，Database per Service 可降为逻辑分库
跨库 VIEW（kb_statistics）→ 事件同步宽表
当前设计有矛盾：文档写「不用跨库外键」，统计库却用 VIEW 读其他库，违反微服务数据隔离原则
架构结论：MongoDB 设计合理；应替换的是 kb_statistics 的跨库 VIEW，改为 MQ 事件写入本地宽表（真正的 CQRS 投影）。

3. 搜索架构 — 可替换「双索引 + 双服务」
现状：

读模型	服务	粒度	能力
kb_document
kb-search
整篇
BM25 关键词
kb_chunk
kb-ai
分块
BM25 + 向量 + RRF
前台 hybrid 搜索还要 search → feign → ai，形成链式依赖。

这是 同一领域（检索）被拆成两个 BC + 两套索引，架构上重复。

替代设计	模式
统一 Search Platform
一个 Indexing 服务维护多 index alias，对外统一 Search API
单索引多字段
ES 一个 index 同时存 doc-level 和 chunk-level（nested），查询层路由
检索管道模式
Search API → Retriever Chain（keyword / semantic / graph 各是一个 Retriever）
当前 - 链式
更干净 - 管道
hybrid
用户
kb-search ES
kb-ai ES
用户
Search API
Keyword Retriever
Vector Retriever
Graph Retriever
RRF Fusion
架构结论：kb-search 作为独立微服务的设计价值低；应替换为 Retrieval 子域，并入 AI/Search 统一服务或 Indexing BC。

4. AI 架构 — 可替换「大一统 kb-ai」
现状：kb-ai 同时承担：

LLM Gateway（对话/写作）
RAG Pipeline（分块、Embedding、检索）
KAG Pipeline（抽取、图谱写入）
异步 Worker（MQ 消费）
这是 AI Platform 单体，功能内聚但边界模糊。

替代设计	职责划分
LLM Gateway + RAG Service
Gateway 只管模型路由；RAG 只管索引和检索
Pipeline 模式
Ingest → Chunk → Embed → Index 各为独立 Stage，可插拔
Agent 架构
Chat 层调 Tool（search_tool / graph_tool），而非 Service 互调
LangChain4j + OpenAI 兼容接口已经是 Provider 抽象，大模型切换是设计层扩展点，不是架构问题。

架构结论：不必拆成更多微服务，但应在 kb-ai 内部按 Pipeline/Gateway 分层，而不是让 kb-document 直接 Feign 进来。

5. 图谱架构 — 可替换「双服务共写 Neo4j」
现状：

kb-ai    → 写 Neo4j（LLM 抽取实体关系）
kb-graph → 读 Neo4j（可视化）+ 删节点 + Redis 缓存
设计意图接近 CQRS（写模型 / 读模型分离），但实现上两边都能跑 Cypher，读写边界不清晰。

替代设计	说明
Graph BC 统一
构建、查询、删除全在一个 Graph Service；AI 只返回结构化三元组
Graph 作为 Read Model
AI 产出 (entity, relation, entity) 事件，Graph Service 投影到 Neo4j
去掉 Neo4j，图谱存 ES
仅展示用时可考虑；KAG 多跳推理则不适合
MySQL kb_graph 表是设计遗留，与 Neo4j 双存储但未使用，属于架构文档与实现不一致。

架构结论：应合并 kb-ai 的图谱写入与 kb-graph 的查询，或严格事件驱动分离；不是换 Neo4j 的问题，是 BC 边界问题。

6. 集成模式 — 可替换「Feign 编排 + MQ 混用」
现状：

场景	模式
文档发布 → 索引
Feign 同步触发 + MQ 异步执行
浏览/评论 → 统计
MQ 事件
操作日志
AOP → MQ
审核 → 通知
MQ → WebSocket
文档索引是 Feign 触发 + MQ 执行 的混合模式，一致性靠「失败了打 warn 日志」，没有 Outbox/Saga。

替代设计	模式
纯事件驱动
Document 只发 DocumentPublished，Indexing/AI/Graph 各自订阅
Transactional Outbox
文档入库与事件写入同一事务，保证至少一次投递
Saga
发布流程：索引成功 → 图谱成功 → 标记「已索引」；失败补偿
保存文档 + 写入 DocumentPublished
可靠投递
建 ES 索引
RAG/KAG 重建
Document BC
Outbox Table
Event Bus
Indexing
AI/KAG
架构结论：RabbitMQ 不必换 Kafka；应替换的是 Document 作为编排中心的同步 Feign 模式，改为领域事件 + 投影消费者。

7. 平台层 — 可替换「Foundation 作为共享内核」
现状：kb-foundation 合并了通知、配置、字典、日志、WebSocket，通过 Redis SystemConfigCache 做跨服务共享读模型。

这是合理的 Platform / Shared Kernel 设计，比原来独立的 kb-notification + kb_common 更干净。

可替换设计	说明
配置中心独立
若配置变复杂，从 foundation 拆出 Config Service
日志走观测平台
OperationLog → OpenTelemetry/Loki，而非自建表
通知走 Notification Hub
多渠道（邮件/站内/企微）统一抽象
架构结论：foundation 合并方向正确，不建议再拆回去。

三、从设计角度看：哪些「不该换」、哪些「该换模式」
层次	当前选择	架构评价	设计层替代
Gateway + JWT
Spring Cloud Gateway
✅ 标准
BFF 按端拆分（Web/移动端）
Database per Service
MySQL 分库
✅ 原则正确
统计库跨库 VIEW ❌ 应改事件投影
正文分离
MongoDB
✅ 合理
仅当不做版本/快照时可改 Blob
双 ES 索引
search + ai 各一套
⚠️ 重复
统一 Indexing BC
kb-search 独立服务
单独微服务
⚠️ 边界薄
并入 Retrieval 子域
kb-graph 独立服务
与 kb-ai 共 Neo4j
⚠️ 读写交叉
合并或严格 CQRS
Document 编排索引
Feign × 4
❌ 耦合过重
领域事件 + 消费者
kb-statistics 跨库 VIEW
SQL VIEW
❌ 违反隔离
本地宽表 + MQ
RabbitMQ 事件
异步解耦
✅ 合理
不必换，补 Outbox
Redis 共享配置缓存
SystemConfigCache
✅ 合理
可换为 Config Server 推送
Nacos
注册+配置
✅ 微服务标配
K8s 原生时可去掉
Milvus 配置项
仅 SQL/UI
❌ 设计未完成
要么接入要么删
四、推荐的架构演进方向（设计视角）
若重新设计，更干净的结构是 4 个有界上下文：

Core Domain
Intelligence Domain
Media Domain
Analytics Domain
DocumentPublished
events
API Gateway
ES
NEO
Identity & Access
Document & Content
Platform: Config/Notify/Log
Indexing Pipeline
Retrieval API
LLM Gateway
Graph Projection
File Storage
Statistics Projection
对应到现有代码的映射：

新 BC	吸收现有服务
Core
kb-user-auth + kb-document + kb-foundation
Intelligence
kb-ai + kb-search + kb-graph（内部模块化）
Media
kb-file
Analytics
kb-statistics（去掉跨库 VIEW，纯事件投影）
五、一句话总结
从架构设计看，值得替换的不是 Redis/ES/Neo4j 这些中间件选型，而是：

服务边界：9 服务过碎，search/graph 应并入 Intelligence BC
索引模型：双 ES 索引应统一为 Indexing Pipeline
集成方式：Document 的 Feign 编排应改为领域事件 + Outbox
数据隔离：statistics 跨库 VIEW 应改为 CQRS 投影表
图谱分层：kb-ai 写 + kb-graph 读应合并或严格事件分离
MongoDB 正文分离、RabbitMQ 事件驱动、Foundation 平台化——这些设计方向是对的，不需要为了「架构简化」而换掉。

如果你想深入某一块（比如「只重构搜索域」或「Document 改事件驱动」），我可以按现有代码画一版具体的模块拆分和接口边界方案。

---

## 六、实施跟踪

> 可执行清单见 **[rh-cha-roadmap.md](./rh-cha-roadmap.md)**（含自检命令与 Next 3）。  
> **环境（2026-07-10）**：本地 Docker 栈（`deploy/`）已就绪；RustFS 替代 MinIO；5 BC + 网关 + 前端可本地启动。

| 阶段 | 状态 | 最近完成 |
|------|------|----------|
| Phase 0 事件驱动 | ✅ | DocumentLifecycle MQ |
| Phase 1 Intelligence | ✅ | P1-7 旧三服务废弃 + 切流脚本 |
| Phase 2 Core | ✅ | P2-7 六旧模块归档 + 网关 4 BC |
| Phase 3 Statistics | ✅ | P3-1 投影 + P3-2 部署 + P3-3 运维 + 本地 Docker |

**下一步**：业务联调验收（MQ 投影、RustFS 上传、搜索/RAG）。

