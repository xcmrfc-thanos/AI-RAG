# 多库方言 · 第五里程碑（PostgreSQL DDL Docker 冒烟）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 用临时 Docker PostgreSQL 执行 `schema/postgresql` 全量脚本，验证翻译稿可装载；修阻塞性语法问题；合入 `master`。

**Architecture:** `deploy/scripts/verify-pg-schema.ps1` 拉起一次性 `postgres` 容器 → `00_create_schemas.sql` + `install_all.sql` → 统计 `kb_%` schema 表数 → 清理容器。

**Tech Stack:** Docker、PostgreSQL 16、PowerShell

**分支：** `feat/db-multi-dialect` → merge `master`

---

### Task 1–2: 冒烟脚本 + 修 DDL

- [x] `deploy/scripts/verify-pg-schema.ps1`
- [x] 跳过 FULLTEXT；索引名加表前缀消冲突；`verify-pg-schema.ps1` PASS

### Task 3: 文档 + 合入 master

- [x] 更新 CI 矩阵 / design / readme_plan
- [x] commit & push；merge `master`

---

## 验收

- [x] `verify-pg-schema.ps1` 退出码 0
- [x] 各 `kb_*` schema 有表
- [x] `master` 含方言全部提交
