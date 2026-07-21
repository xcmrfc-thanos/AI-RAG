# 全栈 Docker Compose 交付设计

> **日期**：2026-07-21  
> **状态**：已批准（2026-07-21）  
> **背景**：本地仅中间件容器化，业务 JVM/前端在宿主机；需同时支持「开发用中间件栈」与「客户/演示全栈一键起」

## 1. 目标

1. **两套 Compose 并存**，互不强制合并：
   - 现有 `deploy/docker-compose.yml`：仅中间件（本地 JVM + `npm run dev` 不变）
   - 新增 `deploy/docker-compose.full.yml`：中间件 + 全部业务服务 + 前端
2. **首次启动自动**：MySQL 建库建表；Nacos 导入配置模板；可选样例 DML；ES/RustFS 基础初始化
3. **API Key**：与中间件密码一样，**支持写在 `deploy/.env`，由 init/`import-nacos` 展开进 Nacos**；之后也可在 Nacos 控制台改完再重启容器。系统设置页第一期仍不写密钥
4. **保持 `deploy/.env`**：Compose 端口/中间件密码 + LLM 相关 Key 的交付入口；微服务运行时仍读 **Nacos**（由 `.env` 灌入）

## 2. 非目标（第一期）

- 不做设置页 ↔ Nacos 双向同步，不做 Admin 录入 API Key
- 不做 Kubernetes / Helm
- 不做「超级镜像」单容器多 JVM
- 不要求本机中间件 compose 与 full 同时占用同一套宿主机端口（文档约定二选一）
- 不把 `deploy/.env` 提交进 git；不把真实密钥写进镜像层（构建参数也不打进镜像）

## 3. 配置分层（保持现状语义）

| 层 | 文件/位置 | 职责 |
|----|-----------|------|
| 部署开关 | `deploy/.env`（自 `env.example` 复制） | 宿主机端口、中间件账号密码、JVM 堆、**QWEN/DEEPSEEK/SILICONFLOW/RAG_* API Key** |
| 应用配置 | Nacos DataId（自 `backend/nacos/*-dev.yaml.template` 导入） | 数据源、`qwen.api-key` 等；由 import **从 `.env` 展开**后发布；微服务启动后真正读取 |
| 管理面热读 | `kb_system_config` + Redis | TopK、重排开关/mode 等；**不含** API Key |

**Key 录入（两条等价路径，推荐 ①）：**

1. **交付默认**：在 `.env` 填写 `QWEN_API_KEY` 等 → `kb-init` / `import-nacos` 展开进 Nacos → 业务容器起来即带 Key（与现网 `import-nacos.ps1` 行为一致）
2. **事后修改**：Nacos 控制台改 DataId → `restart kb-intelligence kb-agent`；或改 `.env` 后**显式再跑一次**导入再重启（首次 init 标志位存在时不会自动覆盖，见 §6.2）

## 4. Compose 结构

### 4.1 保留：`docker-compose.yml`

- 现状不变：mysql / redis / rabbitmq / mongodb / elasticsearch / neo4j / rustfs / nacos；（可选）qdrant
- MySQL 首次初始化仍挂载 `backend/sql/schema/mysql` + `deploy/mysql/init-schema.sh`
- 供 `setup.ps1` + `start-services.ps1` 本地开发使用

### 4.2 新增：`docker-compose.full.yml`

独立文件（方案 A），内含：

| 服务组 | 容器 | 说明 |
|--------|------|------|
| 中间件 | 与现网同构（可复制定义或文档要求与 yml 同步） | 容器内互访用服务名（如 `mysql:3306`），宿主机端口仍用 `.env` 映射 |
| 业务 | `kb-gateway` `kb-core` `kb-intelligence` `kb-file` `kb-statistics` `kb-agent` | 各一镜像；依赖 Nacos/MySQL healthy |
| 前端 | `kb-web` | Nginx 反代到 gateway |
| 初始化 | `kb-init`（oneshot） | 等 Nacos/MySQL ready → 导入 Nacos 模板 → 可选 DML / ES / RustFS |

**网络**：同一 compose project network；业务环境变量中 `NACOS_ADDR=nacos:8848`（容器内端口），勿写宿主机 `127.0.0.1:20848`。

**与本地栈冲突**：full 与「仅中间件 + 宿主机 JVM」勿并行使用同一 `COMPOSE_PROJECT_NAME`/同一端口；文档写明先 `down` 再换栈。

## 5. 镜像与构建

当前仓库 **无** Dockerfile，第一期新增：

| 产物 | 构建方式 |
|------|----------|
| 后端 6 服务 | 多阶段：Maven 构建 fat jar → `eclipse-temurin:21-jre`；可用统一 `deploy/docker/Dockerfile.backend` + `ARG MODULE` |
| 前端 | `node` build → `nginx:alpine`；`deploy/docker/Dockerfile.frontend` |
| init | 轻量镜像（curl/bash 或小 JDK）跑导入脚本；优先 **shell + curl** 调 Nacos Open API，避免依赖宿主机 PowerShell |

构建入口（示例）：

```text
deploy/scripts/build-images.ps1   # 或 .sh
docker compose -f docker-compose.full.yml build
```

镜像标签建议：`ai-rag/kb-core:local` 等，版本可后续再钉。

## 6. 自动导入

### 6.1 数据库

- **DDL**：沿用 MySQL 首次 `docker-entrypoint-initdb.d`（空数据卷才执行）
- **DML**：full 默认执行样例种子（`sql/data/*.sql`），可用 compose profile 或环境变量 `SKIP_SAMPLE_DATA=true` 跳过
- 已有数据卷不重复跑 init；补丁用 `sql/patch/` 人工或后续运维文档

### 6.2 Nacos

- `kb-init` 将 `backend/nacos/*.template` 发布到 namespace（默认 `knowledge`）
- 展开规则与现网 `import-nacos.ps1` 一致：读 compose 注入的环境变量 / 挂载的 `.env`，展开 `${VAR:default}`；Key 未填则写入空（服务可起，调 LLM 再失败）
- **幂等**：命名卷标志位 `nacos_bootstrapped`，**默认仅首次**全量导入（避免空 `.env` 再次 init 冲掉已在 Nacos 手改的 Key）
- **强制重导**：提供 `FORCE_NACOS_IMPORT=true`（或独立 oneshot profile）——改完 `.env` 里的 Key 后可主动再灌一遍再 restart

### 6.3 ES / RustFS

- 复用现有 init 逻辑（索引模板 / bucket），由 `kb-init` 在容器网络内调用

## 7. 对外端口（全栈）

与现网习惯对齐（均可被 `.env` 覆盖）：

| 入口 | 默认宿主机端口 |
|------|----------------|
| 前端 | 3002（或 80→容器 80，文档二选一；建议 **3002** 与现网一致） |
| 网关 | 18080（可选不暴露，仅前端反代） |
| Nacos UI | 20848（可选事后改配置） |
| MySQL 等 | 保持 20000–21000 段，便于与宿主机工具联调 |

## 8. 运维手册要点（写入 deploy README 小节）

```text
# 全栈（演示/交付）
cd deploy
copy env.example .env
# 编辑 .env：中间件密码 + QWEN_API_KEY / DEEPSEEK_API_KEY / SILICONFLOW_API_KEY 等
docker compose -f docker-compose.full.yml up -d --build
# init 会把 .env 中的 Key 展开进 Nacos；之后业务容器直接可用

# 事后只改 Key（任选）
# A) 改 .env 后 FORCE_NACOS_IMPORT=true 再跑 init，然后 restart intelligence/agent
# B) Nacos 控制台改 DataId → restart kb-intelligence kb-agent

# 本地开发（保持现状）
docker compose up -d
.\setup.ps1                    # import-nacos 同样从 .env 展开 Key
.\start-services.ps1
```

## 9. 验收标准

1. 空机（仅 Docker）执行 full compose，无需本机 JDK/Node，可打开前端登录页（`admin` / `admin123` 在导入样例时）
2. `.env` 填入有效 Key 后 full 首次 up，Nacos 中对应字段非空，RAG/对话可用（无需再手填 Nacos）
3. Key 留空时服务可启动；聊天/向量失败信息明确
4. 事后改 Nacos 或 `FORCE_NACOS_IMPORT` 重导 + restart 均可更新 Key
5. 原 `docker-compose.yml` + 宿主机 JVM 路径回归不受破坏
6. `.env` 与密钥不进入镜像与 git

## 10. 实现分期建议

| 阶段 | 内容 |
|------|------|
| P0 | Dockerfile（backend×6 + frontend）+ `docker-compose.full.yml` 骨架 + 健康检查依赖 |
| P1 | `kb-init`（读 `.env` 展开进 Nacos 首次导入 + 可选 DML + ES/RustFS + FORCE 重导） |
| P2 | README/交付说明 + 冒烟脚本适配（容器网络 URL） |
| P3（可选） | 预构建镜像发布、CI build、Qdrant profile |

## 11. 已确认决策

- 两套 Compose（非 override 叠层）
- **API Key 与中间件密码一样可写在 `.env`，启动时导入 Nacos**；也可事后改 Nacos + 重启
- 设置页第一期不写 Key；不做设置 ↔ Nacos 双向同步
- 微服务运行时读 Nacos；`.env` 是交付录入与 Compose 参数入口
