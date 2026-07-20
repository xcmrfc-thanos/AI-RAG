# 方言 DDL / 函数转换指南

权威 DDL：**`schema/mysql/`**。其它方言分目录脚本 + 运行时 `SqlDialectHelper` / Mapper `databaseId`。

生产交付计划：[docs/superpowers/plans/2026-07-20-db-tri-dialect-prod-delivery.md](../../../docs/superpowers/plans/2026-07-20-db-tri-dialect-prod-delivery.md)

---

## 字段类型公约（新建/改表优先 · 三库交集）

| 用途 | 推荐 | 避免作跨库契约 |
|------|------|----------------|
| 整型 PK/雪花 | `BIGINT` | 依赖 MySQL `AUTO_INCREMENT`（本项目多为雪花） |
| 短文本 | `VARCHAR(n)` | 前缀索引 `col(191)` 写进统一契约 |
| 长文本 | `TEXT`（分脚本可写 `CLOB`） | 业务契约绑定 `MEDIUMTEXT`/`LONGTEXT` |
| 时间 | `TIMESTAMP` + 应用层维护 `updated_at` | 依赖 `ON UPDATE CURRENT_TIMESTAMP` |
| 布尔/状态 | `SMALLINT`（0/1） | 仅 MySQL 的 `TINYINT(1)` 当作跨库类型 |
| JSON | **分脚本**：MySQL `JSON` / PG `JSONB` / Oracle `CLOB`（或 JSON） | 业务 SQL 大量使用 JSON 函数 |

说明：现有 MySQL 表可继续用 `TINYINT`；翻译到 PG/Oracle 时映射为 `SMALLINT` / `NUMBER(3)`，不要求立刻改 MySQL 权威脚本。

---

## 运行时函数映射

| 语义 | MySQL | PostgreSQL | Oracle | `SqlDialectHelper` |
|------|-------|------------|--------|---------------------|
| 空值 | `IFNULL` | `COALESCE` | `NVL` | `ifNull`（已实现） |
| 当前时间 | `NOW()` | `NOW()` | `SYSTIMESTAMP` | `currentTimestamp`（已实现） |
| 取日期 | `DATE(x)` | `CAST(x AS DATE)` | `TRUNC(x)` | `dateOf`（已实现） |
| N 天前 | `DATE_SUB(NOW(), INTERVAL n DAY)` | `NOW() - INTERVAL 'n days'` | `SYSTIMESTAMP - NUMTODSINTERVAL` | `timestampDaysAgo`（已实现） |
| 限制行数 | `LIMIT n` | `LIMIT n` | `FETCH FIRST n ROWS ONLY` | `limitClause`（已实现） |
| Upsert | `ON DUPLICATE KEY` | `ON CONFLICT` | `MERGE` | `onDuplicateKeyUpdate`（MySQL/PG）；`mergeInto`（占位，生产交付 Task 2） |
| 模糊拼接 | `CONCAT('%', x, '%')` | 同左或 `\|\|` | `\|\|` / `CONCAT` | Mapper 宜用 `concat` 或 `databaseId` |

---

## MySQL → PostgreSQL（DDL 要点）

| MySQL | PostgreSQL |
|-------|------------|
| `` `col` `` | 小写无引号或 `"col"` |
| `DATABASE` | `SCHEMA`（本项目用 schema 隔离 BC） |
| `TINYINT` | `SMALLINT` |
| `DATETIME` / `ON UPDATE CURRENT_TIMESTAMP` | `TIMESTAMP`；更新由应用层 |
| `LONGTEXT` / `MEDIUMTEXT` | `TEXT` |
| `JSON` | `JSONB`（优先） |
| `ENGINE=InnoDB ... COMMENT` | 去掉；注释用 `COMMENT ON` |
| `UNIQUE KEY uk (a, b(191))` | `UNIQUE (a, b)` |
| `AUTO_INCREMENT` | `GENERATED ...` 或雪花（本项目多为雪花） |
| `FULLTEXT KEY` | 跳过；检索用 ES/应用 |
| `ON DUPLICATE KEY UPDATE` | 应用层 helper / `ON CONFLICT` |

---

## MySQL → Oracle（DDL 要点）

| MySQL | Oracle |
|-------|--------|
| 多库 | 多用户 / 多 schema |
| `TINYINT` / `SMALLINT` | `NUMBER(3)` / `NUMBER(5)` |
| `BIGINT` | `NUMBER(19)` |
| `VARCHAR(n)` | `VARCHAR2(n)` |
| `TEXT` / `LONGTEXT` | `CLOB` |
| `DATETIME` / `TIMESTAMP` | `TIMESTAMP` |
| `LIMIT n` | `FETCH FIRST n ROWS ONLY`（12c+） |
| `IFNULL` | `NVL` |
| `DATE(col)` | `TRUNC(col)` |
| `ON DUPLICATE KEY` | `MERGE`（生产交付实现） |
| `JSON` | `CLOB` 或原生 JSON（版本相关） |

---

## 目录状态

| 目录 | 状态 |
|------|------|
| `mysql/` | 权威、可部署 |
| `postgresql/` | 翻译稿 + `verify-pg-schema.ps1` 冒烟 PASS；待生产级校对（计划 Task 4） |
| `oracle/` | 仅 README；DDL 待计划 Task 5 |

切换 `KB_DB_TYPE` 前必须：补齐并验证目标方言 DDL、引入驱动、确认 Mapper/`SqlDialectHelper` 覆盖业务 SQL。

### 重新生成 PG 翻译稿

```powershell
cd backend/sql/schema
py -3 _tools/mysql_to_pg.py
```

注意：脚本会覆盖除 `kb_intelligence.sql` 外的同名生成文件；生成后请抽查 `VARCHAR(n)`、UNIQUE、DROP CASCADE、索引名表前缀。
