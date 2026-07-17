# 向量库选型合闸（任务 73）

> **日期**：2026-07-16  
> **前置**：任务 60 Golden v0、任务 61 `DenseRetriever` 扩展点  
> **合闸规则**：仅当满足计划中任一门槛才允许进入任务 74 新增专用向量后端；否则**继续 Elasticsearch**。

## 候选

| 后端 | 现状 | 说明 |
|------|------|------|
| Elasticsearch hybrid | **生产默认** `rag.vector-store=elasticsearch` | BM25 + script_score cosine + RRF；文档元数据同集群 |
| Milvus | 已有实现（条件装配） | Keyword 为 VARCHAR like **降级**；非完整 BM25 |
| Qdrant | 未接入 | 仅作评估候选，无代码 |

## 评估维度（同一数据集 / 负载）

| 指标 | 定义 | ES | Milvus | Qdrant |
|------|------|----|--------|--------|
| Recall@10 | Golden / 固定题集 | 未单独采集；当前可重复指标为 Hit@5 75%（keyword/hybrid） | 未采集 | N/A |
| 混合检索 p95 | Search/RAG hybrid API | 未采集（后续压测观测） | 未采集 | N/A |
| 索引写入速度 | chunk bulk / 秒 | 未采集（后续容量观测） | 未采集 | N/A |
| 资源 | Heap / CPU / 磁盘 | 未采集（后续容量观测） | 未采集 | N/A |
| 运维复杂度 | 组件数、备份、监控 | 与现有 ES 合一 | +1 有状态组件 | +1 新组件 |
| 失败降级 | 向量不可用时 | 已有 embed 失败→BM25-only | 需任务 74 强化 | 需新建 |

## 进入任务 74 的门槛（计划原文）

满足**任一**才允许新增/切换专用向量生产后端：

1. ES hybrid p95 超过项目 Search SLO  
2. ES Heap 使用率持续高于 75%  
3. 候选后端 Recall@10 提升 ≥ 5 个百分点  
4. 候选后端 p95 降低 ≥ 30%

## 决策（当前）

| 项 | 结论 |
|----|------|
| **唯一决策** | **继续 Elasticsearch** 作为生产向量与混合检索后端 |
| 理由 | ES 在线 baseline 已建立，但没有 Recall@10、p95 或资源对比证据触发切换门槛；Milvus keyword 降级完整度不足，不宜并列生产 |
| Milvus 代码 | **保留**条件装配与任务 61 `MilvusDenseRetriever`，标明降级；**不**作为默认生产路径 |
| Qdrant | **不引入**，直至门槛数据支持 |
| 任务 74 | 以「无新增向量后端」结项路径推进（对账/健康检查可做 ES 侧加固；不新增第二生产向量库） |

## 复测命令（服务就绪后）

```powershell
cd deploy\scripts
.\verify-rag-golden.ps1 -SearchMode keyword -WriteBaseline
.\verify-rag-golden.ps1 -SearchMode hybrid -WriteBaseline
# 另记录 p95 / Heap（APM 或压测脚本），回填上表后再复议本决策
```

## 变更约定

- 若复测触发门槛：修订本文件「决策」一节为「补齐 Milvus」或「采用 Qdrant」，再开任务 74 适配器实施。  
- 不得默认同时保留三套生产实现。
