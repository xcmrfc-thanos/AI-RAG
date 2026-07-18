# AI-RAG 企业知识库

4 BC 微服务架构 + React 前端，支持文档管理、全文/语义检索、RAG 对话、知识图谱与 Admin 后台。

## 快速启动

```powershell
# 1. 中间件（MySQL / Redis / ES / RabbitMQ / RustFS / Nacos）
cd deploy
.\setup.ps1

# 2. 微服务（JDK 21）
.\start-services.ps1

# 3. 前端
cd ..\frontend
npm install
npm run dev
```

| 入口 | 地址 |
|------|------|
| 网关 | http://127.0.0.1:8080 |
| 前端 | http://127.0.0.1:3002 |
| 默认账号 | admin / admin123 |

## 文档索引

| 文档 | 说明 |
|------|------|
| [readme_plan.md](readme_plan.md) | 开发计划与变更记录（准源） |
| [docs/README.md](docs/README.md) | 架构 / 运维 / 评测文档索引 |
| [docs/第7阶段-地基治理与Agent演进计划.md](docs/第7阶段-地基治理与Agent演进计划.md) | 第 7 阶段（56–75）计划与验收证据 |
| [docs/eval/rag-llm-spotcheck.md](docs/eval/rag-llm-spotcheck.md) | 真实 LLM 质量抽验清单 |
| [docs/superpowers/plans/2026-07-18-upload-progress-resume-fast.md](docs/superpowers/plans/2026-07-18-upload-progress-resume-fast.md) | 真进度 + 分片/续传/秒传最小实现计划 |
| [deploy/README.md](deploy/README.md) | Docker 端口、启动脚本、联调冒烟 |
| [backend/README.md](backend/README.md) | 后端模块、编译、数据库初始化 |
| [frontend/README.md](frontend/README.md) | 前端技术栈与开发说明 |

## 联调冒烟

```powershell
cd deploy\scripts
.\verify-all.ps1
```

包含：中间件探活 → API 冒烟 → **鉴权/AI 安全**（`verify-auth-ai.ps1`）→ LLM 配置 → Admin UI 静态检查 → 定向单测 → 前端 build。

真实 LLM 抽验（Stub 关闭后）：

```powershell
cd deploy\scripts
.\verify-rag-llm-spotcheck.ps1 -WriteJudgementSheet
```

> **注意**：`deploy/` 可能不在 Git 跟踪中，改脚本后请本地保留同步；冒烟脚本以 `deploy/scripts/` 为准源。

## 环境变量（deploy/.env）

| 变量 | 说明 |
|------|------|
| `QWEN_API_KEY` | 通义千问 API Key（生产必填） |
| `AI_DEV_STUB` | `true` 时本地 Stub Chat + 确定性 Embedding |
