# 数据库方言 CI / 验收矩阵

## 矩阵

| 检查项 | MySQL（默认） | PostgreSQL | Oracle |
|--------|---------------|------------|--------|
| 导入 DDL | `schema/mysql/*` + `import-schema.ps1` | `schema/postgresql/*` + `verify-pg-schema.ps1` | `schema/oracle/*` + `verify-oracle-schema.ps1`（无镜像 SKIP） |
| `kb.db.type` | mysql / 空 | postgresql | oracle |
| 分页插件 | MYSQL | POSTGRE_SQL | ORACLE |
| IFNULL / DATE / LIMIT / UPSERT | helper 覆盖 JDBC 热点 | 同左 | UPSERT → `upsertSql`/`mergeInto`（MERGE） |
| Mapper 方言 | 默认无 `databaseId` | 多数共用默认；冲突处 `postgresql` | `databaseId=oracle`（TRUNC / FETCH / MERGE） |
| 单测 | `SqlDialectHelperTest`、`StatDocumentRepositoryTest` 等 | 同左 + `PgStatisticsJdbcIT`（需冒烟脚本注入 URL） | MERGE 单测 |
| 服务冒烟 | `deploy` 默认栈 + `import-schema.ps1` | `smoke-pg-stack.ps1`（compose + JDBC upsert） | DDL 冒烟 PASS；全栈 JVM 未做 |

## 本地命令

```powershell
# MySQL（现有）
.\deploy\scripts\import-schema.ps1

# PostgreSQL DDL 冒烟（临时容器）
.\deploy\scripts\verify-pg-schema.ps1

# PostgreSQL 最小全栈（常驻 compose + 统计 JDBC IT）
.\deploy\scripts\smoke-pg-stack.ps1

# Oracle DDL 冒烟（可 SKIP）
.\deploy\scripts\verify-oracle-schema.ps1
```

切库样例：`deploy/profiles/{mysql,postgresql,oracle}.env.example`；步骤见 `deploy/README.md`。

## 建议后续自动化

1. Job A：MySQL + `mvn test` + `import-schema.ps1`
2. Job B：`verify-pg-schema.ps1` + `smoke-pg-stack.ps1`
3. Job C：`verify-oracle-schema.ps1`（允许 SKIP）
