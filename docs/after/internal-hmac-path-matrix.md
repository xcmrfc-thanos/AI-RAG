# Intelligence → Core 内部 HMAC 路径矩阵（任务 56-Ops）

> **准源**：本表 + `kb-core.internal.allowed-paths`（Nacos `kb-core-dev` / `application.yml`）。  
> **规则**：新增内部路径必须同步 **代码白名单、调用方、本表、定向测试**。

## 1. 信任模型

| 调用方向 | 鉴权 | 用户身份 |
|----------|------|----------|
| 浏览器 → Gateway → BC | JWT；网关注入 `X-User-Id` | 终端用户 |
| Intelligence → Core（直连） | HMAC：`X-Internal-Service` + Timestamp + Signature | 系统用户（索引/重建） |
| Agent 工具 → Gateway → BC | 终端用户 `Authorization` | **禁止**工具侧 HMAC |

签名串：`METHOD + "\n" + PATH + "\n" + TIMESTAMP + "\n" + SERVICE`  
仅 **GET** 可通过内部白名单（写操作不得走系统 HMAC）。

## 2. 当前允许路径

| METHOD | PATH 模式 | 调用方 | 用途 | 配置位置 |
|--------|-----------|--------|------|----------|
| GET | `/documents/page` | `DocumentFeignClient`、`SearchServiceImpl` | 分页拉取已发布文档做索引/重建 | `allowed-paths` |
| GET | `/documents/*` | `DocumentFeignClient#getDocument`、重建 RestTemplate | 按 ID 拉文档详情（含正文） | `allowed-paths` |
| GET | `/internal/users/*/team-ids` | `SearchServiceImpl#fetchUserTeamIds` | 检索 ACL 解析用户团队 | `allowed-paths` |

说明：`/documents/*` 为单段 Ant 匹配（如 `/documents/123`），**不**覆盖 `/documents/123/like` 等更深路径。

## 3. 明确禁止

| 类型 | 说明 |
|------|------|
| 任意 POST/PUT/DELETE + HMAC | 过滤器直接拒绝 |
| 未列白名单的 GET | HTTP 403（路径不允许） |
| Agent / 前端携带 `X-Internal-*` | 网关删除后按 JWT 处理；无 Token → 401 |
| 直连 Core/Intelligence 绕过 Gateway 的用户流量 | 仅运维排障；生产应对业务端口做网络隔离 |

## 4. 变更检查清单

新增内部路径时：

1. 更新 `CoreInternalServiceProperties` 默认列表与 Nacos `kb-core-dev.yaml.template`
2. 更新本矩阵表格
3. 补充调用方（Feign / RestTemplate）与失败日志关键字
4. 增加或扩展 `InternalServiceAuthFilter` / HMAC 单测
5. 跑 `deploy/scripts/verify-auth-ai.ps1` 确认坏签名仍 401、好签名仍 200
