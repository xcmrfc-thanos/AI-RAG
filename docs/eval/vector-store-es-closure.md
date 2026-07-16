# 任务 74 结项：继续 Elasticsearch（无新增向量后端）

> **日期**：2026-07-16  
> **依据**：[vector-store-decision.md](./vector-store-decision.md) 决策「继续 ES」

## 范围结论

| 计划项 | 本结项处理 |
|--------|------------|
| DenseRetriever 适配新后端 | **不实施**（无选型切换） |
| 双写 / 对账 / 专用库健康检查 | **不适用** |
| 专用库异常降级 `vector=off` | 沿用现有：embedding 失败时混合检索仅 BM25（`RrfHybridRetriever` + 空 dense） |
| docker-compose 新 profile | **不增加** |

## 已具备能力（任务 61）

- `DenseRetriever` / `ElasticsearchDenseRetriever` 扩展点已存在，未来切换无需再拆门面
- `KeywordRetriever` + `HybridSearchFusion` 与存储 CRUD 解耦
- Milvus 实现保留为可选装配，**非**生产默认

## 文档生命周期（维持）

1. 文本 / BM25：始终进入 ES `kb_document` + `kb_chunk`  
2. 向量：写入同一 ES `embedding` 字段（`rag.vector-store=elasticsearch`）  
3. 检索：Search/RAG → `VectorIndexService.searchHybrid` → Retriever 分层

## 验收

- [x] 无新增生产向量后端  
- [x] 决策文档与本结项互链  
- [x] 对外 Search/RAG API shape 不变  

联调数值（Golden / p95）仍见 baseline `_pending_`，不阻塞本结项。
