# lingclaw 吸收路线图 — M2 准入等待清单

**日期：** 2026-07-31  
**状态：** P3 自嵌试点已获准；P1 已登记消费方待独立 design  
**路线图：** [plans/2026-07-31-absorb-lingclaw-strengths.md](../plans/2026-07-31-absorb-lingclaw-strengths.md)  
**P0 基线：** [2026-07-31-lingclaw-absorb-p0-baseline.md](./2026-07-31-lingclaw-absorb-p0-baseline.md)  
**P3 设计：** [2026-07-31-embed-chat-self-lab-design.md](./2026-07-31-embed-chat-self-lab-design.md)

---

## 已完成

| 里程碑 | 状态 | 证据 |
|--------|------|------|
| M0 P0 基线 | 完成 | `2026-07-31-lingclaw-absorb-p0-baseline.md` |
| M1 P2 `@workflow` | 完成 | `verify-ai-workflow-trigger.ps1` |
| M2-P3 自嵌试点 | **获准实施** | 本表 + embed-chat-self-lab design |

---

## P1 只读 MCP Server

| 字段 | 填写 |
|------|------|
| 消费系统名称 | Cursor（参考）、内部 Agent（参考） |
| 负责人 | 产品试点（AI-RAG 维护者） |
| 调用场景 | IDE/内部 Agent 只读检索企业知识库 |
| 身份传递 | 调用方带终端用户 JWT / SSO subject，按该用户 ACL 检索 |
| 目标 QPS | 峰值约 5 |
| 首期工具 | 是：仅 `hybrid_search` + `get_document` |
| 验收指标 | 401/403、不可见文档、限流可测 |
| HMAC 旁路 ACL | **否** |

**状态：** 已登记，**尚未开 design/编码**（本迭代优先 P3 自嵌）。

---

## P3 iframe Embed Chat

| 字段 | 填写 |
|------|------|
| 宿主系统名称 | 本系统「嵌入实验室」菜单（模拟 OA 工单页 / 门户）；外部真实 OA Origin 暂缓 |
| 负责人 | 产品试点（AI-RAG 维护者） |
| 允许 Origin | 试点仅 `window.location.origin` |
| SSO / 用户映射 | 宿主已登录；后端用登录会话 mint 短期 embed Token（真实 OA 日后改为 app secret 换票） |
| 知识范围 | Token 声明 `knowledgeScope`（如工单空间标签）；检索仍走用户 ACL |
| 短期 Token、secret 不进浏览器 | **是** |
| 验收指标 | 开关默认关；iframe 无 URL Token；同源 postMessage；流式问答可用 |

**状态：** **获准实施自嵌试点**。

---

## 如何继续

- P3：按 `2026-07-31-embed-chat-self-lab` plan 实现。  
- P1：P3 试点稳定后再开 `mcp-server-boundary-v1` design。
