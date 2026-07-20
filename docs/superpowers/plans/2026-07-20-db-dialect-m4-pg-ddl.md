# 多库方言 · 第四里程碑（PostgreSQL 其余 BC DDL）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 将 `schema/mysql/` 中除已试点外的 BC DDL 翻译为可审阅的 PostgreSQL 脚本；更新转换指南与 README；Oracle MERGE 助手骨架（仍 Unsupported）。

**Architecture:** `_tools/mysql_to_pg.py` 机械转换 + 抽查；权威仍为 MySQL。

**Tech Stack:** PostgreSQL DDL、DIALECT_CONVERSION

**分支：** `feat/db-multi-dialect`

**非目标：** Oracle 全量 DDL、在真实 PG 上跑通全栈、数据迁移脚本、真正实现 MERGE。

---

### Task 1: 转换工具 + 批量生成

- [x] `_tools/mysql_to_pg.py`
- [x] 生成其余 `kb_*.sql` + `install_all.sql`

### Task 2: 校对与 README

- [x] 修复 VARCHAR(n) 误删；抽查无 ENGINE/TINYINT
- [x] 更新 README / DIALECT_CONVERSION / design

### Task 3: Oracle MERGE 骨架

- [x] `mergeInto` 占位 + 单测仍抛异常；`onDuplicate` Oracle 提示增强

### Task 4: 自检提交

- [x] 单测；commit & push

---

## 验收

- [x] `schema/postgresql/` 覆盖主要 BC
- [x] MySQL 权威不变
- [x] 文档标明翻译稿需验证
- [x] SqlDialectHelperTest 通过
