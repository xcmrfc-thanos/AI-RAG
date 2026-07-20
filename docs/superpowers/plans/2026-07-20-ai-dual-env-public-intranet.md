# AI 双环境（公网 / 内网）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用一套配置矩阵支持「公网：DashScope/DeepSeek 对话 + DashScope 或 SiliconFlow 向量」与「内网：Ollama qwen2.5 + bge-m3」，中间件不变；向量维度保持 1024。

**Architecture:** 对话继续走 `ModelProvider`（`qwen.*` / `deepseek.*`）。向量从「绑死 qwen.base-url」改为独立 `rag.embedding.api-key` / `base-url` / `model`（缺省回退 qwen，兼容现状）。环境用 `AI_PROFILE=public|intranet` + `.env` / Nacos 模板切换，**不改业务代码分支**。换 embedding 模型必须重建索引（文档声明）。

**Tech Stack:** Java 21 / Spring Boot 3、LangChain4j OpenAiEmbeddingModel、Nacos yaml template、deploy/.env

**非目标（本计划不做）：** Oracle/MySQL/PG 三库兼容、信创替换、自建 TEI 镜像、前端模型选择器大改。

---

## 旁注：DB 三库兼容怎么开分支？

**推荐：单独开一个分支 `feat/db-multi-dialect`，不要按库拆三个分支。**

| 方式 | 结论 |
|------|------|
| 一个分支做兼容 | ✅ 方言/驱动/SQL/schema 强耦合，应同 PR 演进 |
| mysql / oracle / pg 三个分支 | ❌ 合并冲突大、无法共享抽象层，浪费 |

本计划**仅 AI 双环境**，在当前 `master`（或继续当前检出分支）推进。DB 兼容另开里程碑。

---

## 目标配置矩阵

| 项 | 公网 `public` | 内网 `intranet` |
|----|---------------|-----------------|
| 对话默认 | `qwen3-max`（DashScope） | `qwen2.5:7b` 或 `14b`（Ollama） |
| 对话备选 | DeepSeek（有 Key 则注册） | 通常留空（不注册 deepseek） |
| 向量 | 默认 `text-embedding-v3`；可选硅基 `BAAI/bge-m3` | `BAAI/bge-m3`（Ollama 或本地 OpenAI 兼容服务） |
| 向量维度 | **1024** | **1024** |
| `AI_DEV_STUB` | false（生产） | false |
| Rerank | 可开（走对话 LLM） | 建议关（省调用） |
| KAG | 可开 | 可选关 |

**关键约束：** 公网 `text-embedding-v3` 与硅基/本地 `bge-m3` **不可混用同一套 ES/Qdrant 向量**；切换后必须重建索引。

---

## 文件与职责

| 路径 | 职责 |
|------|------|
| `backend/.../RagProperties.Embedding` | 增加 `apiKey`、`baseUrl`（可选，回退 qwen） |
| `backend/.../EmbeddingConfig.java` | 用 embedding 独立 endpoint 建 Bean |
| `backend/.../application.yml`（llm 模块） | 暴露 `rag.embedding.api-key/base-url` |
| `backend/nacos/kb-intelligence-dev.yaml.template` | 同上 + rerank 开关环境变量 |
| `backend/nacos/kb-agent-dev.yaml.template` | 对话模型名已可 env 覆盖；补注释 |
| `deploy/env.example` | AI_PROFILE + 公网/内网示例块 |
| `deploy/profiles/public.env.example` | 公网示例（可选独立文件） |
| `deploy/profiles/intranet.env.example` | 内网示例 |
| `readme.md` / `docs/README.md` | 双环境说明一行索引 |
| 单测 | EmbeddingConfig 属性解析 / 回退逻辑（Mockito 或纯属性测试） |

---

### Task 1: RagProperties 扩展 embedding 独立 endpoint

**Files:**
- Modify: `backend/kb-intelligence/kb-intelligence-llm/src/main/java/com/knowledge/base/ai/config/RagProperties.java`
- Test: `backend/kb-intelligence/kb-intelligence-llm/src/test/java/com/knowledge/base/ai/config/RagEmbeddingPropertiesTest.java`（可选 Spring 绑定测试；无 Spring 则测默认值）

- [x] **Step 1: Embedding 内部类增加字段**

```java
/** 嵌入 API Key；空则回退 qwen.api-key */
private String apiKey = "";
/** 嵌入 OpenAI 兼容 base-url；空则回退 qwen.base-url */
private String baseUrl = "";
/** 提供商标签：qwen | siliconflow | ollama | local */
private String provider = "qwen";
```

保留现有 `model` / `dimension=1024`。

- [x] **Step 2: 函数级 JavaDoc** 说明回退规则与「换模型须重建索引」。

- [x] **Step 3: Commit**

```bash
git commit -m "feat(rag): Embedding 支持独立 api-key/base-url"
```

---

### Task 2: EmbeddingConfig 使用独立 endpoint（兼容回退）

**Files:**
- Modify: `backend/kb-intelligence/kb-intelligence-llm/src/main/java/com/knowledge/base/ai/config/EmbeddingConfig.java`
- Test: `.../EmbeddingConfigEndpointTest.java`（可测 resolve 方法；若把 resolve 抽成 package 可见静态/组件更好测）

- [x] **Step 1: 注入 RagProperties + 保留 qwen 回退**

逻辑：

```text
apiKey = firstNonBlank(rag.embedding.apiKey, qwen.api-key)
baseUrl = firstNonBlank(rag.embedding.baseUrl, qwen.base-url)
model   = rag.embedding.model
```

Bean 创建条件：`rag.enabled=true` 且 **resolved apiKey 非空**（不要只判断 qwen.api-key，否则硅基独立 Key 无法启动）。

- [x] **Step 2: 日志打印 provider/model/baseUrl（Key 脱敏）**

- [x] **Step 3: 单测** resolved 回退与独立配置优先。

- [x] **Step 4: Commit**

```bash
git commit -m "feat(rag): EmbeddingConfig 支持硅基/Ollama 独立 endpoint"
```

---

### Task 3: Nacos + 模块 yml 暴露环境变量

**Files:**
- Modify: `backend/nacos/kb-intelligence-dev.yaml.template`
- Modify: `backend/kb-intelligence/kb-intelligence-llm/src/main/resources/application.yml`
- Modify: `backend/nacos/kb-agent-dev.yaml.template`（注释 + QWEN_MODEL 已有则确认）

- [x] **Step 1: intelligence 模板**

```yaml
rag:
  embedding:
    model: ${RAG_EMBEDDING_MODEL:text-embedding-v3}
    dimension: ${RAG_EMBEDDING_DIMENSION:1024}
    provider: ${RAG_EMBEDDING_PROVIDER:qwen}
    api-key: ${RAG_EMBEDDING_API_KEY:}
    base-url: ${RAG_EMBEDDING_BASE_URL:}
  rerank:
    enabled: ${RAG_RERANK_ENABLED:true}
```

对话保持：

```yaml
qwen:
  api-key: ${QWEN_API_KEY:}
  base-url: ${QWEN_BASE_URL:https://dashscope.aliyuncs.com/compatible-mode/v1}
  chat.options.model: ${QWEN_MODEL:qwen3-max}
```

- [x] **Step 2: 模块 application.yml 同步同键（启动兜底）**

- [x] **Step 3: Commit**

```bash
git commit -m "chore(nacos): 暴露 embedding 独立 endpoint 与 rerank 开关"
```

---

### Task 4: deploy 环境样例（公网 / 内网）

**Files:**
- Modify: `deploy/env.example`
- Create: `deploy/profiles/public.env.example`
- Create: `deploy/profiles/intranet.env.example`

- [x] **Step 1: env.example 增加**

```env
# public | intranet（文档约定；实际靠下方变量生效）
AI_PROFILE=public
AI_DEV_STUB=true

QWEN_API_KEY=
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen3-max
DEEPSEEK_API_KEY=

# 向量：空 api-key/base-url 时回退 QWEN_*
RAG_EMBEDDING_PROVIDER=qwen
RAG_EMBEDDING_MODEL=text-embedding-v3
RAG_EMBEDDING_DIMENSION=1024
RAG_EMBEDDING_API_KEY=
RAG_EMBEDDING_BASE_URL=
RAG_RERANK_ENABLED=true
```

- [x] **Step 2: public.env.example**

对话 DashScope + DeepSeek；向量二选一注释块：

```env
# A) 通义向量（默认）
RAG_EMBEDDING_MODEL=text-embedding-v3
# B) 硅基 bge-m3（与 A 不可混索引）
# RAG_EMBEDDING_PROVIDER=siliconflow
# RAG_EMBEDDING_MODEL=BAAI/bge-m3
# RAG_EMBEDDING_BASE_URL=https://api.siliconflow.cn/v1
# RAG_EMBEDDING_API_KEY=sk-xxx
```

- [x] **Step 3: intranet.env.example**

```env
AI_PROFILE=intranet
AI_DEV_STUB=false
QWEN_API_KEY=ollama
QWEN_BASE_URL=http://127.0.0.1:11434/v1
QWEN_MODEL=qwen2.5:7b
DEEPSEEK_API_KEY=
RAG_EMBEDDING_PROVIDER=ollama
RAG_EMBEDDING_MODEL=bge-m3
RAG_EMBEDDING_BASE_URL=http://127.0.0.1:11434/v1
RAG_EMBEDDING_API_KEY=ollama
RAG_RERANK_ENABLED=false
KAG_ENABLED=false
```

注明：Ollama 需已 `pull qwen2.5:7b` 与可用的 embedding 模型名（以本机 `ollama list` 为准；若 embedding 走 TEI 则改 BASE_URL）。

- [x] **Step 4: Commit**

```bash
git commit -m "docs(deploy): 公网/内网 AI Profile 环境样例"
```

---

### Task 5: 文档与索引

**Files:**
- Modify: `readme.md`
- Modify: `docs/README.md`
- Create: `docs/superpowers/specs/2026-07-20-ai-dual-env-design.md`（短设计：矩阵 + 回退规则 + 重建索引）

- [x] **Step 1: readme 增加「AI 双环境」小节**（公网/内网表 + 切换步骤：改 `.env` → import-nacos → 重启 intelligence/agent → 换向量须 rebuild）

- [x] **Step 2: docs/README 一行索引**

- [x] **Step 3: 短设计 spec 落盘**

- [x] **Step 4: Commit**

```bash
git commit -m "docs: AI 公网/内网双环境说明与设计"
```

---

### Task 6: 自检与收口

- [x] **Step 1: 编译**

```powershell
$env:JAVA_HOME='D:\Users\environments\Java21'
cd backend
mvn -pl kb-intelligence/kb-intelligence-llm -am test -Dtest=EmbeddingConfigEndpointTest,RagEmbeddingPropertiesTest -DfailIfNoTests=false
```

- [x] **Step 2: grep 确认** EmbeddingConfig 不再强制只认 `qwen.api-key` 作为唯一条件（resolved key）

- [x] **Step 3: 更新本地 `readme_plan.md`（不入库）记一条

- [x] **Step 4: 全量 status，无密钥入仓，push（若用户要求）

---

## 实施顺序

```
Task1 RagProperties
  → Task2 EmbeddingConfig
  → Task3 Nacos/yml
  → Task4 deploy profiles
  → Task5 docs
  → Task6 自检提交
```

## 验收清单

- [ ] 不配 `RAG_EMBEDDING_*` 时行为与现状一致（回退 QWEN_* + text-embedding-v3）
- [ ] 仅配硅基 embedding Key/URL + `BAAI/bge-m3` 时可创建 EmbeddingModel（对话仍可用 DashScope）
- [ ] 内网样例：Ollama base-url + qwen2.5:7b + bge-m3 文档齐全
- [ ] 维度默认 1024；文档写明换模型重建索引
- [ ] 中间件栈无强制变更

## 风险

| 风险 | 对策 |
|------|------|
| 硅基与通义向量混用 | 文档警告 + 切换后强制 rebuild |
| Ollama embedding 模型名不一致 | intranet 样例注明以 `ollama list` 为准 |
| Bean 条件过严导致硅基独立 Key 无效 | Task2 用 resolved apiKey |
| Agent 仍读旧 base-url | kb-agent 已用 QWEN_BASE_URL，与对话对齐即可 |
