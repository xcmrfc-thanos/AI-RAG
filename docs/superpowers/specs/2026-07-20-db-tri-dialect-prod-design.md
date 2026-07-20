# 三库兼容生产交付设计（MySQL 默认）

**日期：** 2026-07-20  
**计划：** [plans/2026-07-20-db-tri-dialect-prod-delivery.md](../plans/2026-07-20-db-tri-dialect-prod-delivery.md)  
**地基：** [2026-07-20-db-multi-dialect-design.md](./2026-07-20-db-multi-dialect-design.md)  
**转换指南：** [backend/sql/schema/DIALECT_CONVERSION.md](../../../backend/sql/schema/DIALECT_CONVERSION.md)

## 目标

同一制品，内网可部署 MySQL / PostgreSQL / Oracle；**默认 MySQL 不改业务代码**；切库 = 配置 + 对应初始化脚本。

## 原则

1. **一部署一方言**（禁止同进程混库）。
2. **DDL 三套**：`schema/mysql|postgresql|oracle`，属正常交付物。
3. **运行时磨平** SQL 语法与函数差（`SqlDialectHelper` + `databaseId`），不是为每个客户改业务。
4. **字段尽量三库交集**（见下表）；专有类型只出现在分方言脚本。

## 字段类型公约

| 用途 | 推荐 | 避免作跨库契约 |
|------|------|----------------|
| 整型 PK/雪花 | `BIGINT` | 依赖 `AUTO_INCREMENT` |
| 短文本 | `VARCHAR(n)` | 前缀索引写入统一契约 |
| 长文本 | `TEXT` | 绑定 `LONGTEXT` 为唯一契约 |
| 时间 | `TIMESTAMP` + 应用层更新 | 依赖 `ON UPDATE CURRENT_TIMESTAMP` |
| 布尔/状态 | `SMALLINT`（0/1） | 仅 MySQL `TINYINT(1)` |
| JSON | 分脚本 JSON/JSONB/CLOB | 业务 SQL 依赖 JSON 函数 |

## 运行时函数（摘要）

空值 / 当前时间 / 取日期 / 限行 / Upsert → 分别用 `ifNull`、`currentTimestamp`、`dateOf`、`limitClause`、`onDuplicateKeyUpdate`（Oracle `mergeInto` 见计划 Task 2）。完整表见 `DIALECT_CONVERSION.md`。

## 与已完成地基的关系

m1～m5 已提供配置、助手、PG 翻译稿与 DDL 冒烟。本设计对应**生产交付缺口**：Oracle DDL+MERGE、Mapper 补全、部署 Profile、PG 最小全栈冒烟、MySQL 回归。

## 切换检查清单（交付物）

1. 选定 `KB_DB_TYPE`
2. 引入对应 JDBC 驱动
3. 执行 `schema/{dialect}/` 初始化
4. Nacos/环境变量指向该库
5. 跑对应 `verify-*-schema` + 约定全栈冒烟
