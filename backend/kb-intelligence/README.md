# kb-intelligence（Intelligence BC）

> **运行时**：单一进程 **:8091**，承载原 AI / Search / Graph 能力。  
> **不是**三个可独立部署的服务；Maven 子模块仅按领域拆 jar。

## 子模块

| 模块 | 历史来源 | 职责 |
|------|----------|------|
| `kb-intelligence-app` | — | Spring Boot 启动入口 |
| `kb-intelligence-llm` | kb-ai | 对话、RAG、Embedding、分块索引消费 |
| `kb-intelligence-retrieval` | kb-search | 文档元数据检索、索引健康/重建 |
| `kb-intelligence-graph` | kb-graph | 知识图谱查询与图构建消费 |

## 包名说明

- 现有代码大量位于 `com.knowledge.base.ai` / `search` / `graph`（合并时保留，降低风险）
- **任务 59**：不做一次性大挪包；类注释与文档统一称「Intelligence BC」
- 可选约定：新增类型优先 `com.knowledge.base.intelligence.*`

## 配置准源

| 层级 | 位置 | 用途 |
|------|------|------|
| 准源 | Nacos `kb-intelligence-dev.yaml`（模板见 `backend/nacos/`） | 运行时生效 |
| 兜底 | `kb-intelligence-llm/src/main/resources/application.yml` 等 | 本地启动 / Nacos 未就绪 |
| 默认模型 | `ai.default-model=qwen`（Nacos 与模块兜底一致；DeepSeek 可选） | 与第 7 阶段计划一致 |

## 对内调用

- 读文档：直连 Core + HMAC（路径矩阵见 `docs/after/internal-hmac-path-matrix.md`）
- 对外：仅经 Gateway `/api/ai/**`、`/api/search/**`、`/api/graph/**`

合并历程见 [docs/after/intelligence-merge-plan.md](../../docs/after/intelligence-merge-plan.md)（历史文档；顶部状态以「已合并」为准）。
