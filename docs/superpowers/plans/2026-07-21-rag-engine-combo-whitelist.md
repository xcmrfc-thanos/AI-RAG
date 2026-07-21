# RAG 引擎白名单组合 + 设置体验 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development（推荐）或 executing-plans，按 Task 顺序推进。Steps 用 checkbox（`- [ ]`）跟踪。

**Goal:** 落地 5 种合法检索组合（含 Qdrant/Milvus sparse 单库）；去掉 Milvus like；设置页单库/组合产品化；去 `.env` 文案；存储未接入说明。

**Architecture:** `keyword-engine` × `dense-engine` 白名单驱动 KeywordRetriever / DenseRetriever / 双写；旧 `vector-store` + `qdrant.enabled` 映射兼容；UI 只选 profile。

**Tech Stack:** Spring `@Conditional*` / 工厂装配、Qdrant & Milvus sparse API、Settings `kb_system_config`、React SettingsPage

**Spec:** [docs/superpowers/specs/2026-07-21-rag-engine-combo-whitelist-design.md](../specs/2026-07-21-rag-engine-combo-whitelist-design.md)

---

## 文件地图

| 路径 | 职责 |
|------|------|
| `RagProperties` / Nacos template / `.env.example` | 新键 + 兼容旧键 |
| `RetrievalEngineProfile`（新建） | 白名单枚举与校验、旧配置映射 |
| `KeywordRetriever` / `DenseRetriever` 各实现 | 按引擎拆分条件；删 like |
| `*VectorIndexService` / `QdrantChunkWriter` | 单库/双写；sparse+dense 写入 |
| `SparseEmbeddingClient`（新建，可先 BM25-hash 兜底） | 生成 sparse 向量 |
| `SettingsServiceImpl` + 种子 SQL | 新设置字段 |
| `SettingsPage.tsx` | 形态下拉、去旁路/去 `.env`、存储文案 |
| `deploy/README.md` | 组合说明（运维可写环境变量，产品 UI 不写） |

---

### Task 0: 锁定 sparse 兜底算法

**Files:**
- Create: `docs` 附录或代码注释约定
- 可选 PoC：`SparseEmbeddingClient`

- [x] **Step 1:** 选定本迭代 sparse 方案（优先可落地的 BM25-hash / 词袋稀疏；若已有模型能力再升级）
- [x] **Step 2:** 写清维度、归一、与 dense 同点写入约定
- [x] **Step 3:** Commit：`docs(rag): lock sparse fallback for engine whitelist`

---

### Task 1: Profile 模型与白名单校验

**Files:**
- Create: `.../config/RetrievalEngineProfile.java`（enum + parse + validate）
- Modify: `RagProperties.java`
- Test: `RetrievalEngineProfileTest`

- [x] **Step 1:** 枚举五组合；非法抛友好错误
- [x] **Step 2:** `fromLegacy(vectorStore, qdrantEnabled)` 映射
- [x] **Step 3:** 单测全覆盖映射与非法组合
- [x] **Step 4:** Commit：`feat(rag): add retrieval engine profile whitelist`

---

### Task 2: 装配重构（不先上新引擎）

**Files:**
- Modify: ES/Milvus/Qdrant 的 `@Conditional*`
- Create: 可选 `RetrievalEngineConfiguration` 按 profile 暴露 Keyword/Dense

- [x] **Step 1:** `es-es`、`es-qdrant` 行为与现网一致（回归）
- [x] **Step 2:** `milvus-milvus` 暂仍可启动但标记 like 待删（下一 Task 替换）
- [x] **Step 3:** Commit：`refactor(rag): wire retrievers by engine profile`

---

### Task 3: 删除 Milvus like → Milvus sparse

**Files:**
- Replace: `MilvusKeywordRetriever.java`
- Modify: `MilvusVectorIndexServiceImpl` 写入 sparse
- Modify: collection schema（sparse field / named vector）

- [x] **Step 1:** 删除 like 查询路径
- [x] **Step 2:** 写入 + 检索 sparse
- [x] **Step 3:** 单测或集成冒烟（无 like 字符串）
- [x] **Step 4:** Commit：`feat(rag): milvus keyword leg uses sparse, remove like`

---

### Task 4: Qdrant sparse + dense 单库（`qdrant-qdrant`）

**Files:**
- Create: `QdrantKeywordRetriever`（sparse）
- Modify: `QdrantDenseRetriever`、`QdrantChunkWriter` / 新 `QdrantVectorIndexServiceImpl`
- Modify: 条件：profile=`qdrant-qdrant` 时不依赖 ES chunk BM25

- [x] **Step 1:** collection 支持 sparse+dense
- [x] **Step 2:** 写入双通道；Keyword 只 sparse；Dense 只 dense
- [x] **Step 3:** Hybrid 走现有 RRF
- [x] **Step 4:** Commit：`feat(rag): qdrant single-store sparse+dense profile`

---

### Task 5: ES BM25 + Milvus dense（`es-milvus`）

**Files:**
- Modify: ES 索引路径保留 BM25 写入
- Modify: Milvus 仅 dense 写入 + `MilvusDenseRetriever`
- Keyword 固定 ES；Dense 固定 Milvus

- [x] **Step 1:** 双写策略（fail-open 可配置）
- [x] **Step 2:** 条件装配与 profile 校验
- [x] **Step 3:** Commit：`feat(rag): es-bm25 + milvus-dense combo`

---

### Task 6: 设置页产品化（含 ①② + 重排入口可见性）

**Files:**
- Modify: `SettingsServiceImpl` FIELD_TO_CONFIG、`SETTINGS_RAG_FIELDS`
- Modify: `patch_settings_*.sql` / `init_kb_foundation.sql`
- Modify: `SettingsPage.tsx`（全 Tab 文案扫一遍）
- Modify: `types` RagSettings
- Modify: `deploy/README.md`（运维可写 env；标明非产品 UI）

**对应需求：**
- ① 文案去 `.env`/Nacos/环境变量名；进程级项改写为「部署配置 / 可能需重启」；RAG 形态与运行时 profile 对齐体验  
- ② 存储卡：无计量时副文案 **「未接入对象存储计量」**（别像接口坏了）；有计量再显示数字  
- 重排：保留在「检索/RAG」；表单项更醒目（分区标题「搜索/对话精排」）；可选在 AI Tab 加跳转链接到检索 Tab
- **相关下拉必须跟着改（避免双入口）：**
  - **AI 设置**里的「向量库」下拉：删除或改为只读跳转「检索/RAG → 部署形态」；`vectorStoreType` 与 `ragVectorStoreType` **同源**（同一配置键 / 由 profile 派生），禁止两处各选各的
  - **检索/RAG**：用五形态下拉替代「主库 + Qdrant 旁路」
  - **集成**一览里的「向量库」展示：改为显示 profile 名称（如 `ES + Qdrant`）
  - Milvus 主机/端口：仅当形态含 Milvus 时显示（可留在 AI 或检索 Tab 一处）
  - 重建索引文案：写明「切换形态后必须重建」

- [x] **Step 1:** 保存 profile ↔ 两腿字段；旁路开关并入形态下拉；同步映射旧 `rag.vector.store` / `rag.qdrant.enabled`
- [x] **Step 2:** UI 五选项；说明重建索引/可能重启（无 env 名）
- [x] **Step 3:** **合并/对齐 AI∩RAG 向量库下拉**（删重复或单向跳转）
- [x] **Step 4:** **全设置页** Alert/extra 扫除：`.env`、`Nacos`、`RAG_*` → 产品话术
- [x] **Step 5:** 存储 Tab + 系统状态：未接入计量/备份文案；集成页向量库展示改 profile
- [x] **Step 6:** 重排区块文案优化；去掉「密钥在 .env」
- [x] **Step 7:** Commit：`feat(settings): product copy, storage hint, unified retrieval profile UI`
---

### Task 6b: 系统设置其它 Tab 轻量对齐（同迭代）

不扩功能，只体验一致：

- [x] **Step 1:** 基本/安全/通知/导出/合规：占位或「仅管理面」处统一语气
- [x] **Step 2:** 系统状态：假备份/假运维按钮已有「占位」则保持；存储相关与 Task 6 Step 4 一致
- [x] **Step 3:** Commit（可与 Task 6 合并）：`chore(settings): align remaining tabs copy`

---

### Task 7: 文档、冒烟、readme_plan

- [x] **Step 1:** 更新 intelligence Nacos 注释（兼容映射）
- [x] **Step 2:** 本地冒烟：`es-es`、`es-qdrant`；有中间件则点验 `qdrant-qdrant`（本轮以单测 + 编译为准；中间件点验可选）
- [x] **Step 3:** 更新 `readme_plan.md`
- [x] **Step 4:** Commit：`docs(rag): engine whitelist delivery notes`

---

## 执行顺序

`0 → 1 → 2 → 3 → 4 → 5 → 6 → 6b → 7`

## 明确不做

- 全交叉矩阵
- like 保留为降级
- 设置自动写 `.env` 文件
- 本迭代不做对象存储真计量 API（② 默认走「未接入计量」文案；真接线单列后续 Task 若有 S3 stat 再开）

## Plan self-review

- 五组合均有 Task；like 删除有 Task 3  
- ①②、重排入口、全 Tab 文案：Task 6 / 6b  
- 无 TBD 引擎名；sparse 算法在 Task 0 锁定  
