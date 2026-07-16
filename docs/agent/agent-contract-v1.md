# Agent 工作流契约 v1（冻结）

> **冻结日期**：2026-07-15  
> **任务**：第 7 阶段任务 64  
> **状态**：FROZEN — 未修订本版不得启动任务 65 业务代码中的工作流解析/引擎实现偏离本文  
> **关联**：[agent-security-boundary.md](./agent-security-boundary.md)、[../ai-entry-boundaries.md](../ai-entry-boundaries.md)、[workflow-schema-v1.json](./workflow-schema-v1.json)

---

## 1. 范围与非目标

**范围内（MVP）**

- 线性工作流：仅 `tool`、`llm` 两类节点
- 已发布不可变版本上的 Run
- 双工具：`hybrid_search`、`get_document`
- 非流式 API；协作式取消

**明确不在 v1**

- 并行 DAG、环、条件分支、人机审批
- 任意 HTTP / SQL / 写库工具
- 自动多轮记忆、长时任务恢复、强制中断进行中的模型 HTTP
- React Flow 画布（任务 72）
- Dify 接入

---

## 2. 入口与角色

| 入口 | 路由 | 谁 | 能做什么 |
|------|------|-----|----------|
| 用户运行 | `/agent` | 有 view+run 的登录用户 | 仅运行**已发布**版本，查轨迹/取消 |
| 管理编排 | `/admin/agents` | 管理员（edit/publish） | 草稿 CRUD、校验、试跑、发布 |

用户页**禁止**：JSON 编辑、草稿保存、发布。

---

## 3. 工作流 JSON Schema

完整机器校验见 [workflow-schema-v1.json](./workflow-schema-v1.json)。语义摘要：

| 字段 | 规则 |
|------|------|
| `schemaVersion` | 必须为整数 `1` |
| `name` | 1～128 字符 |
| `nodes` | 1～**10** 个；每项含 `id`（唯一）、`type`（`tool`\|`llm`） |
| `tool` 节点 | `type=tool`；`tool` ∈ {`hybrid_search`,`get_document`}；`input` 为对象 |
| `llm` 节点 | `type=llm`；`input.prompt` 必填字符串 |
| `edges` | `{ "from", "to" }`；见下节图约束 |

### 3.1 示例（知识库问答）

```json
{
  "schemaVersion": 1,
  "name": "知识库问答",
  "nodes": [
    {
      "id": "search",
      "type": "tool",
      "tool": "hybrid_search",
      "input": { "query": "${input.query}", "topK": 5 }
    },
    {
      "id": "answer",
      "type": "llm",
      "input": {
        "prompt": "根据检索结果回答问题。\n问题：${input.query}\n资料：${steps.search.output}"
      }
    }
  ],
  "edges": [
    { "from": "search", "to": "answer" }
  ]
}
```

---

## 4. 图与线性约束（硬校验）

保存草稿与发布前必须拒绝以下情况（HTTP **400** + 明确 ValidationError）：

1. 节点类型不在 `{tool, llm}` 或数量 > 10  
2. 存在环  
3. 存在并行分支（任意节点出度 > 1，或入度 > 1）  
4. 不止一个起点或不止一个终点  
5. 孤立节点（无入无出且图中节点数 > 1）  
6. `edges` 引用不存在的 `node.id`  
7. `tool` 节点 `tool` 不在白名单  

**合法图形态**：单链表式线性链（唯一起点 → … → 唯一终点），每个节点入度/出度均 ≤ 1。

执行顺序：按拓扑序（对合法线性图即唯一路径顺序）。任一节点失败则**短路**，不执行后续节点。

---

## 5. 变量语义（硬规则）

| 形式 | 含义 | 解析时机 |
|------|------|----------|
| `${input.<key>}` | Run 创建时请求体 `input` 对象字段 | 节点执行前 |
| `${steps.<nodeId>.output}` | 已成功节点写入 `agent_run_step` 的输出快照 | 仅引用**拓扑上更早**的节点 |

禁止：

- 任意脚本、表达式求值、函数调用  
- 引用未执行或失败节点的 `steps.*.output`（→ ValidationError）  
- 引用图中不存在的 `nodeId`

缺失变量 → 明确 `ValidationError`，Run/节点记为 `FAILED`。

---

## 6. 版本与不可变发布

| 概念 | 规则 |
|------|------|
| 草稿 | `agent_workflow` 可指向可变草稿内容；仅管理员可改 |
| 发布 | 生成新行 `agent_workflow_version`，JSON **写后不可改** |
| Run | 必须绑定明确的 `workflowVersionId`；运行中**不**读草稿 |
| 修改已发布 | 只能再发布新版本；旧 Run 仍绑定旧 `workflowVersionId` |

试跑可走草稿，但不写入「用户生产 Run」语义；生产 Run API 只接受已发布版本。

---

## 7. Run 状态机

**允许状态**：`CREATED | RUNNING | SUCCEEDED | FAILED | TIMED_OUT | CANCELLED`

```text
CREATED ──► RUNNING ──► SUCCEEDED
                │
                ├──► FAILED
                ├──► TIMED_OUT
                └──► CANCELLED   （协作式：当前节点结束后不再启动下一节点）
```

非法转换必须拒绝。终态不可再转为 `RUNNING`。

**取消**：设置取消标记；不承诺强制中断正在进行的模型 HTTP。前端文案见入口边界「取消提示」。

**幂等**：创建 Run 支持幂等键；相同键重复请求返回同一 Run，不重复调模型/工具。

**超时（默认）**：

| 范围 | 默认 |
|------|------|
| Run 总超时 | 90s |
| LLM 节点 | 60s |
| 工具节点 | 5s |

---

## 8. Session

| 表/概念 | 职责 |
|---------|------|
| `agent_session` | 可选 Run **分组** |
| 非职责 | 不自动注入历史对话、不做向量记忆 |

MVP：Session 仅作列表分组；引擎不读取历史 Run 作为隐式上下文。

---

## 9. 持久化模型（表）

库名建议：`kb_agent`（任务 65 建库）。

| 表 | 职责 | 关键字段（契约级） |
|----|------|-------------------|
| `agent_workflow` | 稳定身份 | id, name, owner_user_id, draft_json 或 draft_version 指针, published_version_id, updated_at |
| `agent_workflow_version` | 不可变版本 | id, workflow_id, schema_version, definition_json, published_at, published_by |
| `agent_run` | 一次执行 | id, workflow_version_id, user_id, session_id?, input_json, output_json, status, error_code, error_message, idempotency_key, started_at, finished_at, duration_ms |
| `agent_run_step` | 节点级 | id, run_id, node_id, node_type, status, input_snapshot, output_snapshot, error_message, started_at, finished_at, duration_ms |
| `agent_session` | Run 分组 | id, user_id, title?, created_at |

字段物理类型与索引在 `backend/sql/schema/kb_agent.sql`（任务 65）落定，不得违背上表职责。

Run/Step 保留期默认 **30 天**（可配置）；审计不得落 Token、密钥、完整正文（见安全边界）。

---

## 10. 工具契约（v1 仅 2 个）

### 10.1 `hybrid_search`

| 参数 | 类型 | 约束 |
|------|------|------|
| `query` | string | 1～1000 字符 |
| `mode` | string | `keyword` \| `hybrid`，默认 `hybrid` |
| `topK` | int | 1～20，默认 5 |

出站：Gateway `Search` API，透传用户 `Authorization`。  
输出快照：结构化检索结果（文档 id、标题、摘要/片段等），供后续变量引用。

### 10.2 `get_document`

| 参数 | 类型 | 约束 |
|------|------|------|
| `documentId` | long/string | 必填 |
| `maxChars` | int | 500～10000，默认 4000 |

出站：Gateway Document 读取 API，透传用户 `Authorization`。  
输出：截断后的正文/可见字段；不可见文档 → 工具失败（与用户前端一致）。

工具错误统一为结构化 `ToolError`（超时、非 2xx、参数非法、过长输出）。

---

## 11. HTTP API 语义（任务 68 实现时不得偏离）

| 场景 | HTTP |
|------|------|
| 未登录 | 401 |
| 无权限 | 403 |
| 非法工作流 / 校验失败 | 400 |
| 资源不存在 | 404 |
| 冲突 / 重复发布语义冲突 | 409 |

管理：草稿 CRUD、校验、发布、版本查询。  
运行：创建 Session、发起 Run、查询 Run、Step 轨迹、取消 Run。  
MVP：**非流式**；前端轮询/查询终态。

路径前缀：`/api/agent/**`（**禁止**加入网关白名单）。

---

## 12. 模型边界

| 项 | 规则 |
|----|------|
| Port | `kb-agent` 内 `AgentModelClient`，**不**依赖 `kb-intelligence-llm` 实现类 |
| 默认 | 千问（`agent.default-model=qwen`） |
| DeepSeek | 仅配置切换，非默认 |
| Stub | `AI_DEV_STUB=true` 时 LLM 节点确定性文本，保证无 Key 冒烟 |

检索正文进入 Prompt 时视为**不可信数据**，不得覆盖系统安全指令（详见安全边界）。

---

## 13. 变更纪律

1. 破坏性变更必须升 `schemaVersion` 并新开文档版本，不得静默改 v1 语义。  
2. 对外 Search/RAG shape 在任务 66/71 联调期冻结；若改 shape，先改本契约与工具适配再联调。  
3. 任务 65 起实现必须以本文 + JSON Schema 为准。
