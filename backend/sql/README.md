# 数据库脚本（4 BC 全新项目）

```text
backend/sql/
├── install_all.bat / .sh       # 建库建表（默认 MySQL）
├── install_dev_data.bat / .sh  # 可选样例数据
├── schema/
│   ├── mysql/                  # 现行权威 DDL
│   ├── postgresql/             # 占位（地基阶段无 DDL）
│   └── oracle/                 # 占位（地基阶段无 DDL）
├── data/                       # 样例 DML
└── es/                         # Elasticsearch 索引
```

方言开关：`KB_DB_TYPE=mysql|postgresql|oracle`（默认 mysql）。详见  
[docs/superpowers/plans/2026-07-20-db-multi-dialect-foundation.md](../../docs/superpowers/plans/2026-07-20-db-multi-dialect-foundation.md)。

## 安装（MySQL）

```bash
cd backend/sql
install_all.bat
install_dev_data.bat   # 可选
```

Docker 首次初始化挂载 `schema/mysql`（见 `deploy/docker-compose.yml`）。

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

## data/（可选）

默认管理员：**admin / admin123**
