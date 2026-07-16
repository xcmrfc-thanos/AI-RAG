# 任务 75：Intelligence 拆进程评估

> **日期**：2026-07-16  
> **原则**：**无压测依据不拆**；维持三池隔离为默认。

## 现状

| 项 | 说明 |
|----|------|
| 部署形态 | `kb-intelligence` 单进程（检索 + LLM/RAG + 图谱相关） |
| 线程池 | Intelligence 三池隔离（Search / RAG / 其他，见 `IntelligenceExecutorNames`） |
| 配置准源 | Nacos `kb-intelligence-dev.yaml`；`ai.default-model=qwen` |

## 拆分候选（仅提案，不实施）

| 方案 | 内容 | 触发条件（需压测证据） |
|------|------|------------------------|
| A 维持单进程 | 现状 | **默认** |
| B 检索与生成分离 | Search/索引 vs LLM/Agent 工具依赖 | Search p95 与 LLM 互相饿死，且三池调优无效 |
| C 图谱独立 | Neo4j/KAG 单独进程 | 图谱 CPU 持续挤占检索池 |

## 负载报告模板（待填）

| 场景 | QPS | p95 | CPU | Heap | 备注 |
|------|-----|-----|-----|------|------|
| keyword Search | `_pending_` | | | | |
| hybrid Search | `_pending_` | | | | |
| RAG chat | `_pending_` | | | | |
| Agent Run（Stub） | `_pending_` | | | | |

## 决策

**不拆进程。** 理由：无新鲜压测数据；三池隔离已是默认降风险手段；拆分会增加网关路由、HMAC、发布面复杂度。

复测后若 B/C 触发条件成立，另开变更单修订本文件并实施，不得在无数据时拆分。
