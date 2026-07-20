# Oracle schema（占位）

本目录 **尚未提供可执行 DDL**。转换要点见 [../DIALECT_CONVERSION.md](../DIALECT_CONVERSION.md)。

切换 `KB_DB_TYPE=oracle` 前必须：

1. 补齐建用户/表空间/建表脚本
2. 处理 `MERGE`（`SqlDialectHelper.onDuplicateKeyUpdate` 对 Oracle 仍抛 Unsupported）
3. Mapper 中 `LIMIT`/`DATE`：Java 侧已可用 `limitClause`/`dateOf`；XML 需 `databaseId=oracle` 或改写
4. 引入 `com.oracle.database.jdbc:ojdbc11`（父 POM 已管理版本）

一部署一方言；勿与 MySQL/PostgreSQL 混用。
