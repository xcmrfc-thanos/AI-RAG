# 4 BC 架构部署手册（P3-2）

> **环境说明（2026-07-10）**：本地 Docker 中间件栈已就绪（`deploy/`）；**无历史数据**，`stat_*` 空表起步经 MQ 增量写入。  
> 架构详见 [rh-cha.md](./rh-cha.md)、[service-merge-plan.md](./service-merge-plan.md)。

---

## 零、本地一键环境（推荐）

### 0.1 Docker 中间件

```powershell
cd deploy
.\setup.ps1                    # compose up + SQL 样例 + Nacos + RustFS bucket + ES 索引
# 或分步：
docker compose --env-file .env up -d
.\scripts\import-dev-data.ps1
.\scripts\import-nacos.ps1
.\scripts\init-rustfs.ps1
.\scripts\init-es.ps1
```

端口与账号见 [deploy/README.md](../../deploy/README.md) 及 `deploy/.env`（宿主机 **20000–21000** 段）。

| 服务 | 宿主机端口 | 账号 |
|------|-----------|------|
| MySQL | 20006 | root / 123456 |
| Redis | 20079 | susan123 |
| RabbitMQ | 20572 / 控制台 20156 | admin / susan123 |
| MongoDB | 20017 | mongodb / susan123 |
| Elasticsearch | 20920 | elastic / susan123 |
| Neo4j | 20474 / Bolt 20687 | neo4j / susan123 |
| **RustFS**（S3 兼容，替代 MinIO） | 20090 / 控制台 20091 | rustfsadmin / rustfsadmin |
| Nacos | 20848 / gRPC **21848** | 本地已关闭鉴权 |

对象存储 bucket：`kb-files`（kb-file 默认）。

### 0.2 微服务（JVM 256m/512m）

```powershell
cd deploy
$env:JAVA_HOME='D:\Users\environments\Java21'
.\start-services.ps1                              # 顺序：file → core → intelligence → statistics → gateway
.\start-services.ps1 -Only intelligence          # 仅启动单个
```

日志：`deploy/logs/`。  
**注意**：intelligence 若遇 MyBatis mapper 重复，先执行 `mvn clean install -pl kb-intelligence/kb-intelligence-app -am -DskipTests`。

### 0.3 前端

```powershell
cd frontend
npm install    # 首次
npm run dev    # http://localhost:3002 ，/api 代理 → gateway:8080
```

样例账号（已导入 DML）：`admin` / `admin123`。

---

## 一、领域服务一览

| BC | Nacos 服务名 | 端口 | 模块 | 说明 |
|----|--------------|------|------|------|
| **Core** | `kb-core` | 8090 | `kb-core/kb-core-app` | auth + document + foundation |
| **Intelligence** | `kb-intelligence` | 8091 | `kb-intelligence/kb-intelligence-app` | ai + search + graph |
| **Media** | `kb-file` | 8084 | `kb-file` | 文件存储（RustFS S3） |
| **Analytics** | `kb-statistics` | 8085 | `kb-statistics` | 统计投影（无跨库 VIEW） |
| 网关 | `kb-gateway` | 8080 | `kb-gateway` | 统一入口 |
| 前端 | — | 3002 | `frontend` | Vite + React |

旧六服务已归档至 `backend/_archive/`，**禁止部署**。

---

## 二、网关路由（4 BC，P2-7 已收敛）

| 路径前缀 | 目标 |
|----------|------|
| `/api/auth/**`、`/api/document/**`、foundation 路径、`/ws/**` | `lb://kb-core` |
| `/api/ai/**`、`/api/search/**`、`/api/graph/**` | `lb://kb-intelligence` |
| `/api/file/**` | `lb://kb-file` |
| `/api/statistics/**` | `lb://kb-statistics` |

配置位置：`backend/kb-gateway/src/main/resources/application.yml`

---

## 三、中间件依赖

| 中间件 | 用途 | 涉及 BC | 本地地址 |
|--------|------|---------|----------|
| MySQL | 业务库 + 统计投影 | Core / File / Statistics / Intelligence | 127.0.0.1:20006 |
| MongoDB | 文档正文 | Core | 127.0.0.1:20017 |
| Redis | 缓存 / 会话 | Core / Intelligence / Statistics / Gateway | 127.0.0.1:20079 |
| RabbitMQ | 文档生命周期 / 统计投影 / 操作日志 | Core / Intelligence / Statistics | 127.0.0.1:20572 |
| Elasticsearch | 检索 / 向量 | Intelligence | 127.0.0.1:20920 |
| Neo4j | 知识图谱 | Intelligence | bolt://127.0.0.1:20687 |
| **RustFS** | 对象存储（S3） | kb-file | 127.0.0.1:20090 |
| Nacos | 配置 + 注册 | 全部 | 127.0.0.1:20848 |

---

## 四、MySQL 库清单

| 库名 | 归属 |
|------|------|
| `kb_user` | Core IAM |
| `kb_document` | Core Document |
| `kb_foundation` | Core Platform |
| `kb_file` | kb-file |
| `kb_statistics` | kb-statistics（含 `stat_*` 投影表） |
| `kb_intelligence` | kb-intelligence |

**统计库**：`kb_statistics.sql` 已含日统计表、浏览历史、`stat_*` MQ 投影表（空表起步，无历史迁移）。

```powershell
cd backend\sql
.\install_all.bat          # Windows：建库建表
.\install_dev_data.bat     # 可选：样例数据
```

完整说明见 [backend/sql/README.md](../../backend/sql/README.md)。

---

## 五、Nacos 配置（DataId）

| DataId | Group | 说明 |
|--------|-------|------|
| `kb-gateway-dev.yaml` | KNOWLEDGE_BASE | 网关覆盖项（可选） |
| `kb-core-dev.yaml` | KNOWLEDGE_BASE | Core 三数据源 + Mongo + MQ |
| `kb-intelligence-dev.yaml` | KNOWLEDGE_BASE | Intelligence 单库 + ES + Neo4j |
| `kb-file-dev.yaml` | KNOWLEDGE_BASE | 文件服务 + RustFS S3 |
| `kb-statistics-dev.yaml` | KNOWLEDGE_BASE | 统计库 + Redis + MQ |

模板路径与导入：[backend/nacos/README.md](../../backend/nacos/README.md)  
本地导入脚本：`deploy/scripts/import-nacos.ps1`  
本地 Docker Nacos **已关闭鉴权**，微服务 `application.yml` 无需 username/password。

---

## 六、编译自检

```powershell
$env:JAVA_HOME='D:\Users\environments\Java21'
cd backend
mvn compile -pl kb-gateway,kb-core/kb-core-app,kb-intelligence/kb-intelligence-app,kb-file,kb-statistics -am
```

---

## 七、启动顺序

### 7.1 中间件

```
Docker Compose（deploy/setup.ps1）
  → MySQL / Redis / RabbitMQ / MongoDB / ES / Neo4j / RustFS / Nacos
```

### 7.2 业务服务

```
kb-file(8084) → kb-core(8090) → kb-intelligence(8091) → kb-statistics(8085) → kb-gateway(8080) → frontend(3002)
```

验证：

- 网关：http://127.0.0.1:8080
- 前端：http://127.0.0.1:3002
- Nacos：http://127.0.0.1:20848/nacos

---

## 八、相关文档

- [deploy/README.md](../../deploy/README.md) — Docker 端口与脚本
- [p3-3-operations.md](./p3-3-operations.md) — 运行手册与监控
- `backend/kb-gateway/GATEWAY_CORE_CUTOVER.md`
- `backend/kb-gateway/GATEWAY_INTELLIGENCE_CUTOVER.md`
- `docs/after/p2-7-legacy-offline.md`
- `docs/after/p1-7-legacy-offline.md`
