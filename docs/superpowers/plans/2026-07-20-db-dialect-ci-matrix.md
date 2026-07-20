# 数据库方言 CI / 验收矩阵（手工）

> 第三里程碑不强制流水线双库；本文件作为后续 CI 接入清单。

## 矩阵

| 检查项 | MySQL（默认） | PostgreSQL | Oracle |
|--------|---------------|------------|--------|
| 导入 DDL | `schema/mysql/*` | 试点 `postgresql/kb_intelligence` | 无 |
| `kb.db.type` | mysql / 空 | postgresql | oracle |
| 分页插件 | MYSQL | POSTGRE_SQL | ORACLE |
| IFNULL / DATE / LIMIT / UPSERT | helper 覆盖 JDBC 热点 | 同左 | UPSERT 除外 |
| 单测 | `SqlDialectHelperTest` 等 | 同左（方言参数化） | 同左 |
| 服务冒烟 | `deploy` 默认栈 | 待建 compose profile | 待建 |

## 建议后续自动化

1. Job A：现有 MySQL + `mvn test`（已有本地习惯）
2. Job B：起 PG container → 执行 `00_create_schemas.sql` + `kb_intelligence.sql` → 跑 dialect 单测（可选 Testcontainers）
3. Oracle：仅文档门禁，直至有内部 OE 镜像

仓库暂无 `.github/workflows`；Gitee 可按上表配置流水线。
