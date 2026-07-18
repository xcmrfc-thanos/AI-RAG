# Nacos 配置模板索引（P3-2）

> Namespace: `knowledge` · Group: `KNOWLEDGE_BASE`  
> **本地 Docker**：Nacos 已关闭鉴权（无需 username/password）；HTTP **20848**，gRPC **21848**。  
> **配置准源（任务 59）**：本目录 `*-dev.yaml.template` → 导入 Nacos 后为运行时准源；各服务 `application.yml` **仅同值兜底**。  
> **模型默认**：`kb-intelligence-dev` / 模块兜底 / Agent 模板统一 `ai.default-model=qwen`（DeepSeek 可选）。

## 配置分层

| 层级 | 位置 | 内容 |
|------|------|------|
| 本地兜底 | 各服务 `src/main/resources/application.yml` | 端口、应用名、Nacos 连接、`config.import`、MyBatis-Plus 等框架固定项 |
| 公共环境 | Nacos `application-dev.yaml` | Redis、RabbitMQ、JWT、Jackson |
| 服务专属 | Nacos `kb-*-dev.yaml` | 数据源、路由、业务开关 |

## DataId 清单

| DataId | 模板文件 | 服务 |
|--------|----------|------|
| `application-dev.yaml` | [application-dev.yaml.template](./application-dev.yaml.template) | 全部微服务（公共） |
| `kb-gateway-dev.yaml` | [kb-gateway-dev.yaml.template](./kb-gateway-dev.yaml.template) | kb-gateway :8080 |
| `kb-core-dev.yaml` | [kb-core-dev.yaml.template](./kb-core-dev.yaml.template) | kb-core :8090 |
| `kb-intelligence-dev.yaml` | [kb-intelligence-dev.yaml.template](./kb-intelligence-dev.yaml.template) | kb-intelligence :8091 |
| `kb-file-dev.yaml` | [kb-file-dev.yaml.template](./kb-file-dev.yaml.template) | kb-file :8084 |
| `kb-statistics-dev.yaml` | [kb-statistics-dev.yaml.template](./kb-statistics-dev.yaml.template) | kb-statistics :8085 |
| `kb-agent-dev.yaml` | [kb-agent-dev.yaml.template](./kb-agent-dev.yaml.template) | kb-agent :8092 |

## 本地 Docker 一键导入

```powershell
cd deploy
.\scripts\import-nacos.ps1
```

脚本会清理已废弃 DataId，并重新发布上述 6 项配置。

## 手动导入步骤

1. 登录 Nacos 控制台 → 配置管理 → 配置列表
2. 选择 Namespace `knowledge`，Group `KNOWLEDGE_BASE`
3. 新建配置，DataId 与上表一致，格式 YAML
4. 复制对应 `.template` 内容，按环境修改 host/密码
5. 重启对应微服务

## Discovery 分组

- 服务注册 Group：`${COMPUTER_ID}` 或 `${USER}`（开发机隔离）
- 网关通过 `lb://服务名` 发现同 Group 实例

## 已废弃 DataId（勿新建）

| 旧 DataId | 替代 |
|-----------|------|
| `kb-auth-api-dev.yaml` | `kb-core-dev.yaml` |
| `kb-document-dev.yaml` | `kb-core-dev.yaml` |
| `kb-ai-dev.yaml` / `kb-search-dev.yaml` / `kb-graph-dev.yaml` | `kb-intelligence-dev.yaml` |

**以本目录 `backend/nacos/` 为配置准源。**
