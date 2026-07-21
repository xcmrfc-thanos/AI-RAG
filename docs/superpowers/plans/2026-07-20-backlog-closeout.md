# 本轮差距收尾 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans 或 subagent-driven-development，按 Phase 顺序推进。Steps 用 checkbox（`- [ ]`）跟踪。

**Goal:** 在设置增强 / 三库交付已合入 Gitee `master` 的前提下，把「半成品尾巴」与「清单噪音」收成可勾选的完成态：真接线、清单去伪、文档对齐；不扩散到无关大 backlog。

**Architecture:** 分四层收尾——(1) 清单复核去伪；(2) 设置合规接线与可选热读；(3) 文档/设计表述对齐已交付事实；(4) 明确推迟项写进「非目标」。热读采用现有 `SystemConfigCache`（Redis Hash `kb:system:config`），各服务用 `ObjectProvider`/`@ConditionalOnBean` 避免无 Redis 时启动失败。

**Tech Stack:** Settings/Compliance、`SystemConfigCache`、Ant Design Popconfirm/Modal、MyBatis `databaseId`、`SqlDialectHelper`、Gitee master

**前置已完成（勿重复）：** 设置 P1–P10（P5 跳过）、三库生产交付、Oracle CONCAT（Team/Tag/Review）、Gitee push `4fd0494`

---

## 范围对照（差距 → 是否进本收尾）

| 差距项 | 进本计划？ | Phase |
|--------|------------|-------|
| inventory LIMIT/DATE/ON_DUPLICATE 复核去伪 | **是** | **C1** |
| 导出 / 删日志二次确认接到业务页 | **是** | **C2** |
| Settings 热读 runtime（RAG/KAG/Agent 超时等） | **是（最小切片）** | **C3** |
| 设计文档「待合入」等过时表述 | **是** | **C4** |
| PG/Oracle 完整 JVM 全栈冒烟 | **否（可选附录）** | 附录 O1 |
| `"level"` 保留字全库 ORM 扫 | **否（可选附录）** | 附录 O2 |
| P5 真数字签名 | **否** | 非目标 |
| upload-progress-resume / ai-dual-env | **否** | 非目标（另开会话） |
| test-email / 在线用户占位做真 | **否** | 非目标 |

---

## 分期总览

| Phase | 内容 | 验收 | 预估 |
|-------|------|------|------|
| **C1** | 方言 inventory 复核 | 「待改」仅剩真实未改项；假阳性勾掉 | 0.5～1d |
| **C2** | 合规二次确认接线 | 导出 PDF、操作日志批量删除尊重开关 | 0.5d |
| **C3** | Settings 最小热读 | Agent 超时（或 RAG TopK 其一）可读配置表；无 Redis 不挂 | 1～1.5d |
| **C4** | 文档收口 + push | 设计/计划表述对齐；commit + push | 0.5d |
| **附录** | Oracle/PG 全栈 / level | 有客户部署需求再开 | 另估 |

---

## 文件与职责地图

| 路径 | 职责 |
|------|------|
| `backend/sql/schema/dialect-sql-inventory.md` | 风险清单；C1 刷新状态 |
| `frontend/.../OperationLogPage.tsx` | 批量删除二次确认 |
| `frontend/.../document` 导出入口（搜 `downloadDocumentPdf` / `batchExport`） | 导出二次确认 |
| `frontend/.../SettingsPage` / `types` | 已有 compliance 字段，C2 只接线 |
| `backend/kb-common/.../SystemConfigCache.java` | 热读源 |
| `backend/kb-agent/.../AgentProperties.java` + 引擎/工具超时调用点 | C3 最小热读切片 |
| `docs/superpowers/specs/2026-07-20-db-multi-dialect-design.md` | 去掉过时「待合入」 |
| `docs/superpowers/plans/2026-07-20-settings-and-api-contracts.md` | 链到本收尾计划 |
| 本地 `readme_plan.md` | 记录差距（不入库） |

---

## Phase C1 — 方言 inventory 复核去伪

**Files:**
- Modify: `backend/sql/schema/dialect-sql-inventory.md`
- Read: `SearchHistoryMapper.xml`、`DocumentStatisticsMapper.xml`、`TagMapper.xml`、各统计 Mapper 的 `databaseId`

### Tasks

- [x] **C1.1** 对「待改」每一行打开对应文件，判断：已有 `databaseId=oracle` / helper / 非运行时 SQL → 移入「已 Oracle 分支」或「误报」
- [x] **C1.2** 重点确认 `SearchHistoryMapper` 的 `ON_DUPLICATE` / `LIMIT`（计划认为多半已有分支）
- [x] **C1.3** 统计 Mapper：区分「默认 MySQL 语句」与「缺 Oracle 副本」；缺的才留待改
- [x] **C1.4** 刷新汇总表计数；「下一步」改为指向真实剩余（或写「无阻塞待改」）
- [x] **C1.5** Commit：`docs(db): 复核 dialect inventory 去伪`

**验收：** 清单中「待改」条数显著下降且每条可复现为真实缺口。

---

## Phase C2 — 合规二次确认接到业务页

**Files:**
- Modify: `frontend/src/pages/admin/OperationLogPage.tsx`（批量删除）
- Modify: 文档导出调用处（`document.service` 消费方：详情页/列表「下载 PDF」「批量导出」）
- Optional: 抽 `frontend/src/hooks/useComplianceConfirm.ts`（读 `settingsService.getSettings().compliance`，失败默认需确认）

### Tasks

- [x] **C2.1** 实现 `useComplianceConfirm`（或内联）：缓存 compliance 开关；`getSettings` 失败 → 全部视为 `true`（偏安全）
- [x] **C2.2** 操作日志批量删除：`confirmSensitiveDelete !== false` 时 `Modal.confirm` / `Popconfirm`
- [x] **C2.3** 单文档下载 PDF / 批量导出：`confirmSensitiveExport !== false` 时确认后再请求
- [x] **C2.4** 手工：设置页关掉对应开关 → 业务页不再弹确认；打开则弹（逻辑已对齐；联调依赖运行中前后端）
- [x] **C2.5** Commit：`feat(compliance): 导出与删日志二次确认接线`

**验收：** 与设置页「审计与合规」四个开关中 export/delete 两端行为一致；图谱/重建已在 P9 接线，本 Phase 不重复。

**不做：** 全站所有 Delete 按钮（范围爆炸）；仅计划点名的导出与操作日志删除。

---

## Phase C3 — Settings 最小热读（Agent 超时切片）

> 原则：先打通「配置表 → Redis → 运行时读」一条竖切，再扩 RAG/KAG。避免一次改全服务。

**Files:**
- Modify: `backend/kb-agent/.../AgentProperties.java` 或新建 `AgentRuntimeSettings.java`
- Modify: `LinearWorkflowEngine` / `GatewayToolHttpClient` 中读取超时处
- Check: `kb-agent` 是否已有 Redis；无则 **可选** 加 `spring-boot-starter-data-redis` + Nacos 样例，或文档写明「仅当 Redis 可用时热读」
- Test: 单测 mock `SystemConfigCache` 覆盖秒数解析

### Tasks

- [x] **C3.1** 调研：`kb-agent` 当前有无 `StringRedisTemplate`；决定 Conditional 方案
- [x] **C3.2** 实现 `resolveRunSeconds` / `resolveToolSeconds`：优先 `SystemConfigCache.getConfig("agent.timeouts.*")`，否则回退 `AgentProperties`
- [x] **C3.3** 引擎与工具客户端改用 resolve 方法
- [x] **C3.4** 单测：无 Redis / 有缓存键 / 非法数字回退
- [x] **C3.5** 说明：Settings「Agent」Tab 已有提示；补充「热读需 Redis 与 kb-core 写缓存」
- [x] **C3.6** Commit：`feat(agent): 超时配置支持 SystemConfigCache 热读`

**验收：** 管理端改 Agent Run 超时并保存 →（Redis 已同步）新 Run 使用新值，无需重启 agent（或文档写明需短 TTL/即时读）。

**本 Phase 明确不做：** RAG TopK / KAG 开关热读（列为 C3 后续可选 Task，不阻塞收尾）。

### 可选 C3b（同一收尾周期有余力再开）

- [ ] RAG：`RagProperties` 或检索入口读 `rag.retrieval.*`
- [ ] KAG：`kag.extraction.auto-enabled` 在生命周期监听处读取

---

## Phase C4 — 文档收口与推送

**Files:**
- Modify: `docs/superpowers/specs/2026-07-20-db-multi-dialect-design.md`（「待合入」→「已合入 Gitee master」）
- Modify: `docs/superpowers/plans/2026-07-20-settings-and-api-contracts.md`（文首链到本收尾计划）
- Modify: 本文件 checkbox
- Modify: 本地 `readme_plan.md`（不入库）

### Tasks

- [ ] **C4.1** 更新设计「仍属差距」：删过时合入句；保留真实剩余（全栈冒烟、level、LIMIT 若 C1 后仍有）
- [ ] **C4.2** 设置计划文首增加「收尾见 `2026-07-20-backlog-closeout.md`」
- [ ] **C4.3** `readme_plan` 记 C1～C4 结果与未做项
- [ ] **C4.4** Commit + `git push origin master`（Gitee；无 gh PR）

**验收：** 新人读设计/计划不会以为代码还在未合入分支。

---

## 附录（可选，默认不做）

### O1 — PG/Oracle 最小 JVM 冒烟

- 单服务（如 `kb-statistics`）+ 自备库 + profile；不强制常驻 compose
- 产出：脚本或 IT + 文档门禁（无环境 SKIP）

### O2 — `"level"` 等保留字全库确认

- 扫实体/Mapper 中 Oracle 保留字列；需要处加引号或改列名（改列名成本高，优先引号）

---

## 非目标（本收尾不做）

1. P5 PKCS#7 数字签名  
2. `upload-progress-resume-fast`、`ai-dual-env-public-intranet`（另开计划会话）  
3. test-email / 在线用户做真实现  
4. 银行支付 / 信创库  
5. 一次改完所有服务热读  

---

## 换会话执行指引

1. 读本文件 + 本地 `readme_plan.md`  
2. 从第一个未勾选 `- [ ]` 的 Phase 继续；每 Phase 结束勾选并 commit  
3. 用户口令「按计划推进，自检，提交，下一步」= 执行下一未完成 Phase  
4. C1→C2→C3→C4；附录仅用户点名时开  
5. 全部 C1–C4 勾完后：本轮「差距收尾」视为完成  

---

## Definition of Done

- [ ] inventory「待改」仅为真实缺口（或为零阻塞项）  
- [ ] 导出 PDF + 操作日志批量删除服从合规开关  
- [ ] Agent 超时至少一条热读竖切可演示（或文档写明 Redis 前提且代码已接）  
- [ ] 设计/计划文档不再写「待合入 master」  
- [ ] 变更已 push Gitee  
