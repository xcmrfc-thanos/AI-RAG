# 数据库方言 CI / 验收矩阵

## 矩阵

| 检查项 | MySQL（默认） | PostgreSQL | Oracle |
|--------|---------------|------------|--------|
| 导入 DDL | `schema/mysql/*` + `import-schema.ps1` | `schema/postgresql/*` + `verify-pg-schema.ps1` | 无 |
| `kb.db.type` | mysql / 空 | postgresql | oracle |
| 分页插件 | MYSQL | POSTGRE_SQL | ORACLE |
| IFNULL / DATE / LIMIT / UPSERT | helper 覆盖 JDBC 热点 | 同左 | UPSERT 除外（`mergeInto` 占位） |
| 单测 | `SqlDialectHelperTest` 等 | 同左 | 同左 |
| 服务冒烟 | `deploy` 默认栈 | DDL 容器冒烟已具备；全栈 profile 待建 | 待建 |

## 本地命令

```powershell
# MySQL（现有）
.\deploy\scripts\import-schema.ps1

# PostgreSQL DDL 冒烟（临时容器，需 Docker）
.\deploy\scripts\verify-pg-schema.ps1
```

## 建议后续自动化

1. Job A：MySQL + `mvn test`
2. Job B：`verify-pg-schema.ps1`（本里程碑已提供脚本）
3. Oracle：文档门禁，直至有 OE 镜像
