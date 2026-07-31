# Embed Chat 自嵌试点设计（P3）

**日期：** 2026-07-31  
**状态：** 获准试点（自对接）  
**参考形态：** 企业 OA / 门户工单页嵌对话（本仓用「嵌入实验室」菜单模拟宿主）  
**路线图：** [plans/2026-07-31-absorb-lingclaw-strengths.md](../plans/2026-07-31-absorb-lingclaw-strengths.md)  
**准入：** [2026-07-31-lingclaw-absorb-m2-waitlist.md](./2026-07-31-lingclaw-absorb-m2-waitlist.md)

## 目标

在本系统内提供「宿主页 + iframe 对话」闭环，验证短期 Token、同源 postMessage、用户 ACL 不旁路；外部真实 Origin 延后配置。

## 试点约定（已拍板）

| 项 | 值 |
|----|-----|
| 宿主 | 本系统菜单「嵌入实验室」`/embed-lab`（模拟 OA/门户） |
| 消费参考 | Cursor / 内部 Agent 记入 P1，本专项不实施 MCP |
| 身份 | 宿主已登录用户 → 后端签发短期 embed JWT（`type=embed`）；iframe 仅用该 Token 调 Chat |
| 域名 | 试点仅允许 `window.location.origin`；外部 Origin「暂时不弄」 |
| 知识范围 | Token 携带 `knowledgeScope` 字符串声明（首期仅审计/展示；检索仍按用户 ACL） |
| 开关 | `system.enableEmbedLab` 默认 **false** |

## 流程

```text
用户登录 → /embed-lab
  → POST /api/auth/embed/tokens（Bearer 长期会话 JWT）
  → 获得短期 embedToken（默认 300s）
  → iframe 打开 /embed/chat（无 Token 查询串）
  → iframe postMessage EMBED_READY
  → 父页 postMessage EMBED_INIT { token, knowledgeScope, allowedOrigin }
  → iframe 用 embedToken 调 POST /api/ai/chat/stream
```

## 非目标（首期）

- 外部真实 OA Origin / CSP `frame-ancestors` 生产配置
- app secret 机器换票（接口预留注释；试点用登录用户 mint）
- 改 Workflow / MCP / 旁路 ACL 的专用 Chat 端点
- 把长期 JWT 写入 iframe URL 或 localStorage

## 验收

1. 开关关闭：导航无「嵌入实验室」
2. 开关开启：可 mint、iframe 收 Token、流式问答成功
3. Token 不出现在 iframe `location.search`
4. 伪造 Origin 的 postMessage 被忽略
5. 单测覆盖协议解析；可选冒烟脚本
