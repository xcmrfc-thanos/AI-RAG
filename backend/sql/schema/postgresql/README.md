# PostgreSQL schema

- **试点可执行**：`00_create_schemas.sql`、`kb_intelligence.sql`
- **转换规则**：见 [../DIALECT_CONVERSION.md](../DIALECT_CONVERSION.md)
- **权威 MySQL**：`../mysql/`

切换 `KB_DB_TYPE=postgresql` 前还须：

1. 补齐其余 BC 的建表脚本（user/document/file/statistics/foundation/agent）
2. 业务模块引入 `org.postgresql:postgresql`（父 POM 已管理版本）
3. JDBC URL 指向 schema 或配置 `currentSchema`；Core 多数据源同一方言
4. 确认 upsert / DATE / LIMIT 已走 `SqlDialectHelper` 或 Mapper `databaseId`

当前默认部署请继续使用 MySQL。
