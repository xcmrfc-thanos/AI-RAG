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
