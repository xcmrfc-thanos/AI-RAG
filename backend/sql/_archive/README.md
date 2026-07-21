# SQL 本地归档（不入库）

本目录由 `.gitignore` 忽略（仅本 `README.md` 可跟踪说明）。

| 子目录 | 说明 |
|--------|------|
| `master-sql/` | 早期单体/演进脚本、alter、全库 export；**新环境勿执行** |
| `migration/` | 历史一次性对齐脚本；权威 DDL 已在 `../schema/mysql/` |

## 现行路径

- DDL：`backend/sql/schema/{mysql,postgresql,oracle}/`
- 样例种子：`backend/sql/data/`
- 已有库补丁：`backend/sql/patch/`
- 安装：`install_all.bat` / `deploy/scripts/import-schema.ps1` / `import-dev-data.ps1`

旧 export 灌数脚本（可选）：`deploy/scripts/_archive/import-master-export.ps1`（指向本目录 `master-sql`）。
