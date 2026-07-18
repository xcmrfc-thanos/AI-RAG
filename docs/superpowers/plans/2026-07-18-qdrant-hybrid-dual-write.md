# Qdrant 双写 + ES BM25 混合检索 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or implement task-by-task in current session.

**Goal:** 默认纯 ES；开启 `rag.qdrant.enabled` 后双写 Qdrant，混合检索 = ES BM25 + Qdrant dense，融合默认 RRF、可选 weighted。

**Architecture:** Qdrant 作为旁路 Writer + DenseRetriever；不替换 `VectorIndexService` 主 Bean。扩展 `HybridSearchFusion` 与 `RrfHybridRetriever` 分支。

**Tech Stack:** Java 21、Spring Boot 3、qdrant-java-client、Elasticsearch、Docker Compose。

---

### Task 1: 配置与依赖
- RagProperties 增加 Qdrant/Hybrid
- pom 增加 qdrant client
- Nacos 模板默认值

### Task 2: Qdrant 写入与 DenseRetriever
- QdrantConfig、QdrantChunkWriter、QdrantDenseRetriever
- 挂钩 ReindexConsumer / ES index+delete

### Task 3: 融合与检索编排
- HybridSearchFusion.weighted
- RrfHybridRetriever 按 fusion 分支
- DenseRetriever 条件装配（qdrant.enabled）

### Task 4: Docker/文档/单测/readme_plan
- compose kb-qdrant、README、Fusion 单测、决策文档、readme_plan

---
