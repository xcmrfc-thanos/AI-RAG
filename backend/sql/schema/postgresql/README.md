# PostgreSQL schema（占位）

本目录为 **多方言地基** 占位，**尚未提供可执行 DDL**。

- 权威 MySQL DDL：见同级 `../mysql/`
- 切换 `KB_DB_TYPE=postgresql` 前必须：
  1. 补齐本目录建库/建表脚本
  2. 处理 Mapper 中 `LIMIT` / `NOW()` / `ON DUPLICATE KEY` 等方言 SQL
  3. 在业务模块引入 `org.postgresql:postgresql` 驱动（父 POM 已管理版本）

当前默认部署请继续使用 MySQL。
