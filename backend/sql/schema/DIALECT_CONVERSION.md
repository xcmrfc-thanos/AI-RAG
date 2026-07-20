# 方言 DDL 转换指南

权威 DDL：**`schema/mysql/`**。其它方言由本指南 + 试点脚本渐进补齐。

## MySQL → PostgreSQL（要点）

| MySQL | PostgreSQL |
|-------|------------|
| `` `col` `` | `"col"` 或小写无引号 |
| `DATABASE` | `SCHEMA`（本项目用 schema 隔离 BC） |
| `TINYINT` | `SMALLINT` |
| `DATETIME` / `ON UPDATE CURRENT_TIMESTAMP` | `TIMESTAMP`；更新触发器用应用层或 trigger |
| `LONGTEXT` | `TEXT` |
| `JSON` | `JSONB`（优先） |
| `ENGINE=InnoDB ... COMMENT` | 去掉；注释用 `COMMENT ON` |
| `UNIQUE KEY uk (a, b(191))` | `UNIQUE (a, b)`（注意长度前缀索引） |
| `AUTO_INCREMENT` | `GENERATED ...` 或应用雪花 ID（本项目多为雪花，无 AI） |
| `` `ON DUPLICATE KEY UPDATE` `` | 应用层 `SqlDialectHelper` / `ON CONFLICT` |

## MySQL → Oracle（要点）

| MySQL | Oracle |
|-------|--------|
| 多库 | 多用户 / 多 schema |
| `TINYINT` | `NUMBER(3)` |
| `DATETIME` | `TIMESTAMP` |
| `LIMIT n` | `FETCH FIRST n ROWS ONLY`（12c+） |
| `IFNULL` | `NVL` / `COALESCE` |
| `DATE(col)` | `TRUNC(col)` |
| `ON DUPLICATE KEY` | `MERGE`（助手尚未实现） |
| `JSON` | `JSON` 类型或 `CLOB`（版本相关） |

## 试点 / 翻译状态

| 目录 | 状态 |
|------|------|
| `mysql/` | 权威、可部署 |
| `postgresql/00_create_schemas.sql` + `install_all.sql` + 各 `kb_*.sql` | **翻译稿可执行审阅**（`kb_intelligence` 为人工试点；其余由 `_tools/mysql_to_pg.py` 生成） |
| `oracle/` | 仅 README，无 DDL |

切换 `KB_DB_TYPE` 前必须：补齐并验证目标方言 DDL、引入驱动、确认 Mapper/`SqlDialectHelper` 覆盖业务 SQL。

### 重新生成 PG 翻译稿

```powershell
cd backend/sql/schema
py -3 _tools/mysql_to_pg.py
```

注意：脚本会覆盖除 `kb_intelligence.sql` 外的同名生成文件；生成后请抽查 `VARCHAR(n)`、UNIQUE、DROP CASCADE。
