# AI 公网 / 内网双环境设计

**日期：** 2026-07-20  
**状态：** 已实现（配置解耦 + Profile 样例）  
**计划：** [plans/2026-07-20-ai-dual-env-public-intranet.md](../plans/2026-07-20-ai-dual-env-public-intranet.md)

## 目标

同一套 AI-RAG 代码，通过环境变量切换：

| Profile | 对话 | 向量 |
|---------|------|------|
| **public** | DashScope `qwen3-max` + 可选 DeepSeek | 默认 `text-embedding-v3`；可选硅基 `BAAI/bge-m3` |
| **intranet** | Ollama `qwen2.5:7b` / `14b` | `bge-m3`（Ollama 或 TEI） |

中间件（MySQL/ES/Redis/…）不变。向量维度默认 **1024**。

## 回退规则

```
rag.embedding.api-key  非空？ → 用它 : qwen.api-key
rag.embedding.base-url 非空？ → 用它 : qwen.base-url
rag.embedding.model           → 直接用（默认 text-embedding-v3）
```

未配置独立 Embedding Key 时，行为与历史「对话/向量共用通义」一致。

## 硬约束

更换 embedding 模型或提供商后，**必须重建** ES `kb_chunk`（及开启时的 Qdrant 集合）。  
`text-embedding-v3` 与 `bge-m3` 不可混用同一向量索引。

## 切换步骤

1. 按 `deploy/profiles/*.env.example` 改 `deploy/.env`
2. `deploy/scripts/import-nacos.ps1`
3. 重启 `kb-intelligence`、`kb-agent`
4. 若改了向量模型：`rebuild-es-indices.ps1`

## 非目标

Oracle/MySQL/PG 三库兼容（另开 `feat/db-multi-dialect` 单分支里程碑）。
