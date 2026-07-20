# 多数据库方言地基设计

**日期：** 2026-07-20  
**分支：** `feat/db-multi-dialect`  
**计划：** [plans/2026-07-20-db-multi-dialect-foundation.md](../plans/2026-07-20-db-multi-dialect-foundation.md)

## 目标（本阶段）

- 配置 `kb.db.type` / `KB_DB_TYPE` → MyBatis-Plus 分页方言
- 父 POM 管理 postgresql / ojdbc11 版本（按需引入）
- Schema 分目录：`schema/mysql` 权威；PG/Oracle 占位

## 非目标（地基阶段）

全量 DDL 翻译、Oracle MERGE。

## 第二里程碑（高风险 SQL，2026-07-20）

计划：[plans/2026-07-20-db-sql-dialect-hotspots.md](../plans/2026-07-20-db-sql-dialect-hotspots.md)

- `SqlDialectHelper`：IFNULL / NOW / 过期清理 / UPSERT 后缀（MySQL ON DUPLICATE ↔ PG ON CONFLICT）
- MyBatis `DatabaseIdProvider`；`SearchHistoryMapper.insertOrUpdate` 默认 MySQL + `databaseId=postgresql`
- Agent 鉴权、统计投影 JDBC upsert、聚合任务 DATE_SUB 走 helper
- Oracle UPSERT 仍抛 Unsupported（待 MERGE）；`.last(LIMIT)` / Neo4j LIMIT 不动

## 第三里程碑（DATE / LIMIT / PG 试点，2026-07-20）

计划：[plans/2026-07-20-db-dialect-m3-date-limit-pg.md](../plans/2026-07-20-db-dialect-m3-date-limit-pg.md)

- `dateOf` / `limitClause`；聚合任务 DATE；活跃 Java `.last(LIMIT)` 改 helper
- `DocumentStatisticsMapper` Oracle `databaseId`（TRUNC / FETCH FIRST）
- PG 试点：`schema/postgresql/00_create_schemas.sql` + `kb_intelligence.sql`；`DIALECT_CONVERSION.md`
- CI 矩阵文档：`plans/2026-07-20-db-dialect-ci-matrix.md`（手工）

## 第四里程碑（PG 其余 BC DDL，2026-07-20）

计划：[plans/2026-07-20-db-dialect-m4-pg-ddl.md](../plans/2026-07-20-db-dialect-m4-pg-ddl.md)

- `_tools/mysql_to_pg.py` 生成其余 `kb_*.sql`；`install_all.sql`
- `SqlDialectHelper.mergeInto` 占位（仍 Unsupported，带 MERGE 提示）
- 权威仍为 `schema/mysql/`；PG 为翻译稿需人工验证

## 第五里程碑（PG Docker 冒烟 + 合入 master，2026-07-20）

计划：[plans/2026-07-20-db-dialect-m5-pg-smoke.md](../plans/2026-07-20-db-dialect-m5-pg-smoke.md)

- `deploy/scripts/verify-pg-schema.ps1` PASS（修 FULLTEXT 跳过、索引名表前缀）
- 方言分支合入 `master`

## 生产交付（三库、MySQL 默认）

计划：[plans/2026-07-20-db-tri-dialect-prod-delivery.md](../plans/2026-07-20-db-tri-dialect-prod-delivery.md)  
设计：[2026-07-20-db-tri-dialect-prod-design.md](./2026-07-20-db-tri-dialect-prod-design.md)

- 目标：换配置 + 库脚本即可切 PG/Oracle；字段/函数公约；Oracle MERGE；PG 最小全栈；MySQL 回归
- **状态：计划已落盘，待换会话按 Task 0～9 执行**

## 一部署一方言

Core 三数据源、各 BC 单库：同一部署只能一种方言。
