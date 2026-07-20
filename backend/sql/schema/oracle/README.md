# Oracle schema（占位）

本目录为 **多方言地基** 占位，**尚未提供可执行 DDL**。

- 权威 MySQL DDL：见同级 `../mysql/`
- 切换 `KB_DB_TYPE=oracle` 前必须：
  1. 补齐本目录建用户/表空间/建表脚本
  2. 处理 Mapper 与内嵌 SQL 方言差异（`IFNULL`→`NVL`、分页、`MERGE` 等）
  3. 在业务模块引入 `com.oracle.database.jdbc:ojdbc11`（父 POM 已管理版本）

一部署一方言；勿与 MySQL/PostgreSQL 混用同一套连接配置。
