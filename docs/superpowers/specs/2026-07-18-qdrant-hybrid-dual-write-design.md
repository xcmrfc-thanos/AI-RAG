# Qdrant 双写 + ES BM25 混合检索设计

> **日期**：2026-07-18  
> **状态**：已批准并实现（2026-07-18）  
> **关联**：任务 61/73/74 扩展点；参考 `MilvusVectorIndexServiceImpl` / `MilvusDenseRetriever`  
> **决策前提**：用户确认双写；融合默认 RRF，可选 weighted（方案 C）

## 1. 目标

在**不改变默认行为**的前提下，提供可选的 Qdrant 向量通道：

1. `rag.qdrant.enabled=false`（默认）：纯 ES，与现状完全一致。
2. `rag.qdrant.enabled=true`：索引**双写**（ES + Qdrant）；混合检索 = **ES BM25 + Qdrant dense**，再融合。
3. 融合默认 **RRF**；可选 `weighted` 线性权重（min-max 归一后加权）。

不替换现有 `rag.vector-store=milvus` 路径；不引入「仅 Qdrant、去掉 ES」硬切换。

## 2. 非目标

- 不做历史数据强制迁移脚本（无历史数据约束；开启后通过重建索引补齐 Qdrant）。
- 不改 Search/RAG 对外 API shape。
- 不默认拉起 Qdrant 容器阻塞现有 `setup.ps1`（compose 提供服务定义，文档说明如何启用）。
- 不做 Qdrant BM25 / keyword 实现（关键词始终走 ES）。

## 3. 配置

```yaml
rag:
  vector-store: elasticsearch          # 默认不变；milvus 路径保留
  qdrant:
    enabled: ${RAG_QDRANT_ENABLED:false}
    host: ${QDRANT_HOST:127.0.0.1}
    port: ${QDRANT_PORT:6333}
    collection: kb_chunk
    api-key: ${QDRANT_API_KEY:}        # 可选
    connect-timeout-ms: 10000
    # 双写时 Qdrant 失败是否抛错；默认 false=ES 成功即视为索引成功
    fail-open: true
  hybrid:
    fusion: ${RAG_HYBRID_FUSION:rrf}   # rrf | weighted
    bm25-weight: 0.5                   # 仅 weighted
    dense-weight: 0.5                  # 仅 weighted
  retrieval:
    rrf-c: 60                          # 沿用
```

落点：

- `RagProperties` 增加 `Qdrant` / `Hybrid` 嵌套类（或把 fusion 权重放在 `Retrieval` 旁独立 `Hybrid`）。
- Nacos 模板 `kb-intelligence-dev.yaml.template` 同步默认值。
- `deploy/.env.example` 增加 `RAG_QDRANT_ENABLED` / `QDRANT_*` 注释项。

## 4. 架构

```text
发布/重建索引
  └─ Chunking + Embedding（不变）
       ├─ ES VectorIndexService.indexChunks（始终，当 vector-store=elasticsearch）
       └─ [qdrant.enabled] QdrantChunkWriter.upsert（额外双写）

混合检索 (HybridRetriever)
  ├─ KeywordRetriever = ElasticsearchKeywordRetriever（始终用于本模式）
  ├─ DenseRetriever   = QdrantDenseRetriever（qdrant.enabled）
  │                   或 ElasticsearchDenseRetriever（默认）
  └─ Fusion           = RRF（默认）| Weighted（可选）
```

装配原则：

| Bean | 条件 |
|------|------|
| `QdrantConfig` / Client | `rag.qdrant.enabled=true` |
| `QdrantDenseRetriever` | `rag.qdrant.enabled=true` |
| `ElasticsearchDenseRetriever` | `rag.qdrant.enabled=false`（且 `vector-store=elasticsearch`） |
| `ElasticsearchKeywordRetriever` | `vector-store=elasticsearch`（含双写模式） |
| `QdrantChunkWriter` | `rag.qdrant.enabled=true` |

> 说明：双写模式下 **Keyword 与 ES CRUD 仍走 ES**；Qdrant 只承担 dense 检索与向量存储旁路，不接管 `VectorIndexService` 主 Bean（避免与 `rag.vector-store=milvus` 冲突）。

## 5. 写入（双写）

### 5.1 触发点

在现有「写 ES chunks」成功路径之后挂钩（优先装饰/监听，避免复制整段 `ReindexConsumer`）：

1. MQ / 重建：`ReindexConsumer`（或抽 `ChunkIndexCoordinator`）在 `vectorIndexService.indexChunks` 后调用 `qdrantChunkWriter.upsert(chunks)`。
2. 删除：`deleteByDocId` 时同步删 Qdrant（`fail-open` 时仅打 WARN）。

### 5.2 Qdrant Collection Schema

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID/string point id | = `chunkId` |
| vector | float[dimension] | `rag.embedding.dimension`（默认 1024） |
| document_id | integer payload | |
| document_title | keyword/text | |
| content | text | |
| heading | text | 可选 |
| publish_time | keyword | 可选 |
| category_id / author_id / team_id / is_public / doc_status | payload | ACL/过滤预留 |

距离：Cosine（与现有 ES script_score cosine 一致）。

启动时 `ensureCollection`：不存在则创建；维度与配置不一致时打 ERROR 并拒绝写入（避免静默错维）。

### 5.3 失败策略

- `fail-open=true`（默认）：Qdrant 异常不回滚 ES；日志 + 可选 metric。
- 运维可通过全量 `rebuild-es-indices` 扩展「同时重建 Qdrant」补齐（实现计划中落地脚本开关）。

## 6. 检索与融合

### 6.1 通道

- BM25：`ElasticsearchKeywordRetriever.retrieveCandidates`
- Dense：`QdrantDenseRetriever.retrieve(queryEmbedding, topK)` → `FusionCandidate`（score=相似度）

保留现有 `RrfHybridRetriever` 中「dense 结果按 BM25 命中 documentId 过滤」策略，避免纯向量噪声放大（与现网一致）。

### 6.2 融合

扩展 `HybridSearchFusion`：

1. **`fuseAndConvert`（现有）**：RRF，默认路径。
2. **`fuseWeightedAndConvert`（新增）**：
   - 对两路 score 分别 min-max 归一到 `[0,1]`（单元素则记 1.0；空路跳过）。
   - `final = bm25Weight * normBm25 + denseWeight * normDense`。
   - 权重自动按绝对值归一（和为 0 时回退均等）。
   - 输出仍填 `bm25Score` / `vectorScore` 原始分，便于排查。

`RrfHybridRetriever`（或改名为编排类并保留 Bean 名）根据 `rag.hybrid.fusion` 分支调用。

## 7. 部署

- `deploy/docker-compose.yml` 增加服务 `kb-qdrant`（官方镜像，端口如 `26333:6333`，与项目端口习惯对齐）。
- `setup.ps1` **默认不强制**启动 Qdrant；README 说明：开启双写前 `docker compose up -d kb-qdrant` 并设 `RAG_QDRANT_ENABLED=true`。
- 不修改默认 `verify-all` 为必须连 Qdrant（避免本地无容器失败）；可选冒烟脚本后续加。

## 8. 测试

| 用例 | 期望 |
|------|------|
| `HybridSearchFusion` weighted 单测 | 归一+权重正确；单路/双路边界 |
| `RrfHybridRetriever` 分支（mock） | fusion=rrf/weighted 调用对应方法 |
| 条件装配（可选切片） | enabled=false 无 Qdrant Bean |
| 默认关回归 | 现有 `HybridSearchFusionTest` / `RrfHybridRetrieverTest` 仍绿 |

## 9. 文档与决策同步

- 更新 `docs/eval/vector-store-decision.md`：补充「可选 Qdrant 旁路双写，默认关；非生产唯一后端」。
- `readme_plan.md` 追加本次功能 / 参考文件 / 差距总结。
- 第 7 阶段计划不回改「73 继续 ES」结论；本需求为**开关增强**，默认仍 ES。

## 10. 验收标准

1. 默认配置下行为与开启前一致（纯 ES）。
2. `enabled=true` 且 Qdrant 可用：索引后 Qdrant 有 point；hybrid 检索返回融合结果。
3. `fusion=weighted` 调整 `bm25-weight`/`dense-weight` 可改变排序（单测覆盖算法）。
4. Qdrant 宕机 + `fail-open=true`：ES 索引与 BM25 检索仍可用。

## 11. 实现文件清单（预期）

- `.../config/QdrantConfig.java`、`RagProperties.java`
- `.../rag/qdrant/QdrantChunkWriter.java`（或 `service/impl`）
- `.../rag/retriever/qdrant/QdrantDenseRetriever.java`
- `.../rag/support/HybridSearchFusion.java`（加权）
- `.../rag/retriever/RrfHybridRetriever.java`（分支）
- 索引挂钩：`ReindexConsumer` / 协调器
- `backend/.../pom.xml`（qdrant-java-client）
- `backend/nacos/kb-intelligence-dev.yaml.template`
- `deploy/docker-compose.yml`、`deploy/README.md`
- 单测：`HybridSearchFusionTest` 扩展

## 12. 自检（Spec Review）

| 检查 | 结果 |
|------|------|
| 占位符 / TBD | 无 |
| 与「默认 ES」矛盾 | 无：`enabled=false` 默认 |
| 与 Milvus `vector-store` 冲突 | 无：Qdrant 用独立开关，不占用 vector-store 枚举为唯一主存（双写旁路） |
| 范围蔓延 | 已排除硬切换、强制 compose、API 变更 |
| 权重未归一风险 | weighted 路径明确 min-max + 权重归一 |
