# AI-RAG 企业知识库

4 BC 微服务 + Gateway + Agent + React 前端。覆盖文档管理、全文/语义检索、RAG 对话、知识图谱、文件存储与 Admin 后台。

仓库：[Gitee · xcmrfc-thanos/AI-RAG](https://gitee.com/xcmrfc-thanos/AI-RAG)

## 架构一览

| 进程 | 端口 | 职责 |
|------|------|------|
| kb-gateway | 18080 | API 网关 |
| kb-core | 8090 | 鉴权 / 文档 / 文件管理元数据 |
| kb-intelligence | 8091 | RAG / 检索 / 图谱 |
| kb-file | 8084 | 对象存储（RustFS/S3）、秒传与分片续传 |
| kb-statistics | 8085 | 统计投影 |
| kb-agent | 8092 | Agent 工作流 |
| 前端 Vite | 3002 | React + TypeScript |

中间件（Docker）：MySQL、Redis、ES、RabbitMQ、RustFS、Nacos、MongoDB；可选 Qdrant、Neo4j。端口见 [deploy/README.md](deploy/README.md)。

## 仓库结构

```
AI-RAG/
├── backend/          # Maven 多模块（4 BC + gateway + agent）
├── frontend/         # React 前端
├── deploy/           # Docker Compose、启停与冒烟脚本
├── docs/             # 架构 / 运维 / 评测 / 实现计划
├── readme.md         # 本说明（入库）
└── readme_plan.md    # 本地开发变更记录（不入库，见下）
```

> **`readme_plan.md`**：仅本地保留，已加入 `.gitignore`，**不要提交**。克隆仓库后如需历史变更记录，请使用本机备份或从内部文档同步。

## 快速启动

```powershell
# 0. JDK 21（示例路径，按本机修改）
$env:JAVA_HOME = "D:\Users\environments\Java21"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"

# 1. 中间件 + 初始化（首次）
cd deploy
copy env.example .env   # 若尚无 .env，再按需填写 QWEN_API_KEY 等
.\setup.ps1

# 2. 微服务
.\start-services.ps1

# 3. 前端
cd ..\frontend
npm install
npm run dev
```

| 入口 | 地址 |
|------|------|
| 网关 | http://127.0.0.1:18080 |
| 前端 | http://127.0.0.1:3002 |
| Nacos | http://127.0.0.1:20848 |
| 默认账号 | admin / admin123 |

### 停止（不关 Docker 中间件）

```powershell
cd deploy
.\stop-services.ps1 -IncludeFrontend
```

### 配置变更后

```powershell
cd deploy
.\scripts\import-nacos.ps1
.\stop-services.ps1          # 或只杀对应端口后
.\start-services.ps1 -Only file
.\start-services.ps1 -Only core
# 需要时再启 gateway / intelligence 等
```

## 主要能力

- **文档**：上传解析、草稿、权限 ACL、检索与 RAG 问答
- **文件管理**：列表 / 预览 / 下载；上传真实进度（axios `onUploadProgress`）
- **秒传 + 分片续传**（文件管理 / 大文件导入）  
  - 客户端 SHA-256 预检 → `GET /api/file/files/upload/check-hash`  
  - ≥20MB 分片（默认片 5MB，上限约 500MB）→ init / chunk / status / merge  
  - 合并后登记文件管理元数据；导入页可 `from-file` 再解析  
  - 会话存 kb-file JVM 内存：进程重启后不可续传（MVP）
- **AI 双环境（公网 / 内网）**  
  - 公网：对话 `qwen3-max` + 可选 DeepSeek；向量默认 `text-embedding-v3`，可选硅基 `BAAI/bge-m3`  
  - 内网：Ollama `qwen2.5:7b/14b` + `bge-m3`（维度仍 1024）  
  - 样例：`deploy/profiles/public.env.example`、`intranet.env.example`；换向量后须重建索引  
  - 设计：[docs/superpowers/specs/2026-07-20-ai-dual-env-design.md](docs/superpowers/specs/2026-07-20-ai-dual-env-design.md)
- **Agent**：工作流编排、试跑与发布
- **可选**：Qdrant 旁路双写 + ES BM25 混合检索（见 deploy README）

## 环境变量（`deploy/.env`）

| 变量 | 说明 |
|------|------|
| `AI_PROFILE` | 文档约定：`public` / `intranet`（实际靠下方键生效） |
| `QWEN_API_KEY` / `QWEN_BASE_URL` / `QWEN_MODEL` | 对话（及向量回退）OpenAI 兼容 |
| `DEEPSEEK_API_KEY` | 可选第二对话模型 |
| `RAG_EMBEDDING_*` | 独立向量 endpoint；空则回退 `QWEN_*` |
| `RAG_RERANK_ENABLED` | 是否用 LLM 重排（内网可关） |
| `AI_DEV_STUB` | `true` 时本地 Stub Chat + 确定性 Embedding |
| `RAG_QDRANT_ENABLED` | `true` 时开启 Qdrant 双写（需先 `up -d qdrant`） |

密钥文件勿提交；模板见 `deploy/env.example`。

## 联调冒烟

```powershell
cd deploy\scripts
.\verify-all.ps1
```

覆盖：中间件探活 → API → 鉴权/AI 安全 → LLM 配置 → Admin UI → 定向单测 → 前端 build。

上传/秒传抽查：`.\verify-upload-resume.ps1`  
真实 LLM 抽验：`.\verify-rag-llm-spotcheck.ps1 -WriteJudgementSheet`

## 文档索引

| 文档 | 说明 |
|------|------|
| [docs/README.md](docs/README.md) | 架构 / 运维 / 评测总索引 |
| [deploy/README.md](deploy/README.md) | Docker 端口、启动与冒烟 |
| [backend/README.md](backend/README.md) | 后端模块、编译、库表 |
| [frontend/README.md](frontend/README.md) | 前端技术栈与开发说明 |
| [docs/第7阶段-地基治理与Agent演进计划.md](docs/第7阶段-地基治理与Agent演进计划.md) | 第 7 阶段计划与验收 |
| [docs/eval/rag-llm-spotcheck.md](docs/eval/rag-llm-spotcheck.md) | LLM 质量抽验清单 |
| [docs/superpowers/plans/2026-07-18-upload-progress-resume-fast.md](docs/superpowers/plans/2026-07-18-upload-progress-resume-fast.md) | 真进度 / 分片 / 秒传实现计划 |
| [docs/superpowers/plans/2026-07-20-ai-dual-env-public-intranet.md](docs/superpowers/plans/2026-07-20-ai-dual-env-public-intranet.md) | AI 公网/内网双环境实现计划 |
| [docs/superpowers/specs/2026-07-20-ai-dual-env-design.md](docs/superpowers/specs/2026-07-20-ai-dual-env-design.md) | AI 双环境设计 |

## 开发约定（摘要）

- JDK **21**；后端配置准源为 Nacos 模板 `backend/nacos/*-dev.yaml.template`
- 前端文件夹/页面：小写串行；后端包与 Controller Mapping 遵循现有模块规范
- 本地变更流水账写在 **`readme_plan.md`（仅本机）**；对外说明以本 `readme.md` 与 `docs/` 为准
