# 已归档部署脚本（不入库）

| 脚本 | 说明 |
|------|------|
| `import-master-export.ps1` | 从旧 `master-sql` 全库 export 灌真实数据；新环境请用 `import-schema.ps1` + `import-dev-data.ps1` |

数据目录默认：`backend/sql/_archive/master-sql/`（本地归档，git 忽略）。
