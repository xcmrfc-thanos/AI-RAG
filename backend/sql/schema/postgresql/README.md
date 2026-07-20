# PostgreSQL schema

翻译稿由 `_tools/mysql_to_pg.py` 从 `../mysql/` 生成（`kb_intelligence.sql` 为人工试点，脚本会跳过）。

## 文件

| 文件 | 说明 |
|------|------|
| `00_create_schemas.sql` | 创建 BC schema + 可选角色 |
| `install_all.sql` | `\i` 顺序装载各 BC |
| `kb_*.sql` | 各 BC 建表（翻译稿） |
| `../DIALECT_CONVERSION.md` | 类型映射说明 |

## 使用

```bash
psql -U postgres -f 00_create_schemas.sql
psql -U postgres -f install_all.sql
```

切换 `KB_DB_TYPE=postgresql` 前还须：

1. 在目标 PG 实例上验证本目录脚本（当前为机械翻译，**未**保证生产可用）
2. 业务模块引入 `org.postgresql:postgresql`（父 POM 已管理版本）
3. JDBC URL / `currentSchema`；Core 多数据源同一方言
4. 确认 upsert / DATE / LIMIT 已走 `SqlDialectHelper` 或 Mapper `databaseId`

**重新生成翻译稿**（会覆盖除 `kb_intelligence.sql` / `00_create_schemas.sql` 外的生成文件）：

```powershell
py -3 ..\_tools\mysql_to_pg.py
```

当前默认部署请继续使用 MySQL。
