# RAG 专用重排 + 检索提速 + Nacos 从 .env 展开密钥

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用专用 Rerank API（auto 跟 embedding / 可 custom 私有化）替换串行 LLM 重排，提速检索热路径，并让 `import-nacos.ps1` 从 `deploy/.env` 展开 API Key，本地重启无需手填 Nacos。

**Architecture:** `RerankProviderResolver` 解析 provider/凭证 → `ApiRerankService` 调硅基 `/v1/rerank` 或通义 `/reranks` → `RagRetrievalServiceImpl` 按 `mode` 委托；`import-nacos.ps1` 导入前 load `.env` 并替换 `${VAR:default}`。

**Tech Stack:** Spring Boot、Java 21、PowerShell、Nacos、DashScope / SiliconFlow HTTP Rerank

**Spec:** [docs/superpowers/specs/2026-07-21-rag-rerank-provider-design.md](../specs/2026-07-21-rag-rerank-provider-design.md)

---

## 文件地图

| 文件 | 职责 |
|------|------|
| `RagProperties.Rerank` | mode/provider/model/凭证/maxCandidates/timeout |
| `.../rag/rerank/RerankProviderResolver.java` | auto→有效 provider + 默认模型 + key/url |
| `.../rag/rerank/RerankService.java` | 接口 |
| `.../rag/rerank/ApiRerankService.java` | HTTP 重排 |
| `.../rag/rerank/LlmRerankService.java` | 旧串行 LLM（mode=llm） |
| `RagRetrievalServiceImpl.java` | 委托 + L1/L2/L4 |
| `HybridRetrievalServiceImpl.java` | L3 真并行 |
| `kb-intelligence-dev.yaml.template` | rerank 新字段 |
| `deploy/env.example` | 新环境变量 |
| `deploy/scripts/import-nacos.ps1` | load `.env` + 展开占位符 |
| `deploy/start-services.ps1` | 可选 `-ImportNacos` |
| `deploy/README.md` | 重启 + 导入流程 |

---

### Task 1: 扩展 `RagProperties.Rerank`

**Files:**
- Modify: `backend/kb-intelligence/kb-intelligence-llm/src/main/java/com/knowledge/base/ai/config/RagProperties.java`
- Modify: `backend/kb-intelligence/kb-intelligence-llm/src/main/resources/application.yml`
- Modify: `backend/nacos/kb-intelligence-dev.yaml.template`

- [ ] **Step 1: 扩展 Rerank 嵌套类**

将 `Rerank` 改为（保留 `enabled`/`model`，新增字段；`model` 默认改为空串表示「用 provider 默认」）：

```java
@Data
public static class Rerank {
    /** false 时等价 mode=off */
    private boolean enabled = true;
    /** off | api | llm；默认 api */
    private String mode = "api";
    /** auto | qwen | siliconflow | custom */
    private String provider = "auto";
    /** 空则按 resolver 默认模型 */
    private String model = "";
    private String apiKey = "";
    private String baseUrl = "";
    /** 0 表示使用请求 topK */
    private int topN = 0;
    private int maxCandidates = 20;
    private long timeoutMs = 8000;
}
```

- [ ] **Step 2: 同步 application.yml 与 Nacos 模板**

```yaml
  rerank:
    enabled: ${RAG_RERANK_ENABLED:true}
    mode: ${RAG_RERANK_MODE:api}
    provider: ${RAG_RERANK_PROVIDER:auto}
    model: ${RAG_RERANK_MODEL:}
    api-key: ${RAG_RERANK_API_KEY:}
    base-url: ${RAG_RERANK_BASE_URL:}
    top-n: ${RAG_RERANK_TOP_N:0}
    max-candidates: ${RAG_RERANK_MAX_CANDIDATES:20}
    timeout-ms: ${RAG_RERANK_TIMEOUT_MS:8000}
```

- [ ] **Step 3: 更新 `deploy/env.example`**

在 `RAG_RERANK_ENABLED=true` 附近增加：

```env
# 重排：api=专用接口（推荐）| off | llm（慢，不推荐）
RAG_RERANK_MODE=api
# auto=跟随 RAG_EMBEDDING_PROVIDER；也可 qwen | siliconflow | custom
RAG_RERANK_PROVIDER=auto
RAG_RERANK_MODEL=
RAG_RERANK_API_KEY=
RAG_RERANK_BASE_URL=
RAG_RERANK_MAX_CANDIDATES=20
```

- [ ] **Step 4: Commit**

```bash
git add backend/kb-intelligence/kb-intelligence-llm/src/main/java/com/knowledge/base/ai/config/RagProperties.java \
  backend/kb-intelligence/kb-intelligence-llm/src/main/resources/application.yml \
  backend/nacos/kb-intelligence-dev.yaml.template deploy/env.example
git commit -m "feat(rag): extend rerank config for api provider mode"
```

---

### Task 2: `RerankProviderResolver` + 单测

**Files:**
- Create: `backend/kb-intelligence/kb-intelligence-llm/src/main/java/com/knowledge/base/ai/rag/rerank/RerankProviderResolver.java`
- Create: `backend/kb-intelligence/kb-intelligence-llm/src/test/java/com/knowledge/base/ai/rag/rerank/RerankProviderResolverTest.java`

- [ ] **Step 1: 写失败单测**

覆盖：`auto`+siliconflow → `BAAI/bge-reranker-v2-m3`；`auto`+qwen → `qwen3-rerank`；`custom` 无 baseUrl → usable=false。

- [ ] **Step 2: 实现 Resolver**

返回 record：

```java
public record ResolvedRerank(
    boolean usable,
    String provider,
    String model,
    String apiKey,
    String baseUrl,
    String endpointPath
) {}
```

规则摘要：
- `enabled=false` 或 `mode=off` → usable=false
- `provider=auto` → embedding 为 siliconflow 则 siliconflow，否则 qwen
- 通义重排 base 默认：`https://dashscope.aliyuncs.com/compatible-api/v1`（与 chat 的 `compatible-mode` 不同）
- 硅基：`SILICONFLOW_BASE_URL` + `/rerank`
- 凭证顺序对齐 `EmbeddingConfig`

- [ ] **Step 3: 跑测**

```powershell
cd backend
mvn -pl kb-intelligence/kb-intelligence-llm -am test -Dtest=RerankProviderResolverTest
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(rag): resolve rerank provider from embedding auto"
```

---

### Task 3: `ApiRerankService` + 响应解析单测

**Files:**
- Create: `.../rag/rerank/RerankService.java`
- Create: `.../rag/rerank/ApiRerankService.java`
- Create: `.../test/.../ApiRerankServiceTest.java`

- [ ] **Step 1: 接口 `RerankService.rerank(query, candidates, topK)`**

- [ ] **Step 2: 解析单测（不打外网）**

硅基风格 JSON：`results[].index` + `relevance_score` → 重排列表并写 `rerankScore`。

- [ ] **Step 3: 实现 HTTP 客户端**

timeout=`timeoutMs`；documents=content；失败抛异常由上层降级为截断。

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(rag): add HTTP api rerank client"
```

---

### Task 4: 抽出 `LlmRerankService` 并改 `RagRetrievalServiceImpl`

**Files:**
- Create: `.../rag/rerank/LlmRerankService.java`
- Modify: `RagRetrievalServiceImpl.java`

- [ ] **Step 1: 迁移现有 for-loop LLM 到 `LlmRerankService`**

- [ ] **Step 2: `retrieve` 编排**

```text
embed → hybrid → ACL
→ 截断 maxCandidates
→ mode=api + usable → ApiRerank（失败→截断）
→ mode=llm → LlmRerank
→ else → 截断 topK
```

- [ ] **Step 3: L1 — 删除 retrieve 内 `createIndexIfNotExists()`**（写入路径保留）

- [ ] **Step 4: L4 — info 日志 embedMs/hybridMs/rerankMs**

- [ ] **Step 5: 跑相关单测并 Commit**

```bash
git commit -m "feat(rag): wire api rerank and drop per-retrieve createIndex"
```

---

### Task 5: KAG 真并行（L3）

**Files:**
- Modify: `.../kag/retrieval/impl/HybridRetrievalServiceImpl.java`

- [ ] **Step 1: RAG 与 KAG 同时 `supplyAsync`，再分别 get（带 timeout）**

RAG 用 `IntelligenceExecutorNames.RAG`，KAG 用 GRAPH 池。

- [ ] **Step 2: Commit**

```bash
git commit -m "fix(kag): run RAG and KAG retrieval in parallel"
```

---

### Task 6: `import-nacos.ps1` 从 `.env` 展开密钥（用户明确要求）

**Files:**
- Modify: `deploy/scripts/import-nacos.ps1`
- Modify: `deploy/README.md`
- Optional: `deploy/start-services.ps1` 增加 `-ImportNacos`

**背景：** 当前导入把 `${QWEN_API_KEY:}` 原样写入 Nacos；改 `.env` / 重导后常要手填 kb-intelligence、kb-agent。

- [ ] **Step 1: 脚本启动加载 `deploy/.env` 到 Process 环境变量**

无文件则 Yellow warn，不中断。

- [ ] **Step 2: `Expand-SpringPlaceholders` 支持 `${VAR:default}` 与 `${VAR}`**

在 `Publish-Config` 写入前对**全部** template 展开（含 intelligence / agent / 其它 BC）。

- [ ] **Step 3: 脱敏日志**

只打印 `QWEN_API_KEY=set(len=N)|empty` 等，禁止明文。

- [ ] **Step 4: 手工验收**

```powershell
cd deploy
.\scripts\import-nacos.ps1
```

Nacos 中 `kb-intelligence-dev.yaml`、`kb-agent-dev.yaml` 的 `api-key:` 为 `.env` 实值。

- [ ] **Step 5: README 本地重启流程**

```powershell
cd deploy
# 1. 编辑 .env（QWEN_API_KEY / SILICONFLOW_API_KEY 等）
.\scripts\import-nacos.ps1
.\stop-services.ps1 -IncludeFrontend
.\start-services.ps1
# 前端：cd ..\frontend; npm run dev
```

- [ ] **Step 6（可选）: `start-services.ps1 -ImportNacos`**

启动前调用 `import-nacos.ps1`（默认关，避免每次启动刷配置）。

- [ ] **Step 7: Commit**

```bash
git commit -m "feat(deploy): expand API keys from .env when importing Nacos"
```

---

### Task 7: 收尾自检

- [ ] Resolver / ApiRerank 单测通过  
- [ ] retrieve 无每次 createIndex；KAG 并行  
- [ ] import-nacos 后 intelligence/agent 含实 key  
- [ ] 更新 `readme_plan.md`  
- [ ] Spec 状态改为「实现中」或「已完成」  

---

## 执行顺序

`1 → 2 → 3 → 4 → 5 → 6 → 7`  

Task 6 可与 Task 1 并行开工，但合并前必须完成。

## Plan self-review

- Spec：专用 rerank、auto、custom、L1～L4、**Nacos `.env` 展开**均有 Task  
- 无 TBD  
- 通义 `compatible-api` 与 chat `compatible-mode` 已区分注明  
