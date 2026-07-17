# 项目文档索引

## 架构与改造

| 文档 | 说明 |
|------|------|
| [after/rh-cha-roadmap.md](after/rh-cha-roadmap.md) | rh-cha 架构改造路线图（Phase 0–3） |
| [after/rh-cha.md](after/rh-cha.md) | 架构改造背景与目标 |
| [after/service-merge-plan.md](after/service-merge-plan.md) | 服务合并计划 |
| [after/intelligence-merge-plan.md](after/intelligence-merge-plan.md) | Intelligence BC 合并 |
| [ai-entry-boundaries.md](ai-entry-boundaries.md) | AI 入口产品边界（搜索/助手/写作/Agent） |
| [agent/agent-contract-v1.md](agent/agent-contract-v1.md) | Agent 工作流契约 v1（任务 64 冻结） |
| [agent/agent-security-boundary.md](agent/agent-security-boundary.md) | Agent 安全边界 |
| [agent/workflow-schema-v1.json](agent/workflow-schema-v1.json) | 工作流 JSON Schema v1 |
| [第7阶段-地基治理与Agent演进计划.md](第7阶段-地基治理与Agent演进计划.md) | 第 7 阶段计划 |

## 部署与运维

| 文档 | 说明 |
|------|------|
| [after/p3-2-deployment.md](after/p3-2-deployment.md) | Phase 3 部署收敛 |
| [after/p3-3-operations.md](after/p3-3-operations.md) | 运行手册与监控 |
| [after/p1-7-legacy-offline.md](after/p1-7-legacy-offline.md) | Intelligence 旧服务下线 |
| [after/p2-7-legacy-offline.md](after/p2-7-legacy-offline.md) | Core 旧服务下线 |

> **同步纪律**：`deploy/` 可能不入 Git；本地改脚本后请保留副本。联调冒烟准源为 `deploy/scripts/verify-all.ps1`（含 `verify-auth-ai.ps1`）。

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
| [../frontend/docs/archive/README.md](../frontend/docs/archive/README.md) | 历史开发笔记（归档） |

## 变更记录

任务级变更见根目录 [readme_plan.md](../readme_plan.md)。

## 第 7 阶段（已完成，2026-07-17 严格验收通过）

| 文档 | 说明 |
|------|------|
| [第7阶段-地基治理与Agent演进计划.md](./第7阶段-地基治理与Agent演进计划.md) | 地基短板治理（56–63）→ Agent MVP（64–71）→ 向量库合闸与画布（72–75）；Phase 7 gates / 全量测试已通过 |
