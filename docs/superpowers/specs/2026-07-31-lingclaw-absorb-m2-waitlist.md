# lingclaw 吸收路线图 — M2 准入等待清单

**日期：** 2026-07-31
**状态：** 等待使用方信息（不实施）
**路线图：** [plans/2026-07-31-absorb-lingclaw-strengths.md](../plans/2026-07-31-absorb-lingclaw-strengths.md)
**P0 基线：** [2026-07-31-lingclaw-absorb-p0-baseline.md](./2026-07-31-lingclaw-absorb-p0-baseline.md)

> M0/M1（P0 + P2）已完成。本文件是 **M2 开工前**必须填齐的准入表。未填齐前禁止编写 P1/P3 业务代码与 shared schema 变更。

---

## 已完成（勿重复开工）

| 里程碑 | 状态 | 证据 |
|--------|------|------|
| M0 P0 基线 | 完成 | `2026-07-31-lingclaw-absorb-p0-baseline.md` |
| M1 P2 `@workflow` | 完成 | design/plan + 代码 + `verify-ai-workflow-trigger.ps1`（含 `-Live -RunSample`） |

---

## P1 只读 MCP Server — 填表后才开 design

复制下表填入后，将本文件状态改为「P1 获准设计」，再写 `docs/agent/mcp-server-boundary-v1.md`。

| 字段 | 必填 | 填写 |
|------|------|------|
| 消费系统名称 | 是 | |
| 负责人（姓名/联系方式） | 是 | |
| 调用场景（一句话） | 是 | |
| 身份如何传到 AI-RAG（禁止共享超级账号） | 是 | |
| 目标 QPS / 峰值 | 是 | |
| 首期工具是否接受仅 `hybrid_search` + `get_document` | 是 | 是 / 否（否则说明） |
| 验收指标（可量化） | 是 | |
| 是否要求系统 HMAC 旁路用户 ACL | 是 | 必须为 **否**，否则停损 |

**停损：** 无法映射终端用户，或只接受超级账号 → 不实施。

---

## P3 iframe Embed Chat — 填表后才开 design

| 字段 | 必填 | 填写 |
|------|------|------|
| 宿主系统名称 | 是 | |
| 负责人 | 是 | |
| 允许 Origin 列表 | 是 | |
| SSO / 用户映射方式 | 是 | |
| 知识范围（租户/空间/文档集） | 是 | |
| 是否接受「宿主后端换短期 embed token，secret 不进浏览器」 | 是 | 必须为 **是**，否则停损 |
| 验收指标 | 是 | |

**停损：** 要求浏览器长期 JWT 或 HMAC secret → 停止并重设计。

---

## P4 / P5 / 候选（仍延后）

| 项 | 解锁条件 |
|----|----------|
| P4 MCP Client | 至少一个只读工具样例，证明现有 HTTP/内置工具不够；且先做隔离 PoC |
| P5 Cron | 真实定时任务 + 执行身份 + 多实例幂等方案 |
| Skills / CodingTool | 不进当前排期 |

---

## 如何解锁下一步

1. 在本文件填齐 **P1 或 P3** 任一表格（可只填一项）。
2. 回复会话确认「按 P1 / 按 P3 开 design」。
3. Agent 再产出对应 boundary design + implementation plan，**不得跳过安全 Gate**。

未收到填表确认前，本路线图保持 **暂停实施**。
