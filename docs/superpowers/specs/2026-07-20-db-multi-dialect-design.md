# 多数据库方言地基设计

**日期：** 2026-07-20  
**分支：** `feat/db-multi-dialect`  
**计划：** [plans/2026-07-20-db-multi-dialect-foundation.md](../plans/2026-07-20-db-multi-dialect-foundation.md)

## 目标（本阶段）

- 配置 `kb.db.type` / `KB_DB_TYPE` → MyBatis-Plus 分页方言
- 父 POM 管理 postgresql / ojdbc11 版本（按需引入）
- Schema 分目录：`schema/mysql` 权威；PG/Oracle 占位

## 非目标

全量 DDL 翻译、Mapper `databaseId`、ON DUPLICATE 抽象。

## 一部署一方言

Core 三数据源、各 BC 单库：同一部署只能一种方言。
