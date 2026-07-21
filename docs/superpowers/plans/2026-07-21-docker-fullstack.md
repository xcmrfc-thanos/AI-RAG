# 全栈 Docker Compose Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or implement task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 交付 `docker-compose.full.yml`：中间件 + 6 业务 + 前端 + init；`.env` Key 灌 Nacos；本地中间件 compose 不变。

**Architecture:** `include` 复用现有中间件 compose；统一 `Dockerfile.backend`（ARG MODULE）+ `Dockerfile.frontend`；`kb-init` 容器用 bash/curl 移植 `import-nacos`；Nacos 模板与 `application.yml` 中主机改为 `${VAR:本地默认}`，全栈注入 docker 服务名。

**Tech Stack:** Docker Compose、JRE 21、Nginx、Nacos Open API、现有 Maven 多模块

**Spec:** `docs/superpowers/specs/2026-07-21-docker-fullstack-design.md`

---

## 文件地图

| 文件 | 职责 |
|------|------|
| `deploy/docker/Dockerfile.backend` | 多阶段构建指定 MODULE fat jar |
| `deploy/docker/Dockerfile.frontend` | Vite build + nginx |
| `deploy/docker/Dockerfile.init` | curl/bash + mysql client 跑 init |
| `deploy/docker/nginx.conf` | `/api` → kb-gateway |
| `deploy/docker/init/entrypoint.sh` | 首次导入 Nacos/DML/ES/RustFS |
| `deploy/docker/init/import-nacos.sh` | 展开 `.env` + 发布配置 |
| `deploy/docker-compose.full.yml` | include 中间件 + apps + init + web |
| `backend/nacos/*.template` | 主机/端口占位符 |
| `backend/**/application.yml`（6 活跃服务） | `NACOS_SERVER_ADDR` / `NACOS_DISCOVERY_IP` |
| `deploy/env.example` + README | 全栈变量与用法 |
| `deploy/profiles/fullstack.env.example` | docker 网络主机名样例 |

---

### Task 1: 参数化 Nacos / application.yml

- [ ] 模板：`MYSQL_HOST/PORT`、`REDIS_*`、`RABBITMQ_*`、`ES_URL`、`NEO4J_URI`、服务间 URL 等，默认值保持本机 `127.0.0.1:20xxx`
- [ ] 6 个活跃服务 `application.yml`：`server-addr: ${NACOS_SERVER_ADDR:127.0.0.1:20848}`，`ip: ${NACOS_DISCOVERY_IP:127.0.0.1}`

### Task 2: Dockerfiles

- [ ] `Dockerfile.backend`：context=repo root；`ARG MODULE`；`mvn -pl $MODULE -am package -DskipTests`；JRE 跑 jar
- [ ] `Dockerfile.frontend`：`VITE_API_BASE_URL=/api`；nginx 反代
- [ ] `Dockerfile.init`：基于 `curlimages/curl` 或 `mysql:8` 客户端镜像组合脚本

### Task 3: compose.full + init

- [ ] `docker-compose.full.yml` include `docker-compose.yml`；业务依赖 nacos/mysql healthy；init 完成后 apps 启动（`service_completed_successfully`）
- [ ] init：标志卷仅首次；`FORCE_NACOS_IMPORT`；env 注入 docker 主机名
- [ ] 业务 env：`NACOS_SERVER_ADDR=nacos:8848`，`NACOS_DISCOVERY_IP=<service-name>`

### Task 4: 文档

- [ ] `deploy/README.md` 全栈小节；`env.example` 注释；`readme_plan.md`；spec 状态改为已确认

### Task 5: 冒烟（本机有 Docker 时）

- [ ] `docker compose -f docker-compose.full.yml config` 校验
- [ ] 可选：build 单服务验证 Dockerfile 语法
