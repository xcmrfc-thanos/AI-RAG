# 吸收 lingclaw 优点、补足 AI-RAG 不足 Roadmap

> **文档定位：** 本文件是跨子系统路线图，负责优先级、准入条件与停损边界，**不是可直接执行的 Implementation Plan**。每个获准阶段必须先形成独立 design/spec，再用 `writing-plans` 生成含精确路径、测试与命令的实施计划。

**Goal:** 在不削弱「企业知识库 + 混合检索 + 带引用 RAG」主线的前提下，只吸收能够形成明确业务价值、可独立验收且安全边界可控的 lingclaw 能力。

**Architecture:** 以现有 Gateway、`kb-intelligence`、`kb-agent` 和冻结的 Workflow v1 为边界；优先输出 AI-RAG 已有的知识检索能力，再增强低风险触发与嵌入形态。任何动态工具、定时执行或外部嵌入均不得绕过终端用户身份与文档 ACL。

**Tech Stack:** Java 21 / Spring Boot / LangChain4j / React / Gateway JWT；MCP 传输与 SDK 在专项设计中按当前规范选型，不从参考项目直接继承技术决策。

**参考源：** `docs/lingclaw/readme.md`、`docs/lingclaw/admin/lingclaw-ai-core/`、`docs/lingclaw/admin/lingclaw-workflow/`、`docs/lingclaw/lingclaw-chat/`（本地，勿提交）。启动专项设计前必须补记 lingclaw 上游 URL 与对应 commit/tag，保证参考快照可追溯。

**许可注意：** 本地副本根 `LICENSE` 为 **GPL-2.0**；本仓实现须独立编写，禁止直接复制其源码、配置或资源进 `backend/` / `frontend/`。

---

## 原则（必须遵守）

| 原则 | 说明 |
|------|------|
| 主线优先 | ACL、审核、混合检索、Citation、公网/内网双环境不降级 |
| 入口不糊成一框 | 搜索 / AI 助手 / 写作 / Agent 边界保持 |
| 增量可验收 | 每一 Phase 可单独冒烟，失败可回滚开关 |
| 需求先于能力 | 没有明确使用方、业务场景和验收指标的能力不进入实施 |
| 契约先行 | Workflow v1 保持冻结；需要动态工具时先设计 v2，不静默扩字段 |
| 安全默认关 | MCP Client、外部嵌入、定时触发默认关闭；企业场景需显式配置 |
| 参考不拷贝 | 对照 `docs/lingclaw` 的能力清单与交互，本仓自研 |

---

## 评估方法

| 维度 | 高 | 中 | 低 |
|------|----|----|----|
| 必要性 | 保护 RAG/ACL 主线，或已有明确使用方 | 有产品价值但尚无刚性需求 | 主要是能力展示或偏离主线 |
| 可行性 | 复用现有接口，无 shared contract/schema 变更 | 需新增安全契约或少量跨模块改动 | 需新执行模型、持久化、集群协调或高风险基础设施 |
| 风险 | 风险可由现有 JWT/ACL/开关约束 | 需新增 Token、跨域、外部服务或运维边界 | 可执行任意代码、身份委托不清或影响宿主机 |

排序规则：先满足必要性，再看可行性；高风险能力即使价值高，也必须先通过独立安全设计和 PoC Gate。

---

## 差距总表（吸收什么 / 不吸收什么）

| 能力 | AI-RAG 现状 | lingclaw | 本计划 |
|------|-------------|----------|--------|
| 企业文档 ACL / 审核 / 团队 | 强 | 弱 | **保持，不改主线** |
| 混合检索 + 重排 + Citation | 强 | 有（偏简） | **保持** |
| Agent 工作流画布 | 有（kb-agent） | 更强（定时/@触发） | **P2 先做结构化触发；Cron 延后** |
| MCP 工具 | 基本无 | 强 | **P1 先做只读 MCP Server；Client 延后** |
| Skills / 自进化市场 | 无 | 强 | **候选池；无刚需不做** |
| 嵌入式对话组件 | 仅整页 | Web Component | **P3 采用安全 iframe 形态** |
| CodingTool + 沙盒 | 无 | 强 | **近期不做** |
| 小模型训练 / 微信 / Electron 控机 | 无 | 有 | **明确不做** |
| Word/PPT 所见即所得编辑 | AI 写作偏文稿 | 宣传强、开源树证据弱 | **不做编辑器；可后续增强导出** |
| 敏感词 / 合规 | 已有 L1 | — | **保持加深（既有）** |

---

## 文件地图（专项计划候选范围）

| 路径 | 职责 |
|------|------|
| `backend/kb-intelligence/**` | 只读 MCP Server 适配现有检索/文档能力 |
| `backend/kb-agent/**` | 结构化工作流触发；后续可选 MCP Client / Cron |
| `backend/kb-gateway/**`、`backend/nacos/kb-gateway-dev.yaml.template` | MCP/Embed 路由、Token 校验、Origin/CSP 边界 |
| `frontend/src/features/agent-workflow/**` | 结构化 `@workflow` 选择与运行状态 |
| `frontend/src/components/embed/**` | iframe 内嵌对话页面及受限 `postMessage` 协议 |
| `backend/sql/schema/{mysql,postgresql,oracle}/kb_agent.sql` | 仅 Cron 获准后新增独立 trigger 持久化 |
| `docs/agent/*.md` | 契约与安全边界补充 |
| `deploy/scripts/verify-*.ps1` | 冒烟项 |
| `docs/lingclaw/**` | **只读参考**，不入库 |

---

## 优先级总览

| 顺序 | 能力 | 必要性 | 可行性 | 风险 | 决策 |
|------|------|--------|--------|------|------|
| **P0** | 契约、用例与安全基线 | 高 | 高 | 低 | **必须先做** |
| **P1** | AI-RAG 只读 MCP Server | 中 | 中 | 中 | **有明确消费方后实施** |
| **P2** | 结构化 `@workflow` 触发 | 中 | 高 | 中 | **优先可交付增强** |
| **P3** | iframe Embed Chat + 短期 Token | 中 | 中 | 高 | **有外部接入方后实施** |
| **P4** | Agent MCP Client（显式节点） | 低 | 低 | 高 | **延后，先 PoC** |
| **P5** | Cron 定时触发 | 低 | 低 | 高 | **延后，先解决身份/集群语义** |
| 候选 | 本地 Skills 包 | 低 | 中 | 中 | **不进当前排期** |
| 不做 | Docker CodingTool / 自动市场 | 低 | 低 | 极高 | **近期不实施** |

P1 和 P3 都设置业务准入条件：没有明确消费系统、负责人和验收指标时停止在设计阶段，不为“能力齐全”投入实现。

---

## Phase 0 — 契约、用例与安全基线（必须）

**必要性：高。** 后续能力均跨越现有 JWT/ACL、Workflow v1 或网关边界；未先收敛会直接造成返工或越权风险。
**可行性：高。** 仅做设计、调用链验证和最小 PoC，不改 shared contract/schema。
**交付物：** 各专项的业务用例、边界设计、验收指标与独立实施计划。

### Gate 0.1: 确认真实使用方

准源记录：[specs/2026-07-31-lingclaw-absorb-p0-baseline.md](../specs/2026-07-31-lingclaw-absorb-p0-baseline.md)

- [x] MCP Server：无已登记消费方与 QPS → **不实施**；候选工具仍为 `hybrid_search` / `get_document`
- [x] `@workflow`：确认内部产品痛点为 `/ai` 与 `/agent` 入口割裂 → **获准写独立实施计划**
- [x] Embed：无宿主系统 / Origin / SSO → **不实施**
- [x] MCP Client / Cron：无工具或定时任务样例 → **继续延后**

### Gate 0.2: 冻结跨域决策

- [x] Workflow v1 保持冻结；动态 MCP 工具如需进入定义，必须另开 v2 设计
- [x] MCP Server/Embed 必须经过 Gateway，不新增绕过 ACL 的内部读路径
- [x] 浏览器不保存 app secret/HMAC secret，不向通用 MCP 进程传用户 JWT
- [x] 所有新增能力默认关闭，有明确的启用、回滚和审计方式

### Gate 0.3: 建立专项计划模板

- [x] 模板已落盘：[templates/specialty-implementation-plan-template.md](../templates/specialty-implementation-plan-template.md)
- [x] 要求：每个获准专项单独产出 spec 与 implementation plan（精确路径、TDD、负向安全、验证命令、回滚、提交边界）；本路线图不代替这些文档

---

## Phase 1 — AI-RAG 只读 MCP Server（条件优先）

**必要性：中。** 让其他 Agent/IDE/企业系统复用 AI-RAG 的检索和引用能力，直接放大本仓优势；但必须先有消费方。
**可行性：中。** 首期只包装现有 `hybrid_search`、`get_document`，不修改 Agent 执行模型，但仍需新增 MCP 协议适配和身份边界。
**风险：中。** 主要是身份映射、ACL、限流和数据外泄，可通过 Gateway 与只读白名单收敛。

### 首期范围

- 只提供 `hybrid_search`、`get_document`，返回结构化结果和 Citation 所需字段
- 每次调用绑定真实终端用户身份；不使用系统 HMAC 扩大可见范围
- 不提供写文档、任意 HTTP/SQL、自动安装、市场或公网匿名访问
- 传输与 Java SDK 在专项 design 中按当前 MCP 规范和依赖兼容性决策

### 进入实施 Gate

- [ ] 已记录消费系统、负责人、身份传递方式和目标 QPS
- [ ] 已完成 `docs/agent/mcp-server-boundary-v1.md` 设计并通过安全评审
- [ ] 已定义 401/403、不可见文档、超时、限流、输出截断和审计验收
- [ ] 已生成独立 MCP Server implementation plan

### 停损条件

无法可靠映射终端用户，或消费方只接受共享超级账号时停止；不得以系统身份旁路 ACL。

---

## Phase 2 — 结构化 `@workflow` 触发（优先可交付）

**必要性：中。** 缩短 AI 助手到既有工作流的入口路径，但不改变 RAG 主线。
**可行性：高。** 复用已发布版本和现有 `/api/agent/runs`，不修改 Workflow Schema。
**风险：中。** 关键是避免名称歧义、自然语言解析和重复触发。

### 方案边界

- UI 展示 `@流程名`，实际由选择器保存 `workflowId`、`workflowVersionId` 和结构化 `input`
- 禁止从消息正文解析 `@workflow:<名称> + JSON`
- 前端直接调用现有 Agent Run API；`kb-intelligence` 不承担文本命令路由
- 仅在 `/ai` 或 `/agent` 展示入口，不进入 `/search`
- 每次触发生成 `idempotencyKey`，状态卡片复用 Run 查询/取消能力

### 进入实施 Gate

- [x] 已确认 AI 助手用户确有跨入口触发需求（P0 基线）
- [x] 已明确已发布流程的可见性和 `agent:run` 权限处理（见 design）
- [x] 已定义重复点击、版本变化、流程停用、403 和运行失败体验（见 design）
- [x] 已生成独立 `@workflow` implementation plan：[2026-07-31-structured-workflow-trigger.md](./2026-07-31-structured-workflow-trigger.md)

### 验收方向

结构化选择、ACL/权限、幂等、状态轮询、取消和普通问答不受影响均有自动化测试；搜索框不出现工作流触发语义。

---

## Phase 3 — iframe Embed Chat（业务驱动）

**必要性：中。** 适合明确存在门户、OA、客服台等接入方的企业环境；没有宿主系统时不做。
**可行性：中。** 可以复用 `/api/ai/chat/stream` 与 Citation，但需要新增安全 Token 和跨域策略。
**风险：高。** 浏览器凭证、Origin、CSP、ACL 和消息通信任一处理不当都会扩大攻击面。

### 首期形态

- 采用 iframe，不以 React 组件冒充“一行嵌入”制品
- 宿主后端使用 app secret 换取短期、单用途 embed token；secret 不进入浏览器
- embed token 绑定 tenant、subject、knowledge scope、allowed origin、expiry 和 nonce
- iframe 与宿主仅通过白名单消息类型的 `postMessage` 通信
- 沿用现有 RAG/Citation，不新增绕过 ACL 的 Chat 端点

### 进入实施 Gate

- [ ] 已确定首个宿主系统、SSO 用户映射、允许 Origin 和知识范围
- [ ] 已完成 Token 签发/校验、撤销、限流、CSP `frame-ancestors` 和 CORS 设计
- [ ] 已定义 Token 不落 URL/localStorage/日志，以及过期、伪造 Origin、越权文档负向用例
- [ ] 已生成独立 Embed Chat implementation plan

### 停损条件

若宿主方要求把长期 JWT 或 HMAC secret 下发浏览器，停止实施并重新设计身份交换。

---

## Phase 4 — Agent MCP Client（延后 PoC）

**必要性：低。** 只有明确的外部工具调用场景才有价值；当前工作流已有知识库工具。
**可行性：低。** 现有 Agent 是显式工作流执行器，不存在模型自主工具选择路径，且 Workflow v1 工具白名单被冻结。
**风险：高。** stdio 配置可启动宿主进程，通用 MCP 还可能外传输入、Token 或模型上下文。

### 获准前必须满足

- [ ] 明确至少一个只读 MCP 工具及其业务收益，证明现有 HTTP/内置工具不能更简单地解决
- [ ] 采用显式 `mcp_call` 工作流节点，不在本阶段引入 ReAct/tool-calling loop
- [ ] 完成 Workflow v2 或外部绑定模型设计，定义 server/tool 命名空间、schema hash 和发布时校验
- [ ] 明确禁止向通用 MCP 进程传用户 JWT、模型 Key 和宿主环境变量
- [ ] stdio 仅允许固定镜像/可执行文件并运行于隔离环境；否则优先评估受控远程传输
- [ ] 通过进程回收、超时、输出上限、并发、熔断、审计和配置关闭零客户端测试

任一条件无法满足则维持关闭，不进入实现。

---

## Phase 5 — Cron 定时触发（延后设计）

**必要性：低。** 仅对明确的日报、周期检查或同步任务有价值。
**可行性：低。** 当前 Run 依赖终端用户 Bearer Token，定时触发没有现成用户凭证；多实例还需防重复执行。
**风险：高。** 涉及身份委托、权限回收、三数据库持久化、集群锁、misfire 和重复副作用。

### 获准前必须满足

- [ ] 至少确认一个真实定时任务、执行频率、输入、负责人和失败处理人
- [ ] schedule 使用独立 `workflow_trigger` 资源并绑定已发布 `workflowVersionId`，不写入 Workflow v1 JSON
- [ ] 定义执行主体，不持久化用户 JWT，不使用系统超级身份旁路文档 ACL
- [ ] 以 `(trigger_id, scheduled_at)` 唯一键和租约/锁保证多实例至多创建一个 Run
- [ ] 定义 timezone、misfire、重叠策略、暂停、权限回收、流程删除和失败重试
- [ ] 同步设计 MySQL/PostgreSQL/Oracle schema 与回滚方式

身份或幂等语义未解决前禁止使用简单 `@Scheduled` 扫描上线。

---

## 候选池与不做项

### 本地 Skills 包

保留为独立候选，不依赖 MCP。只有出现多 Agent 重复提示词、上下文成本可量化且普通模板无法满足时，再设计只读、可审计的本地技能包；不做自动下载、自动进化或公网市场。

### Docker CodingTool

近期不做。它偏离企业知识库主线，且代码执行、挂载、出网和供应链风险远高于当前收益；即使未来重启，也必须作为独立安全项目，不与 Skills 或 MCP 顺带实现。

---

## 明确不做（本计划范围外）

- 用 Spring AI 替换现有 LangChain4j 调用栈
- 小模型训练（easyAi）、微信渠道、Electron 远程控本机
- 自动安装公网 MCP/Skills 市场、Agent 自主安装工具
- 在本阶段引入模型自主 ReAct/tool-calling loop
- 在浏览器保存 app secret、HMAC secret 或长期用户 JWT
- 通过系统身份/HMAC 绕过终端用户文档 ACL
- 照搬 lingclaw GPL 源码或整模块拷贝进仓库
- 把搜索框变成「万能 Agent 框」

---

## 统一交付 Gate

每个阶段只有同时满足以下条件才可声明完成：

- [ ] 需求证据：有明确使用方、负责人、业务用例和可量化验收指标
- [ ] 契约证据：专项 spec 与 implementation plan 已落盘，未静默修改冻结契约
- [ ] 安全证据：401/403、ACL 越权、凭证泄露、重放/重复触发和默认关闭均有负向验证
- [ ] 功能证据：专项单元/集成测试通过，至少一次受控端到端冒烟通过
- [ ] 回归证据：`deploy/scripts/verify-all.ps1` 与受影响模块测试无新增失败
- [ ] 运维证据：指标、审计、开关、回滚和故障降级已验证
- [ ] 文档证据：`docs/README.md`、安全边界、接口/运维说明与本地 `readme_plan.md` 同步

如果 Search Golden 或真实 LLM 抽验受能力改动影响，不得标为非强制；必须先说明影响面，再按受影响路径补做验证。

---

## 建议推进节奏

| 里程碑 | 内容 | 退出条件 |
|--------|------|----------|
| **M0** | P0 需求与边界收敛 | ~~决定 P1/P2/P3 哪些有真实使用方~~ **已退出**（仅 P2 获准） |
| **M1** | P1 MCP Server 或 P2 `@workflow` 中价值更明确者 | ~~独立计划完成统一 Gate~~ **P2 已交付**（静态 + Live/RunSample 冒烟通过） |
| **M2** | 完成 M1 未选项，或在有宿主方时做 P3 Embed | 前一阶段稳定且无安全遗留；**P1/P3 仍缺使用方 → 暂停** |
| **M3** | 重新评估 P4 MCP Client | 明确工具样例并通过隔离 PoC |
| **M4** | 重新评估 P5 Cron | 身份委托与多实例幂等设计获准 |

不再预设“一周完成一个子系统”。专项排期必须在设计完成、文件范围和验证成本明确后单独估算。

---

## 下一步

1. ~~先完成 P0 使用方确认；无须写代码。~~ **已完成**（见 P0 基线，2026-07-31）。
2. ~~M1：P2 结构化 `@workflow` design + 实施。~~ **已完成**（计划/代码/静态+Live 冒烟）。
3. **M2：** P3 自嵌试点已获准实施（嵌入实验室）；P1（Cursor/内部 Agent）已登记，待独立 MCP design。
4. P2 回归：`.\verify-ai-workflow-trigger.ps1`（可选 `-Live -RunSample`）。
5. MCP Client / Cron 仍按 Gate 延后。
