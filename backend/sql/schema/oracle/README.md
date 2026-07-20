# Oracle schema（首版翻译稿）

由 `_tools/mysql_to_oracle.py` 自 `../mysql/` 生成；权威 DDL 仍为 MySQL。转换要点见 [../DIALECT_CONVERSION.md](../DIALECT_CONVERSION.md)。

## 文件

| 文件 | 说明 |
|------|------|
| `00_create_users.sql` | 创建 BC 用户（多 schema） |
| `install_all.sql` | sqlplus `@@` 顺序装载 |
| `kb_*.sql` | 各 BC 建表（`schema.table` 限定名，供 SYSTEM 装载） |
| `kb_notification_template.sql` | 模板表重建 + INSERT ALL 种子 |

## 使用

```text
sqlplus system/<pwd>@//host:1521/XEPDB1 @00_create_users.sql
sqlplus system/<pwd>@//host:1521/XEPDB1 @install_all.sql
```

切换 `KB_DB_TYPE=oracle` 前还须：

1. 在目标实例验证本目录脚本（或跑冒烟门禁）
2. 业务模块引入 `com.oracle.database.jdbc:ojdbc11`（父 POM 已管理）
3. JDBC：`jdbc:oracle:thin:@//host:1521/XEPDB1`，按模块用户/多数据源配置
4. Upsert 走 `SqlDialectHelper.upsertSql`（MERGE）；Mapper 使用 `databaseId=oracle`

**重新生成翻译稿**（会覆盖除 `00_create_users.sql` / `install_all.sql` / 手工 `kb_notification_template.sql` 外的生成文件——通知模板建议生成后用仓库内手工版覆盖）：

```powershell
py -3 ..\_tools\mysql_to_oracle.py
# 然后恢复/核对 kb_notification_template.sql（INSERT ALL）
```

**Docker 冒烟**（需能拉取 `gvenzl/oracle-xe`；失败则脚本 **SKIP 退出 0**，属文档门禁）：

```powershell
.\deploy\scripts\verify-oracle-schema.ps1
```

默认部署请继续使用 MySQL。
