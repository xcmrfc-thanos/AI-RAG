# 项目文档索引

## 架构与契约

| 文档 | 说明 |
|------|------|
| [after/rh-cha-roadmap.md](after/rh-cha-roadmap.md) | rh-cha 架构改造路线图（Phase 0–3，历史准源） |
| [ai-entry-boundaries.md](ai-entry-boundaries.md) | AI 入口产品边界（搜索/助手/写作/Agent） |
| [agent/agent-contract-v1.md](agent/agent-contract-v1.md) | Agent 工作流契约 v1 |
| [agent/agent-security-boundary.md](agent/agent-security-boundary.md) | Agent 安全边界 |
| [agent/workflow-schema-v1.json](agent/workflow-schema-v1.json) | 工作流 JSON Schema v1 |
| [第7阶段-地基治理与Agent演进计划.md](第7阶段-地基治理与Agent演进计划.md) | 第 7 阶段计划与验收证据（56–75，已完成） |
| [superpowers/specs/2026-07-18-qdrant-hybrid-dual-write-design.md](superpowers/specs/2026-07-18-qdrant-hybrid-dual-write-design.md) | Qdrant 旁路双写设计 |
| [superpowers/plans/2026-07-18-upload-progress-resume-fast.md](superpowers/plans/2026-07-18-upload-progress-resume-fast.md) | 真进度 + 分片/续传/秒传实现计划 |

## 部署与运维

| 文档 | 说明 |
|------|------|
| [after/p3-2-deployment.md](after/p3-2-deployment.md) | Phase 3 部署收敛 |
| [after/p3-3-operations.md](after/p3-3-operations.md) | 运行手册与监控 |
| [after/hmac-key-rotation.md](after/hmac-key-rotation.md) | 内部 HMAC 密钥轮换 |
| [after/internal-hmac-path-matrix.md](after/internal-hmac-path-matrix.md) | 内部签名路径矩阵 |

> **同步纪律**：`deploy/` 联调冒烟准源为 `deploy/scripts/verify-all.ps1`（含 `verify-auth-ai.ps1`）。

## 评测

| 文档 | 说明 |
|------|------|
| [eval/rag-golden-baseline.md](eval/rag-golden-baseline.md) | Search Golden Hit@5 基线 |
| [eval/rag-llm-spotcheck.md](eval/rag-llm-spotcheck.md) | 真实 LLM 质量抽验清单 |
| [eval/vector-store-decision.md](eval/vector-store-decision.md) | 向量库选型决策 |
| [eval/vector-store-es-closure.md](eval/vector-store-es-closure.md) | ES 路径合闸说明 |
| [eval/intelligence-process-split-assessment.md](eval/intelligence-process-split-assessment.md) | Intelligence 拆进程评估 |

## 后端专项

| 文档 | 说明 |
|------|------|
| [../backend/sql/README.md](../backend/sql/README.md) | SQL 脚本总览 |
| [../backend/nacos/README.md](../backend/nacos/README.md) | Nacos DataId 与模板 |
| [../backend/sql/schema/intelligence-jvm-tuning.md](../backend/sql/schema/intelligence-jvm-tuning.md) | Intelligence JVM 调优 |
| [../backend/sql/schema/intelligence-executor-isolation.md](../backend/sql/schema/intelligence-executor-isolation.md) | 线程池隔离 |
| [../backend/sql/schema/statistics-projection-coverage.md](../backend/sql/schema/statistics-projection-coverage.md) | 统计投影覆盖 |

## 前端

| 文档 | 说明 |
|------|------|
| [../frontend/README.md](../frontend/README.md) | 前端开发说明 |
| [../frontend/docs/API路径映射说明.md](../frontend/docs/API路径映射说明.md) | API 路径映射 |

## 变更记录

任务级变更见根目录 [readme_plan.md](../readme_plan.md)（含第 6 阶段遗留治理 29–44 与后续收口）。
