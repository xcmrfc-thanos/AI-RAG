# 数据库脚本（4 BC）

```text
backend/sql/
├── install_all.bat / .sh       # 建库建表（默认 MySQL）
├── install_dev_data.bat / .sh  # 可选样例数据
├── schema/
│   ├── mysql/                  # 现行权威 DDL（Docker / install 使用）
│   ├── postgresql/
│   └── oracle/
├── data/                       # 样例 / 种子 DML（入库）
├── patch/                      # 已有库幂等补丁
├── es/                         # Elasticsearch 索引定义
└── _archive/                   # 本地历史（master-sql、migration；git 忽略）
```

方言开关：`KB_DB_TYPE=mysql|postgresql|oracle`（默认 mysql）。

## 安装（MySQL）

```bash
cd backend/sql
install_all.bat
install_dev_data.bat   # 可选
```

或 Docker：`deploy/scripts/import-schema.ps1` + `import-dev-data.ps1`。  
Compose 首次初始化挂载 `schema/mysql`（见 `deploy/docker-compose.yml`）。

## schema/mysql/

| 文件 | 库 |
|------|-----|
| `00_create_databases.sql` | 建库 |
| `kb_user.sql` | kb_user |
| `kb_document.sql` | kb_document |
| `kb_foundation.sql` | kb_foundation |
| `kb_file.sql` | kb_file |
| `kb_statistics.sql` | kb_statistics |
| `kb_favorite.sql` | kb_document |
| `kb_notification_template.sql` | kb_foundation |
| `kb_intelligence.sql` | kb_intelligence |
| `kb_agent.sql` | kb_agent |

## data/（样例种子）

默认管理员：**admin / admin123**

| 文件 | 说明 |
|------|------|
| `init_kb_user.sql` 等 | 用户/权限/文档/通知等样例 |
| `init_kb_foundation.sql` | 系统配置种子（含 Settings 热读相关项） |

## patch/（已有库）

| 文件 | 说明 |
|------|------|
| `patch_settings_hotread_seeds.sql` | 幂等补齐 Settings 热读配置；导入后重启 kb-core |

```powershell
Get-Content ..\backend\sql\patch\patch_settings_hotread_seeds.sql -Raw |
  docker exec -i <mysql容器名> mysql -uroot -p123456
```

## 已废弃（勿用于新环境）

- `sql/_archive/master-sql/`：旧编号脚本、alter、全库 export
- `sql/_archive/migration/`：历史一次性对齐
- `deploy/scripts/_archive/import-master-export.ps1`：旧 export 灌数

以上目录默认 **git 忽略**，仅本机可保留；权威以 `schema/` + `data/` + `patch/` 为准。
