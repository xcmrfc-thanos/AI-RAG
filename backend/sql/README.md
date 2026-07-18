# 数据库脚本（4 BC 全新项目）

```text
backend/sql/
├── install_all.bat / .sh       # 建库建表
├── install_dev_data.bat / .sh  # 可选样例数据
├── schema/                     # 全部 DDL（9 个文件）
├── data/                       # 样例 DML（6 个文件）
└── es/                         # Elasticsearch 索引
```

## 安装

```bash
cd backend/sql
install_all.bat
install_dev_data.bat   # 可选
```

## schema/

| 文件 | 库 |
|------|-----|
| `00_create_databases.sql` | 建 6 库 |
| `kb_user.sql` | kb_user |
| `kb_document.sql` | kb_document |
| `kb_foundation.sql` | kb_foundation |
| `kb_file.sql` | kb_file |
| `kb_statistics.sql` | kb_statistics（含 stat_* 投影表） |
| `kb_favorite.sql` | kb_document |
| `kb_notification_template.sql` | kb_foundation |
| `kb_intelligence.sql` | kb_intelligence |
| `kb_agent.sql` | kb_agent（Agent 五表，任务 65） |

## data/（可选）

`init_kb_user` · `init_menu_permission` · `init_permission_resource` · `init_kb_document` · `init_kb_foundation` · `init_kb_intelligence`

默认管理员：**admin / admin123**

## ES 索引

```bash
cd es && ./create_indices.sh
```

`stat_*` 投影表空表起步，随 MQ 增量写入，无需迁移。
