# 系统设置增强 + API 契约对齐 Implementation Plan

> **For agentic workers:** 按 Phase 顺序推进；每 Phase 可独立验证。Steps 用 checkbox 跟踪。

**Goal:** 修掉前后端中/高风险接口契约问题，并把系统设置从「早期骨架」补成与现网能力匹配的配置面：先 AI/导出合规，再 RAG/图谱/Agent/审计/集成。

**Architecture:** Phase1 契约对齐；P2–P5 走 Settings 分组 + PDF 导出链路；P6+ 按业务 Tab 扩展配置键，默认只落库展示，运行时热更新按模块另开。

**Tech Stack:** React/Ant Design 设置页、kb-core Settings/Document、kb-intelligence AI/Graph/RAG、PDFBox、可选证书

---

## 范围对照（产品建议 vs 计划）

| 产品建议 | 是否已进计划 | Phase |
|----------|--------------|-------|
| API 契约（中/高风险） | 是 | **P1（已完成）** |
| AI 设置下拉（Provider/模型/Embedding/向量库） | 是 | **P2（已完成）** |
| 文件/导出：PDF 水印（用户/自定义） | 是 | **P3（已完成）** |
| 导出审计日志 | 是 | **P4（已完成）** |
| 真数字签名（证书/PKCS#7） | 是（可选） | **P5（默认跳过）** |
| 检索/RAG Tab（TopK、混合检索、重建说明） | **已补入 backlog** | **P6（已完成）** |
| 知识图谱 Tab（自动抽取、重建/清理） | **已补入 backlog** | **P7（已完成）** |
| Agent Tab（默认工作流、超时、工具） | **已补入 backlog** | **P8（已完成）** |
| 审计与合规 Tab（保留期、二次确认） | **已补入 backlog** | **P9（已完成）** |
| 集成 Tab（RustFS/邮件集中） | **已补入 backlog** | **P10（已完成）** |
| 银行支付全套（KYC/清算等） | **不做** | 仅吸收水印+审计+复核思路 |

---

## 范围与分期

| Phase | 内容 | 验收 | 状态 |
|-------|------|------|------|
| **P1** | API 契约对齐 | 相关调用不再因路径/类型 500 | **完成** |
| **P2** | AI 设置下拉对齐真实栈 | 可保存；弱化纯 Milvus 写死 | **完成** |
| **P3** | 文件设置 + PDF 水印 | 下载 PDF 可见水印 | **完成** |
| **P4** | 导出审计 | 谁/何时/哪篇可查 | **完成** |
| **P5** | 数字签名（可选） | 有合规硬需求再开 | **跳过** |
| **P6** | 检索/RAG 设置 Tab | TopK/混合检索/向量库说明可配 | **完成** |
| **P7** | 知识图谱设置 Tab | 自动抽取开关 + 重建入口说明 | **完成** |
| **P8** | Agent 设置 Tab | 默认工作流/超时/工具开关 | **完成** |
| **P9** | 审计与合规 Tab | 日志保留期、敏感操作二次确认 | **完成** |
| **P10** | 集成 Tab | 存储/邮件配置集中展示 | **完成** |

---

## Phase 1 — API 契约

### Tasks

- [x] P1.1 分类/版本/图谱/文件 前端对齐
- [x] P1.2 AiFeedback 映射修复
- [x] P1.3 test-email 后端
- [x] P1.4 高风险字面路径（users/categories）后端或前端改走已有接口
- [x] P1.5 quick-questions：对齐 `/ai/suggestions`
- [x] P1.6 更新 `readme_plan.md`；重启受影响服务冒烟

---

## Phase 2 — AI 设置下拉（已完成）

- [x] 设置 VO/DTO 扩展：chatProvider、embeddingProvider、chatModel、embeddingModel、vectorStore、高级参数
- [x] SettingsPage AI Tab：下拉 + AutoComplete；向量库 ES / Qdrant / Milvus
- [x] 从 `/ai/chat/models` 拉聊天模型列表；Embedding 预设硅基 bge-m3 / 通义等
- [x] 高级折叠：温度、maxToken、超时
- [x] 说明：运行时以 .env/Nacos 为准，配置表需重启 intelligence

---

## Phase 3 — 文件/导出 + PDF 水印（已完成）

- [x] 新增设置 Tab「文档与导出」（或「文件设置」）
- [x] 配置键：`pdf.watermark.enabled` / `type`（user|custom|user_time）/ `text`；透明度可选
- [x] `PdfExportServiceImpl` 按设置绘制水印
- [x] 「导出页脚声明」本轮跳过，并入 P4/P5 再定

---

## Phase 4 — 导出审计（已完成）

- [x] 审计记录：documentId、userId、format、ip、time（复用 `kb_operation_log` + `@OperationLog`）
- [x] download-pdf / export-pdf / batch-export 写入
- [x] 管理端并入操作日志（模块筛选项「文档导出」）

---

## Phase 5 — 数字签名（可选，已跳过）

- [x] 无合规硬需求，跳过；用水印 + 导出审计替代
- [ ] 合规确认后再设计证书托管与 PKCS#7（保留）

---

## Phase 6 — 检索 / RAG Tab（已完成）

- [x] TopK、混合检索开关、向量库展示（可写，落配置表）
- [x] 重建索引操作说明/入口（链到已有 `/rag/reindex/all`）

---

## Phase 7 — 知识图谱 Tab（已完成）

- [x] 自动抽实体开关、抽取模型选择
- [x] 重建/清理说明（链到现有 graph rebuild/cleanup）

---

## Phase 8 — Agent Tab（已完成）

- [x] 默认工作流、超时、工具开关（落 Settings；运行页读取默认工作流；键名对齐 agent.*）

---

## Phase 9 — 审计与合规 Tab（已完成）

- [x] 操作日志保留期（配置 + 定时清理）
- [x] 敏感操作二次确认（导出/重建索引/图谱/删除开关；设置页与图谱页已接线）

---

## Phase 10 — 集成 Tab（已完成）

- [x] 对象存储/RustFS、邮件等配置集中；与现有存储/通知页去重或跳转

---

## 原则

1. 字面路径必须在 `/{id}` 前声明（或仅改前端避开）。
2. 优先改前端对齐稳定后端；缺能力再补最小后端。
3. 设置项先入库/配置表，再绑运行时；避免只改 UI 不落库。
4. P5 默认不做，除非用户明确要求。
5. P6–P10 不阻塞 P2–P4；银行支付中台能力不纳入本仓库范围。
