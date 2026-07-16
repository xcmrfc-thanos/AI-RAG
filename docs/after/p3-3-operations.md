# 4 BC 运行手册与监控指南（P3-3）

> **环境说明（2026-07-10）**：本地 Docker + 5 微服务 + 前端已可启动；**无历史数据**，全新部署。  
> 部署步骤见 [p3-2-deployment.md](./p3-2-deployment.md)、[deploy/README.md](../../deploy/README.md)。

---

## 一、服务健康检查清单

### 1.1 进程与端口

| 服务 | 端口 | 检查 |
|------|------|------|
| kb-gateway | 8080 | http://127.0.0.1:8080 |
| kb-core | 8090 | http://127.0.0.1:8090/doc.html |
| kb-intelligence | 8091 | http://127.0.0.1:8091/doc.html |
| kb-file | 8084 | http://127.0.0.1:8084/doc.html |
| kb-statistics | 8085 | http://127.0.0.1:8085/doc.html |
| **frontend** | 3002 | http://127.0.0.1:3002 |

PowerShell 快速探测：

```powershell
8084,8090,8091,8085,8080,3002 | ForEach-Object {
  "$_ : $((Test-NetConnection 127.0.0.1 -Port $_ -WarningAction SilentlyContinue).TcpTestSucceeded)"
}
```

### 1.2 Nacos 注册

1. 打开 http://127.0.0.1:20848/nacos（本地 **无鉴权**）
2. Namespace：`knowledge`
3. 确认 5 个服务健康实例 ≥ 1：`kb-gateway`、`kb-core`、`kb-intelligence`、`kb-file`、`kb-statistics`
4. 开发机隔离：Group 为 `${COMPUTER_ID}` 或 `${USER}`，网关与 BC 须同 Group
5. gRPC 端口映射：**21848**（非 HTTP 20848）

### 1.3 Docker 中间件（本地）

| 容器 | 端口 | 状态检查 |
|------|------|----------|
| kb-mysql | 20006 | `docker inspect -f '{{.State.Health.Status}}' kb-mysql` |
| kb-redis | 20079 | healthy |
| kb-rabbitmq | 20572 / 20156 | 管理台 http://127.0.0.1:20156 |
| kb-mongodb | 20017 | healthy |
| kb-elasticsearch | 20920 | `GET http://127.0.0.1:20920/_cluster/health` |
| kb-neo4j | 20474 / 20687 | healthy |
| kb-rustfs | 20090 / 20091 | S3 API；控制台 20091 |
| kb-nacos | 20848 / 21848 | healthy |

---

## 二、内置监控入口

| 入口 | 地址 | 账号 | 说明 |
|------|------|------|------|
| **Druid SQL 监控** | http://127.0.0.1:8090/druid/ | admin / admin | kb-core 三数据源 |
| **Knife4j** | 各服务 `/doc.html` | — | 接口探活 |
| **Nacos** | http://127.0.0.1:20848/nacos | 无（本地） | 配置、注册 |
| **RabbitMQ** | http://127.0.0.1:20156 | admin / susan123 | 队列深度 |
| **RustFS 控制台** | http://127.0.0.1:20091 | rustfsadmin | 对象存储 |
| **ES health** | http://127.0.0.1:20920/_cluster/health | elastic / susan123 | green/yellow |
| **前端** | http://127.0.0.1:3002 | admin / admin123 | 样例账号 |

微服务日志：`deploy/logs/{服务名}.out.log` / `.err.log`

---

## 三、日常运维流程

### 3.1 启动顺序

```
deploy/setup.ps1 或 docker compose up -d
  → kb-file → kb-core → kb-intelligence → kb-statistics → kb-gateway
  → frontend: npm run dev
```

脚本：`deploy/start-services.ps1`（JVM `-Xms256m -Xmx512m`）

### 3.2 配置变更

1. 修改 Nacos DataId（见 [backend/nacos/README.md](../../backend/nacos/README.md)）或 `deploy/scripts/import-nacos.ps1` 重导
2. 发布配置后滚动重启受影响服务
3. 网关路由同步 `kb-gateway/application.yml` 与 Nacos 模板

### 3.3 日志关注

| 场景 | 关键字 | 服务 |
|------|--------|------|
| 文档索引 | `DocumentLifecycle` / `索引` | core / intelligence |
| 统计投影 | `StatisticsProjection` / `stat_` | core / statistics |
| MQ 消费失败 | `ListenerExecutionFailed` / `NACK` | 各消费者 |
| ES 索引 | `ES索引` / `bulk` | intelligence |
| Feign 超时 | `Read timed out` | core→file |
| Nacos gRPC | `Connection refused` / `21848` | 检查 gRPC 端口映射 |
| Bean 冲突 | `ConflictingBeanDefinition` | intelligence 子模块需唯一 `@Configuration` 名 |

### 3.4 定期任务（建议）

| 频率 | 任务 |
|------|------|
| 每日 | Nacos 实例健康、RabbitMQ 队列深度、Druid 慢 SQL |
| 每周 | ES 磁盘、`stat_*` 行数抽样 |
| 发版前 | `mvn compile` 全 BC；intelligence 变更后 `mvn clean install` |

---

## 四、常见故障排查

### 4.1 网关 503 / 找不到服务

- Nacos 目标服务是否注册、Group 是否与网关一致
- gRPC **21848** 是否映射（Nacos 2.x 必需）
- 路由名 `lb://kb-core` 与 `spring.application.name` 一致

### 4.2 搜索/RAG 无结果

1. ES 索引计数：`GET /kb_document/_count`、`/kb_chunk/_count`
2. 未建索引：`deploy/scripts/init-es.ps1`
3. 文档生命周期 MQ 是否消费
4. `intelligence.indexing.document-index` / `chunk-index` 与 ES 一致

### 4.3 统计数据不准或为空

- P3-1 已改 MQ 投影，**不依赖跨库 VIEW**
- 检查 `kb_statistics.stat_*` 是否有新业务写入
- **无历史数据**：空表正常

### 4.4 Core 数据库连接失败

- 三库 URL 指向 `127.0.0.1:20006` 的 kb_foundation / kb_user / kb_document
- Nacos `kb-core-dev.yaml` 与本地 yml 密码一致（root/123456）

### 4.5 文件上传失败

- kb-file 是否启动（8084）
- **RustFS** S3：`127.0.0.1:20090`，bucket `kb-files`，密钥 `rustfsadmin`
- bucket 未创建：`deploy/scripts/init-rustfs.ps1`
- kb-core 中 `kb-file.url` 指向 file 服务

### 4.6 intelligence 启动失败

| 现象 | 处理 |
|------|------|
| `ConflictingBeanDefinition`（同名 Config/Listener） | 子模块 `@Configuration("xxx")` / `@Component("xxx")` 须唯一 |
| `Result Maps collection already contains` | `mvn clean install -pl kb-intelligence/kb-intelligence-app -am -DskipTests` |
| Nacos `User nacos not found` | 本地 Nacos 已关鉴权；清空 volume 重建：`docker volume rm ai-rag_nacos_data` |

### 4.7 前端无法登录 / 接口 502

- gateway:8080 是否就绪
- 前端 Vite 代理 `/api` → `localhost:8080`
- 样例用户是否导入：`deploy/scripts/import-dev-data.ps1`

---

## 五、Prometheus / Grafana 接入（可选扩展）

当前未默认引入 Actuator。接入方式见原 §五（依赖 + Nacos 片段 + 网关白名单）。

---

## 六、发版与回滚

| 步骤 | 操作 |
|------|------|
| 发版前 | 备份 Nacos、MySQL、ES snapshot（可选） |
| 发版 | statistics/file → core/intelligence → gateway → 前端 |
| 回滚 | Nacos 回退 → 上一版 jar → 网关最后 |
| 切流 | `GATEWAY_*_CUTOVER.md`；`_archive` **禁止**与 4 BC 并行注册 |

---

## 七、鉴权默认值与 56-Ops（任务 56）

> 路径矩阵与轮换步骤见专文；本节为运维入口摘要。

| 项 | 默认 / 约定 |
|----|-------------|
| 网关白名单准源 | Nacos `gateway.white-list`（仅登录/注册/刷新、公开分享、健康检查） |
| 缺/非法/过期 JWT | 网关 HTTP **401**，不再转发 |
| 外部伪造头 | 网关删除 `X-User-Id`、`X-Internal-Service`、`X-Internal-Timestamp`、`X-Internal-Signature` |
| 内部签名串 | `METHOD + "\n" + PATH + "\n" + TIMESTAMP + "\n" + SERVICE`（Unix 秒） |
| HMAC | SHA-256，时钟偏差 ≤ 60s，密钥 UTF-8 ≥ 32 字节 |
| 密钥注入 | `KB_INTERNAL_HMAC_SECRET`；轮换窗口 `KB_INTERNAL_HMAC_SECRET_PREVIOUS` |
| 本地开发默认密钥 | `ai-rag-local-dev-hmac-secret-key!!`（**生产必须更换**） |
| Core 内部路径白名单 | 见 [internal-hmac-path-matrix.md](./internal-hmac-path-matrix.md) |
| 生产暴露 | **仅 Gateway（8080）**对公网；Core/Intelligence/File/Statistics/Agent 仅内网 |

### 7.1 密钥轮换（摘要）

完整步骤：[hmac-key-rotation.md](./hmac-key-rotation.md)

1. Core 设置 `secret=新` + `previous-secret=旧` 并重启  
2. Intelligence 切到新密钥并重启  
3. `verify-auth-ai.ps1` 通过后清空 `previous-secret` 再重启 Core  

### 7.2 生产端口暴露检查

```powershell
cd deploy\scripts
# 开发机仅罗列
.\check-service-exposure.ps1
# 生产：对公网 VIP 断言「仅 Gateway 可达」
.\check-service-exposure.ps1 -PublicHost <公网入口> -ExpectGatewayOnly
```

将输出粘贴到发版记录；未通过前不得开启 `system.enableAgent`。

故障排查：

1. 外部 AI/文档接口无 Token 仍放行 → 检查网关是否加载最新 `kb-gateway-dev` 且进程已重启。
2. Intelligence 拉文档 401 → 核对 Core/Intelligence `secret`、轮换窗口 `previous-secret`、时钟偏差、PATH 是否含 query。
3. 合法 JWT 但下游无用户 → 确认网关注入了 `X-User-Id`，且客户端未依赖自行伪造该头。
4. 团队 ACL 相关内部 401 → 确认白名单含 `/internal/users/*/team-ids`（见路径矩阵）。

---

## 八、相关文档

- [p3-2-deployment.md](./p3-2-deployment.md)
- [deploy/README.md](../../deploy/README.md)
- [rh-cha-roadmap.md](./rh-cha-roadmap.md)
- [internal-hmac-path-matrix.md](./internal-hmac-path-matrix.md)
- [hmac-key-rotation.md](./hmac-key-rotation.md)
- [backend/nacos/README.md](../../backend/nacos/README.md)
- [backend/sql/README.md](../../backend/sql/README.md)
