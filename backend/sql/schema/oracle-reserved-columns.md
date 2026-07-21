# Oracle 保留字列（ORM / Mapper）确认清单

> 附录 O2（2026-07-21）。改列名成本高，优先在 `databaseId=oracle` 分支对列名加双引号。

## 已确认并处理

| 表 / 实体 | 列 | 活跃 Mapper | 处理 |
|-----------|-----|-------------|------|
| `kb_team` / `Team` | `level` | `TeamMapper.xml` | `Base_Column_List_Oracle` + 各查询 `databaseId=oracle`；`WHERE`/`ORDER BY` 用 `"level"` |
| `tb_category` / `Category`（kb-file） | `level` | `CategoryMapper.xml` | 同上 |

## 未改列名（有意）

- 实体字段仍名 `level`；MySQL/PG 默认 SQL 不改。
- MyBatis-Plus 默认 `insert`/`update`/`selectById` 在 Oracle 下仍可能生成未引号 `LEVEL`：Oracle 部署若走 MP 写路径，需额外 `Interceptor` 或专用 XML；当前团队/分类写路径以自定义 Service + 字段赋值为主，读路径已覆盖自定义 XML。

## 扫描范围说明

- 排除 `_archive/`。
- `access_level` 等非保留字整词不在本清单。
- `AiDocumentServiceImpl` 日志/`level` 参数为大纲层级，非 SQL 列。

## 复扫命令（本机）

```powershell
rg -n "ORDER BY level|WHERE level|, level|column=\"level\"" backend --glob "!**/_archive/**"
```
