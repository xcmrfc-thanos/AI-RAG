# AI-RAG 本地 Docker 基础环境

> 宿主机端口统一在 **20000-21000** 段，定义见 `.env`

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

## 一键部署

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
- 业务服务端口不变：gateway 8080、core 8090、intelligence 8091、file 8084、statistics 8085、agent 8092
- Nacos 控制台：http://127.0.0.1:20848/nacos

## 切库检查清单（MySQL 默认 / PostgreSQL / Oracle）

默认 **MySQL**，业务代码不按客户 fork。切库 = 换配置 + 对应初始化脚本。

1. **选方言**：`KB_DB_TYPE=mysql|postgresql|oracle`（`deploy/.env` 与 Nacos `kb.db.type`）
2. **装 DDL**：MySQL 走 setup；PG 用 `backend/sql/schema/postgresql/`；Oracle 用 `backend/sql/schema/oracle/`（可先跑 `verify-*-schema.ps1`）
3. **改数据源**：对照 `deploy/profiles/*.env.example` 改各 `backend/nacos/*-dev.yaml.template` 的 driver/url/user（Core 三个源一起改）
4. **导入配置**：`.\scripts\import-nacos.ps1`
5. **重启服务**：`.\stop-services.ps1` 后 `.\start-services.ps1`；冒烟 `verify-all` / 关键 API

一部署一方言，勿混用。

### PostgreSQL 最小全栈冒烟

```powershell
cd deploy
.\scripts\smoke-pg-stack.ps1
# 仅起库：docker compose -f docker-compose.pg.yml up -d
# 停库：docker compose -f docker-compose.pg.yml down
```

脚本会导入 `backend/sql/schema/postgresql/` 并跑 `PgStatisticsJdbcIT`（统计宽表 upsert + 读回）。
