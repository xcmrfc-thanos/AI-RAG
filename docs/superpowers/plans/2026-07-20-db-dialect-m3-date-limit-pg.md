# 多库方言 · 第三里程碑（DATE / LIMIT / PG 试点 DDL）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 补齐 `DATE()` / `LIMIT` 方言片段，改写活跃 Java 热点与统计聚合；落地 PostgreSQL **试点 DDL**（`kb_intelligence`）与转换指南；Oracle 全量 DDL/MERGE 仍文档化缺口。

**Architecture:** 扩展 `SqlDialectHelper`（`dateOf`、`limitClause`）。JdbcTemplate / `.last(...)` 走 helper。Mapper XML：MySQL+PG 默认保留 `DATE`/`LIMIT`；Oracle 关键语句用 `databaseId=oracle`。`schema/postgresql/` 提供可执行试点脚本 + 转换说明。

**Tech Stack:** SqlDialectHelper、MyBatis databaseId、PostgreSQL DDL

**分支：** `feat/db-multi-dialect`

**非目标：** 全库 PG/Oracle DDL、全量 Mapper Oracle 化、CI 真跑双库（仅文档矩阵）、Oracle MERGE 运行时实现。

---

### Task 1: SqlDialectHelper 扩展 + 单测

- [x] **Step 1–3:** `dateOf` / `limitClause` + 单测

### Task 2: 统计聚合 DATE

- [x] **Step 1:** `StatisticsAggregationTask` 使用 `dateOf`

### Task 3: 活跃 Java `.last(LIMIT)` 改 helper

- [x] **Step 1–2:** 14 个活跃类注入并替换；相关单测构造补参

### Task 4: 统计 Mapper Oracle LIMIT/DATE

- [x] **Step 1:** `DocumentStatisticsMapper` oracle 变体

### Task 5: PostgreSQL 试点 DDL + 文档

- [x] **Step 1–3:** PG schema/DDL、DIALECT_CONVERSION、CI 矩阵文档、README

### Task 6: 自检提交

- [x] 单测 + design/readme_plan；commit & push

---

## 验收

- [x] MySQL 默认语义不变
- [x] helper 对 PG/Oracle 产出正确 DATE/LIMIT 片段
- [x] 聚合任务无硬编码 `DATE(`
- [x] PG 试点脚本可人工审阅执行
- [x] 单测通过
