# Agent 安全边界（任务 64 冻结）

> **冻结日期**：2026-07-15  
> **状态**：FROZEN  
> **关联**：[agent-contract-v1.md](./agent-contract-v1.md)、[../ai-entry-boundaries.md](../ai-entry-boundaries.md)、网关任务 56

---

## 1. 信任边界总览

```text
浏览器 / 前端
  └─ Gateway
       ├─ 清理外部 X-User-Id / X-Internal-* 
       ├─ JWT 强制（/api/agent/** 永不进白名单）
       └─ 注入可信 X-User-Id
            └─ kb-agent（独立进程）
                 ├─ 业务身份 = 终端用户
                 └─ 工具出站 ──Authorization 透传──► Gateway
                                      ├─ /api/search/**
                                      └─ /api/document/**

禁止：
  · Agent 直连 Core / Intelligence 业务端口（旁路 Gateway）作为默认路径
  · 工具使用系统用户 HMAC 读取“用户不可见”文档
  · 外部伪造头提升身份
```

Intelligence → Core 的系统 HMAC（任务 56）**仅**用于索引/后台文档拉取，与 Agent 工具路径隔离。

---

## 2. 身份与鉴权

| 规则 | 说明 |
|------|------|
| 登录 | `/api/agent/**` 缺/非法/过期 Token → **HTTP 401** |
| 身份源 | 网关注入的用户上下文；Agent **不信任**客户端自带的 `X-User-Id` |
| 工具调用 | 必须附带终端用户 `Authorization`；可见范围 = 该用户在 Search/Document 的 ACL |
| Search ACL FAIL | 普通用户不发放 `agent:workflow:view` / `agent:run`；运行返回 **403**；仅管理员临时联调 |

---

## 3. 权限矩阵（MVP）

| 权限码 | 能力 | 默认授予 |
|--------|------|----------|
| `agent:workflow:view` | 查看已发布工作流列表 | 登录用户（**仅 Search ACL PASS**）；否则仅管理员 |
| `agent:run` | 运行已发布版本 | 同上 |
| `agent:workflow:edit` | 创建/编辑草稿、试跑草稿 | 管理员 |
| `agent:workflow:publish` | 发布不可变版本 | 管理员 |

补充：

- MVP **不做**角色/团队级工作流绑定；拥有 view 的用户可见全部已发布工作流。  
- 普通用户**不可**运行草稿。  
- `system.enableAgent=false` 时：导航隐藏，直接访问展示关闭态；服务端也应拒绝业务写操作（实现于 65/69）。

---

## 4. 工具安全

| 规则 | 说明 |
|------|------|
| 白名单 | 仅 `hybrid_search`、`get_document` |
| 禁止 | 任意 HTTP、任意 SQL、写文档/写库、自定义脚本 |
| 超时 | 工具默认 5s；超时 → ToolError，不重试静默吞掉 |
| 输出 | 过长截断/`maxChars`；负向用例覆盖 |
| Prompt 注入 | 检索/文档正文按**不可信数据**进入 LLM Prompt；系统指令优先，禁止被用户/文档内容改写成越权指令 |
| 审计 | 只记 runId、stepId、tool、耗时、状态、文档 ID；**不**记 Token、完整正文、模型密钥 |

---

## 5. 数据与保留

| 项 | 规则 |
|----|------|
| Run/Step 保留 | 默认 30 天，可配置；超期删除（任务 70） |
| 日志 | 禁止记录 JWT、内部 HMAC 密钥、完整模型响应正文（除非显式合规调试且受控） |
| 发布版本 | 不可变；防篡改依赖 DB 写入约束与管理 API 不提供 update-version |

---

## 6. 运维合闸（与生产开关）

开启 `system.enableAgent` 前必须满足：

1. **56-Ops** 完成（密钥轮换、内部路径矩阵、端口暴露记录）  
2. 任务 **65–71** 完成且冒烟有记录  
3. 401/403、越权文档负向用例有记录  
4. Stub 冒烟可在无 Key 环境跑通  
5. 普通用户开放范围与 **Search ACL** 结果一致（ACL FAIL 时仅管理员）

未满足前保持 `enableAgent=false`。

---

## 7. 威胁对照（摘要）

| 威胁 | 缓解 |
|------|------|
| 伪造内部头越权读文档 | 网关剥离 + Agent 不用 HMAC 读用户文档 |
| 无 Token 调 Agent | 网关 401 |
| 普通用户编排/发布 | 权限码 + 403 |
| ACL 未修好时扩大面 | 不发 view/run 给普户；入口隐藏 |
| 工作流 JSON 注入脚本 | 变量白名单；无表达式引擎 |
| 环/并行拖垮资源 | 线性校验硬拒绝 |
| 提示词注入 | 不可信资料封装；系统指令隔离 |

---

## 8. 实现检查清单（65+）

> 2026-09-13 代码级核验：① `gateway.white-list` 无 `/api/agent/**`；② `agent.gateway-base-url` 指向网关 18080；③ `init_agent_permission.sql` 权限码 + `@PreAuthorize(AgentPermissionConstants)` 方法级授权；④ SQL 初始化仅管理员授予 view/run（普户仅 view），工具下游 403 → `FORBIDDEN`；⑤ `tool_audit` 结构化日志（tool/runId/stepId/status/durationMs，无正文）。

- [x] Gateway 路由 `/api/agent/**` 无白名单豁免  
- [x] 工具 HTTP 客户端 base URL = Gateway  
- [x] 权限码入 SQL / 方法级授权  
- [x] ACL FAIL 时初始化仅管理员 view/run  
- [x] 审计字段符合本节第 4、5 条  
