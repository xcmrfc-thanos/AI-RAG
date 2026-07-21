# AI-RAG 本地 Docker 基础环境

> 宿主机端口统一在 **20000-21000** 段，定义见 `.env`

## 两套 Compose

| 文件 | 用途 |
|------|------|
| `docker-compose.yml` | **仅中间件**；业务用本机 `start-services.ps1` + 前端 `npm run dev` |
| `docker-compose.full.yml` | **全栈**（中间件 + 6 业务镜像 + 前端 + `kb-init`）；无需本机 JDK/Node |

勿两套同时抢同一宿主机端口；切换前先 `docker compose down`。

### 全栈一键（演示/交付）

```powershell
cd deploy
copy env.example .env
# 编辑 .env：中间件密码 + QWEN_API_KEY / DEEPSEEK_API_KEY / SILICONFLOW_API_KEY 等
docker compose -f docker-compose.full.yml --env-file .env up -d --build
# 浏览器：http://127.0.0.1:3002 ；Nacos：http://127.0.0.1:20848/nacos
# 默认账号（导入样例后）：admin / admin123
```

- `kb-init` **首次**把 `.env` 中的 Key 展开进 Nacos，并导入样例 SQL / ES 索引 / RustFS bucket
- 事后改 Key：改 `.env` 后设 `FORCE_NACOS_IMPORT=true` 再跑一次 `kb-init`，或 Nacos 控制台改完后 `docker compose -f docker-compose.full.yml restart kb-intelligence kb-agent`
- 镜像定义：`deploy/docker/Dockerfile.*`

## 端口映射

| 服务 | 宿主机端口 | 账号 |
|------|-----------|------|
| MySQL | **20006** | root / 123456 |
| Redis | **20079** | susan123 |
| RabbitMQ | **20572** / 控制台 **20156** | admin / susan123 |
| MongoDB | **20017** | mongodb / susan123 |
| Elasticsearch | **20920** | elastic / susan123 |
| Neo4j | **20474** / Bolt **20687** | neo4j / susan123 |
| RustFS | **20090** / 控制台 **20091** | rustfsadmin / rustfsadmin |
| Nacos | **20848** / gRPC **21848** | 本地开发已关闭鉴权 |
| Qdrant（可选） | HTTP **26333** / gRPC **26334** | 默认不随 setup 强制启动 |

> Neo4j：若反复出现 `Changed password...` / `Neo4j is already running` 后退出，通常是旧 `neo4j_data` 卷与 `NEO4J_AUTH` 初始化冲突。本地可 `docker compose stop neo4j && docker compose rm -f neo4j && docker volume rm ai-rag_neo4j_data && docker compose up -d neo4j`（图谱可重建）。
> 全量重建：`deploy/scripts/rebuild-neo4j-graph.ps1`，或知识图谱页「生成知识图谱」。

### 可选：开启 Qdrant 双写混合检索

默认仍为纯 ES。需要「ES BM25 + Qdrant dense」时：

```powershell
docker compose --env-file .env up -d qdrant
# Nacos / 环境变量：
# RAG_QDRANT_ENABLED=true
# QDRANT_HOST=127.0.0.1
# QDRANT_GRPC_PORT=26334
# RAG_HYBRID_FUSION=rrf          # 或 weighted
# RAG_HYBRID_BM25_WEIGHT=0.5
# RAG_HYBRID_DENSE_WEIGHT=0.5
# 然后 import-nacos + 重启 kb-intelligence，并重建索引以补齐 Qdrant 向量
```

### 检索部署形态（白名单）

进程级装配仍读 Nacos/`.env`（设置页写库/Redis **不会**改装配）。可选：

| 形态 | 关键环境变量 |
|------|----------------|
| `es-es` | `RAG_RETRIEVAL_PROFILE=es-es`（或关 Qdrant） |
| `es-qdrant` | `RAG_QDRANT_ENABLED=true` + `RAG_VECTOR_STORE=elasticsearch` |
| `qdrant-qdrant` | `RAG_VECTOR_STORE=qdrant` + `RAG_QDRANT_ENABLED=true`（需重建 named dense+sparse） |
| `es-milvus` | `RAG_RETRIEVAL_PROFILE=es-milvus` + Milvus 可达（建议关 Qdrant） |
| `milvus-milvus` | `RAG_VECTOR_STORE=milvus`（sparse+dense，须重建 collection） |

切换形态后须重建索引。Sparse 为 Hashing BM25-lite，与 ES 真 BM25 质量不对等。

## 一键部署

```powershell
cd deploy
copy env.example .env   # 首次：填入 QWEN_API_KEY / SILICONFLOW_API_KEY 等
.\setup.ps1
```

### 本地改密钥后重启（无需手填 Nacos）

`import-nacos.ps1` 会读取 `deploy/.env`，把 `${QWEN_API_KEY:}` 等展开为实值再写入 Nacos（含 **kb-intelligence / kb-agent**）。仓库内 `.template` 仍保持占位符，不把密钥提交进 git。

**配置边界：** Admin「系统设置」写 `kb_system_config` + Redis 热读（TopK / 重排 mode·provider·model 等），**不会**改 `.env` / Nacos；密钥与进程级开关（如 `RAG_QDRANT_ENABLED`、API Key）仍走本部署通道。两通道不同步。

```powershell
cd deploy
# 1. 编辑 .env（QWEN_API_KEY / SILICONFLOW_API_KEY / RAG_EMBEDDING_* / RAG_RERANK_* 等）
.\scripts\import-nacos.ps1
.\stop-services.ps1 -IncludeFrontend
.\start-services.ps1
# 或一步：.\start-services.ps1 -ImportNacos
# 前端：cd ..\frontend; npm run dev
```

## 一键部署（完整）

```powershell
cd deploy
.\setup.ps1
```

## 手动

```powershell
docker compose --env-file .env up -d
.\scripts\import-dev-data.ps1
.\scripts\import-nacos.ps1
.\scripts\init-rustfs.ps1
.\scripts\init-es.ps1
.\scripts\rebuild-es-indices.ps1   # 删建双索引 + 可选业务回填
```

> SQL 权威：`backend/sql/schema/mysql/` + `data/` + `patch/`。历史 `master-sql` / `migration` / `import-master-export.ps1` 已挪至各目录 `_archive/`（git 忽略）。日常冒烟用 `verify-all.ps1`；带 `[DEPRECATED]` 头的 `verify-*-contract*.ps1` 仅为阶段门禁留档。

## 停止

```powershell
.\stop-services.ps1 -IncludeFrontend -IncludeDocker   # JVM + 前端 + Docker
.\stop-services.ps1                                     # 仅停 JVM 微服务
docker compose down      # 仅停 Docker（保留数据）
docker compose down -v   # 清空数据
```

Docker 编排 `restart: "no"`，容器**不会**在 Docker Desktop 重启或异常退出后自动拉起，需手动 `docker compose up -d`。

## 启动微服务（JVM 分服务调优）

| 服务 | 默认堆 | 说明 |
|------|--------|------|
| kb-intelligence | **512m / 1g** | llm + search + graph + RAG 同进程 |
| 其余 4 服务 | 256m / 512m | file / core / statistics / gateway |

```powershell
# 启动前仅校验 Java 运行时；若当前 JAVA_HOME 是 Java 8/17，脚本会优先切换到本机 Java21 目录
.\start-services.ps1 -ValidateJavaOnly

.\start-services.ps1
# 或仅启动 intelligence: .\start-services.ps1 -Only intelligence
# 覆盖 Intelligence 堆: .\start-services.ps1 -IntelligenceJvmXms 512m -IntelligenceJvmXmx 1536m
```

项目要求 Java 21。启动脚本会输出最终 `JAVA_HOME` 与 Java 主版本，并在无法找到 Java 21 时于 Maven 构建前终止。

日志目录：`deploy/logs/`。Intelligence OOM 时会在该目录生成 heap dump。

### 搜索 + RAG 压测（验收任务 35）

```powershell
.\scripts\stress-intelligence.ps1
# 直连 intelligence: .\scripts\stress-intelligence.ps1 -BaseUrl http://127.0.0.1:8091 -Direct
```

调优说明见 `backend/sql/schema/intelligence-jvm-tuning.md`。

### 联调验收冒烟

```powershell
.\scripts\verify-integration.ps1
.\scripts\verify-all.ps1          # 串联 integration / api / auth-ai / llm / admin-ui / 定向单测 / build
.\scripts\verify-auth-ai.ps1      # 鉴权与内部 HMAC 冒烟（任务 58）
```

## 说明

- 微服务 `application.yml` 与 `backend/nacos/*.template` 已同步上述端口
- 业务服务端口：gateway **18080**、core 8090、intelligence 8091、file 8084、statistics 8085、agent 8092
  （网关避开本机常见 8080 占用；可用环境变量 `GATEWAY_PORT` 覆盖）
- Nacos 控制台：http://127.0.0.1:20848/nacos

## 切库检查清单（MySQL 默认 / PostgreSQL / Oracle）

默认 **MySQL**，业务代码不按客户 fork。切库 = 换配置 + 对应初始化脚本。

1. **选方言**：`KB_DB_TYPE=mysql|postgresql|oracle`（`deploy/.env` 与 Nacos `kb.db.type`）
2. **装 DDL**：MySQL 走 setup；PG 用 `backend/sql/schema/postgresql/`；Oracle 用 `backend/sql/schema/oracle/`（可先跑 `verify-*-schema.ps1`）
3. **改数据源**：对照 `deploy/profiles/*.env.example` 改各 `backend/nacos/*-dev.yaml.template` 的 driver/url/user（Core 三个源一起改）
4. **导入配置**：`.\scripts\import-nacos.ps1`
5. **重启服务**：`.\stop-services.ps1` 后 `.\start-services.ps1`；冒烟 `verify-all` / 关键 API

一部署一方言，勿混用。

DDL 冒烟可用 `.\scripts\verify-pg-schema.ps1`（临时容器，跑完即删）；日常默认 MySQL，无需常驻 Postgres 容器。

JVM 最小 upsert 冒烟（自备库，无环境 SKIP）：

```powershell
.\scripts\verify-dialect-jvm-smoke.ps1
# 真跑示例：
# $env:SMOKE_PG_JDBC_URL = "jdbc:postgresql://127.0.0.1:5432/postgres"
# $env:SMOKE_ORACLE_JDBC_URL = "jdbc:oracle:thin:@//127.0.0.1:1522/XEPDB1"
```

Oracle 保留字列说明见 `backend/sql/schema/oracle-reserved-columns.md`。
