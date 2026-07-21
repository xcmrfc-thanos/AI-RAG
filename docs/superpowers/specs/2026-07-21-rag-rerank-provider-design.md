# RAG 专用重排 + 检索链路提速设计

> **日期**：2026-07-21  
> **状态**：已实现（2026-07-21）  
> **决策前提**：用户选择方案 B（配置快赢 + 逻辑优化）+ 推荐策略 A（重排 **auto 跟 embedding**，可覆盖；支持私有 `/v1/rerank`）；并要求 **import-nacos 从 `deploy/.env` 读取 API Key**，避免每次手动录入  
> **关联**：对话勾选知识库慢、串行 LLM 重排；`.env` 已有 `QWEN_*` / `SILICONFLOW_*` / `RAG_EMBEDDING_PROVIDER`

## 1. 目标

1. **专用 Rerank API**：一次请求对候选列表打分，替代「对话 LLM 逐块串行打分」。
2. **Provider 跟 embedding 同源（auto）**：通义向量 → 通义重排；硅基向量 → 硅基重排；可显式覆盖。
3. **私有化**：`provider=custom` + 内网 OpenAI 风格 `POST .../v1/rerank`（Xinference / TEI / Infinity 等）。
4. **检索热路径提速**：默认关掉 LLM 重排；截断候选；去掉不必要的 `createIndexIfNotExists`；KAG 与 RAG 真并行；阶段耗时日志。
5. **前端相关度展示**（已完成）：0%～100% 相对归一，不在本设计重复实现。
6. **本地运维**：`import-nacos.ps1` 导入前加载 `deploy/.env`，将模板中的 `${QWEN_API_KEY:}` 等占位符**展开为实值**再写入 Nacos（至少覆盖 kb-intelligence / kb-agent；建议全量模板统一展开），重启前后端后无需在 Nacos 控制台手填密钥。

## 2. 非目标

- 不引入 DeepSeek 官方重排（无官方 `/rerank`）。
- 不在本迭代落地「本地 JVM 内嵌 ONNX 重排模型」；私有化统一走 HTTP `/v1/rerank`。
- 不改搜索/对话对外 REST 契约字段名（可增可选耗时字段，非必须）。
- 不做查询改写 / HyDE / Multi-Query（后续 backlog）。
- 不强制迁移历史索引；重排只影响查询侧排序。

## 3. 现状问题

| 环节 | 现状 | 问题 |
|------|------|------|
| 重排 | `RagRetrievalServiceImpl.rerank` 对每个候选 `ChatLanguageModel.generate` | N 次 LLM，对话勾知识库极慢 |
| 配置 | `rag.rerank.model=qwen` | 名似专用模型，实为对话模型别名 |
| 热路径 | 每次 `retrieve` 调 `createIndexIfNotExists` | 多余开销 |
| KAG 混合 | `HybridRetrievalServiceImpl` 先跑完 RAG 再启 KAG | 注释写并行，实为串行 |
| 默认开关 | `RAG_RERANK_ENABLED=true` | 默认惩罚延迟 |
| Nacos 导入 | `import-nacos.ps1` 原样上传 `${QWEN_API_KEY:}` | 本地重启后常需手填；与 `start-services` 已 load `.env` 不同步 |

## 4. 重排模式与 Provider

### 4.1 `rag.rerank.mode`

| 值 | 行为 |
|----|------|
| `off` | 不做重排，RRF/加权融合后截断 topK |
| `api` | **推荐默认**：调专用 Rerank HTTP API，一批 documents 一次请求 |
| `llm` | 保留旧路径（串行对话 LLM），仅兼容/压测；文档标明不推荐生产 |

`rag.rerank.enabled=false` 等价于 `mode=off`（兼容现有设置页布尔开关）。  
若 `enabled=true` 且未配 `mode`，默认 **`api`**；若 api 凭证不可用则降级 **`off`**（打 warn，不回退 llm，避免又变慢）。

### 4.2 `rag.rerank.provider`

| 值 | 含义 |
|----|------|
| `auto`（默认） | 跟随 `rag.embedding.provider`：`siliconflow` → 硅基；否则 → `qwen` |
| `qwen` | 通义 DashScope 重排 |
| `siliconflow` | 硅基 `/v1/rerank` |
| `custom` | 私有化：仅用 `rag.rerank.base-url` + `api-key` + `model` |

### 4.3 默认模型与端点

| Provider | 默认 model | Endpoint（相对 base） | 凭证解析（与 Embedding 对齐） |
|----------|------------|----------------------|------------------------------|
| `qwen` | `qwen3-rerank` | DashScope 兼容：`{qwen.base-url 同源域}/compatible-api/v1/reranks` 或原生 text-rerank（实现选一种并写死注释；**优先 OpenAI 兼容 `/reranks`**） | `rag.rerank.api-key` → `qwen.api-key` |
| `siliconflow` | `BAAI/bge-reranker-v2-m3` | `{siliconflow.base-url}/rerank`（即 `/v1/rerank`） | `rag.rerank.api-key` → `siliconflow.api-key` |
| `custom` | 必填 `rag.rerank.model` | `{rag.rerank.base-url}/rerank`（若 base 已含 `/v1` 则拼 `/rerank`） | 仅 `rag.rerank.api-key`（可空，内网无鉴权） |

**硅基请求体（规范）**：

```json
{
  "model": "BAAI/bge-reranker-v2-m3",
  "query": "...",
  "documents": ["chunk1", "chunk2"],
  "top_n": 5,
  "return_documents": false
}
```

**通义兼容请求体（规范）**：

```json
{
  "model": "qwen3-rerank",
  "query": "...",
  "documents": ["chunk1", "chunk2"],
  "top_n": 5
}
```

响应统一适配为：`List<{ index, relevance_score }>`，按 score 降序取 topK，写回 `RagSearchResultVO.score` / `rerankScore`。

### 4.4 配置草案

```yaml
rag:
  rerank:
    enabled: ${RAG_RERANK_ENABLED:true}
    mode: ${RAG_RERANK_MODE:api}          # off | api | llm
    provider: ${RAG_RERANK_PROVIDER:auto}  # auto | qwen | siliconflow | custom
    model: ${RAG_RERANK_MODEL:}           # 空则按 provider 默认
    api-key: ${RAG_RERANK_API_KEY:}       # 可选覆盖
    base-url: ${RAG_RERANK_BASE_URL:}     # custom 必填；其它可选覆盖
    top-n: ${RAG_RERANK_TOP_N:0}          # 0=用检索 topK；>0 则 min(候选, top-n)
    max-candidates: ${RAG_RERANK_MAX_CANDIDATES:20}  # 送入 rerank 的上限
    timeout-ms: ${RAG_RERANK_TIMEOUT_MS:8000}
```

`deploy/env.example` / Nacos `kb-intelligence-dev.yaml.template` 同步；注释说明 auto 行为。

### 4.5 设置页 / 热读

- 现有 `ragRerankEnabled` 继续映射 `rag.rerank.enabled`。
- **本迭代可不加** Settings 新字段（provider/mode 走 Nacos/环境变量即可）；若加，仅布尔 + 文案「推荐专用 API，勿用对话 LLM」。
- `RagRuntimeSettings`：可选热读 `rag.rerank.enabled` / `max-candidates`（非必须；与现有 TopK 热读风格一致则可加）。

## 5. 代码结构

```
com.knowledge.base.ai.rag.rerank
  RerankService            # 接口：rerank(query, candidates, topK) → List<RagSearchResultVO>
  ApiRerankService         # HTTP 客户端（硅基 / 通义兼容 / custom）
  LlmRerankService         # 从 RagRetrievalServiceImpl 抽出旧逻辑
  RerankProviderResolver   # auto → 有效 provider + model + credentials
RagRetrievalServiceImpl    # 按 mode 委托；不再内嵌 for-loop LLM
```

凭证解析复用 `EmbeddingConfig` 同款顺序思想（可抽小工具类 `ModelCredentialResolver`，YAGNI 则先在 `RerankProviderResolver` 内复制清晰逻辑）。

## 6. 检索链路其它优化（同迭代）

| ID | 改动 | 文件 |
|----|------|------|
| L1 | `retrieve` **不再每次** `createIndexIfNotExists`；启动或首次索引写入时创建 | `RagRetrievalServiceImpl`；索引写入路径保留 ensure |
| L2 | 送入 rerank 前 `candidates = candidates.subList(0, min(size, maxCandidates))` | `RagRetrievalServiceImpl` |
| L3 | `HybridRetrievalServiceImpl`：RAG 与 KAG **同时** `supplyAsync`，再 `allOf`/各自 get | `HybridRetrievalServiceImpl` |
| L4 | 日志：`embedMs` / `hybridMs` / `rerankMs` / `totalMs`（info 一条） | `RagRetrievalServiceImpl` |
| L5 | 默认：新环境 `RAG_RERANK_MODE=api`；文档建议生产勿用 `llm`；若无 key 则 off | env.example / deploy README |

对话路径：`RagChatServiceImpl.safeRetrieve` 仍传 `rerank.enabled`；由 mode 决定 api/llm/off。

## 7. 失败与降级

```
api 调用失败 / 超时 / 4xx/5xx
  → warn 日志
  → 使用融合分截断 topK（等同 mode=off）
  → 不自动切 llm
```

Embedding 失败仍可 BM25-only（现状保留）。

## 8. 私有化运维说明（文档）

`deploy/README.md` 或 `docs/` 短节：

1. 部署 Xinference / TEI，加载 `BAAI/bge-reranker-v2-m3`。
2. 暴露 `http://rerank-host:port/v1/rerank`。
3. 配置：

```env
RAG_RERANK_PROVIDER=custom
RAG_RERANK_BASE_URL=http://rerank-host:port/v1
RAG_RERANK_MODEL=BAAI/bge-reranker-v2-m3
RAG_RERANK_API_KEY=
RAG_RERANK_MODE=api
```

## 8.1 本地 Nacos 导入从 `.env` 展开密钥

**问题**：当前 `deploy/scripts/import-nacos.ps1` 把 `backend/nacos/*.template` **原样**写入 Nacos，内容仍是 `${QWEN_API_KEY:}` 等占位符；本地改 `.env` 或重导配置后，常需在 Nacos 控制台对 **kb-intelligence / kb-agent** 手填 key。

**目标**：导入时读取 `deploy/.env`（不存在则跳过展开并 warn），对模板内容做 `${VAR}` / `${VAR:default}` 替换后再 Publish。

**行为约定**：

1. 脚本启动时 `Import-DotEnv`（与 `start-services.ps1` / `verify-llm-config.ps1` 同风格）。
2. **全量** dataId 均展开（不仅 intelligence/agent），避免 core/gateway 同类占位漏替。
3. 日志只打印「已展开哪些变量名 + 是否非空」，**禁止**打印 key 明文。
4. `.env` 中无的变量：保留 Spring 默认语法或替成 default（与 `${VAR:}` 空默认一致）。
5. 仓库内 **template 文件仍保持占位符**（勿把真实 key 写进 git）；仅 Nacos 运行时配置含实值。
6. `deploy/README.md` 本地流程改为推荐：

```powershell
cd deploy
# 编辑 .env 填入 QWEN_API_KEY / SILICONFLOW_API_KEY 等
.\scripts\import-nacos.ps1
.\stop-services.ps1 -IncludeFrontend
.\start-services.ps1
# 前端另开：cd ..\frontend; npm run dev
```

可选：`start-services.ps1 -ImportNacos` 开关（默认 false，避免每次启动都刷 Nacos）；计划实现为可选参数。

**安全**：Nacos 本地明文存 key 与「控制台手填」风险相同；生产应用密钥托管/加密配置，本迭代不做。

## 9. 验收标准

1. `provider=auto` + `RAG_EMBEDDING_PROVIDER=siliconflow` → 实际请求打到硅基 `/rerank`，模型默认 bge-reranker。
2. `provider=auto` + embedding=qwen → 打到通义 `qwen3-rerank`。
3. `provider=custom` + mock HTTP → 按 index/score 重排正确。
4. `mode=off` 或 api 失败 → 无 N 次对话 LLM 调用；延迟明显低于旧 llm 路径。
5. 单测：Resolver 默认模型；ApiRerank 响应解析；Retrieval 截断 max-candidates。
6. 勾选知识库对话：首 token 前等待以 embedding+hybrid+单次 rerank 为主，而非 N×LLM。
7. `deploy/.env` 含 `QWEN_API_KEY` / `SILICONFLOW_API_KEY` 时执行 `import-nacos.ps1`，Nacos 中 `kb-intelligence-dev.yaml` / `kb-agent-dev.yaml` 对应 `api-key:` **为实值**（非 `${...}`）；无 `.env` 时脚本不崩并 warn。

## 10. 分期

| Phase | 内容 | 预估 |
|-------|------|------|
| P0 | 配置扩展 + `RerankProviderResolver` + `ApiRerankService`（硅基 + 通义兼容）+ 接入 Retrieval；默认 mode=api；失败降级 off | 主体 |
| P1 | L1～L4 热路径；KAG 真并行；耗时日志 | 同 PR 或紧随 |
| P2 | **`import-nacos.ps1` 从 `.env` 展开密钥**；env.example 增 rerank 变量；Nacos 模板 rerank 段；README 重启流程 | 同迭代必做 |
| P3（可选后续） | Settings 暴露 provider/mode；`-ImportNacos`；专用 rerank 热读 | 可同做 Import 开关 |

## 11. 风险

| 风险 | 缓解 |
|------|------|
| 通义兼容 `/reranks` 与原生路径差异 | 实现前用现网 key 冒烟；失败则实现原生 text-rerank 适配器 |
| 硅基/通义响应 JSON 字段名差异 | 适配层兼容 `results[].relevance_score` / `output.results` |
| auto 跟错 provider | 启动 log 打印 resolved provider/model/baseUrl（脱敏） |
| 旧 llm 被误开 | 默认 api；README 警告；Settings tip |
| `.env` 展开后 Nacos 含明文 key | 仅本地约定；README 注明勿提交导出的 Nacos 快照；template 保持占位 |

## 12. 自检

- [x] Provider auto / qwen / siliconflow / custom 均有任务落点  
- [x] 无私有化「无 HTTP 仅本地 jar」范围蔓延  
- [x] 与现有 Embedding 凭证解析一致  
- [x] 明确不回退慢速 llm  
- [x] 含检索链路 L1～L4，不只重排  
- [x] 含 Nacos 从 `.env` 展开 API Key（intelligence/agent + 全量模板）  
