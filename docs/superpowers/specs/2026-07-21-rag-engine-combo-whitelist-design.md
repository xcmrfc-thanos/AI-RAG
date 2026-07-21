# RAG 检索引擎白名单组合 + 产品设置体验 设计

> **日期**：2026-07-21  
> **状态**：待用户确认  
> **前置**：settings-rerank-status-truth 已合入；搜索页精排开关已移除（跟设置热读）

## 1. 目标

1. 用 **关键词腿 × 向量腿** 白名单替代「主库 / 旁路 / `.env`」话术，支持下列 5 种组合。
2. **去掉 Milvus VARCHAR like**；Milvus / Qdrant 单库的关键词腿统一为 **sparse**。
3. 设置页：**单库 / 组合** 预设 + 受限下拉；产品文案不出现 `.env` / Nacos 字样。
4. 存储用量：真接线或明确「未接入计量」，禁止再像故障的「—」无说明。
5. 兼容现有 `rag.vector-store` + `rag.qdrant.enabled`，可映射到新模型并逐步废弃旁路语义。

## 2. 白名单（唯一合法组合）

| ID | 关键词腿 | 向量腿 | 说明 |
|----|----------|--------|------|
| `es-es` | ES BM25 | ES dense | 默认；真 BM25 |
| `es-qdrant` | ES BM25 | Qdrant dense | 现旁路升级为正式组合 |
| `qdrant-qdrant` | Qdrant sparse | Qdrant dense | Qdrant 单库混合 |
| `es-milvus` | ES BM25 | Milvus dense | 双写：BM25 仍 ES |
| `milvus-milvus` | Milvus sparse | Milvus dense | 替换现 like；单库 |

**非法组合**：启动失败或设置保存拒绝（明确错误信息）。

## 3. 非目标

- 不做 3×3 全交叉（如 Milvus sparse × Qdrant dense）。
- 不做设置页自动改写进程环境变量文件；部署密钥仍走集成/部署通道，**界面只写「部署配置」**。
- 不做「关闭 ES 后文档元数据全文」重构（文档列表仍可走现有 ES document 索引，与 chunk 检索组合解耦并在文档中写清）。
- 不在本迭代做稀疏模型效果评测平台（仅需本地冒烟 + 说明需重建索引）。

## 4. 配置模型

### 4.1 新键（设置表 + 可选 Nacos 兜底）

```
rag.retrieval.keyword-engine = elasticsearch | qdrant | milvus
rag.retrieval.dense-engine   = elasticsearch | qdrant | milvus
```

派生只读：`rag.retrieval.profile` = 上表 ID（由两腿推导）。

### 4.2 兼容映射（启动 / 导入）

| 旧配置 | 映射 |
|--------|------|
| `vector-store=elasticsearch` 且 `qdrant.enabled=false` | `es-es` |
| `vector-store=elasticsearch` 且 `qdrant.enabled=true` | `es-qdrant` |
| `vector-store=milvus` | `milvus-milvus`（关键词改为 sparse，**破坏性**：需重建） |
| `vector-store=qdrant`（若曾手写） | `qdrant-qdrant` |

写入设置时同步维护旧键（过渡期），避免半套进程读旧半套读新。

### 4.3 装配原则

- `KeywordRetriever` / `DenseRetriever` / 索引写入按两腿 **独立条件装配**（或显式 `@Primary` 工厂按 profile 选 bean）。
- 组合涉及两套存储时：**双写** dense 目标库；BM25 只写关键词腿对应库。
- `RrfHybridRetriever` 不变：并行 keyword + dense → 融合。

## 5. Sparse 策略（Qdrant / Milvus）

### 5.1 原则

- **禁止**再使用 content VARCHAR `like` 作为 KeywordRetriever。
- Sparse 与 dense **同 collection / 同 chunk 点**（或官方推荐的 named vectors），写入时同时写 sparse + dense。
- 查询：关键词腿只查 sparse；向量腿只查 dense；融合仍用现有 RRF。

### 5.2 稀疏向量来源（本迭代选型）

优先顺序（实现时锁一种，写入 spec 附录）：

1. **推荐**：若当前 Embedding 提供商支持稀疏/多向量（如部分 BGE-M3 管线），复用同一批 chunk 文本生成 sparse。  
2. **兜底**：库内轻量 **BM25 稀疏化**（词表/哈希桶 → Qdrant/Milvus sparse 格式），不依赖外网第二模型——中文效果弱于专业模型，但可去掉 like 且可单库跑通。

设置页注明：「单库 sparse 与 ES BM25 质量不可对等；切换组合后必须重建索引」。

## 6. 设置页 UX

### 6.1 形态

1. **部署形态**下拉（产品语言，**唯一选择入口**，放在「检索/RAG」）：  
   - Elasticsearch（单库，推荐）→ `es-es`  
   - ES + Qdrant（组合）→ `es-qdrant`  
   - Qdrant（单库）→ `qdrant-qdrant`  
   - ES + Milvus（组合）→ `es-milvus`  
   - Milvus（单库）→ `milvus-milvus`
2. 选中后展示只读：「关键词引擎 / 向量引擎」两行说明。
3. 去掉「Qdrant 旁路」独立开关；并入组合项。
4. **AI 设置**中现有「向量库」下拉：删除或改为「请到检索/RAG 配置部署形态」链接；禁止与 RAG Tab 各写一套。
5. **集成**一览「向量库」字段：展示 profile 中文名，不展示原始 `elasticsearch` 单值（易误导）。
6. 文案：**禁止** `.env`、`RAG_*`；改为「连接信息在集成设置 / 部署配置中维护；修改引擎后需重建索引，部分变更需重启服务」。

### 6.2 存储状态卡

- 有计量：显示用量。  
- 无计量：标题旁或副文案 **「未接入对象存储计量」**，值可用「—」，避免像接口失败。

## 7. 删除 / 替换清单

| 删除或替换 | 动作 |
|------------|------|
| `MilvusKeywordRetriever` like 实现 | 删除或改为 sparse 实现 |
| UI「旁路」「RAG_QDRANT_ENABLED」 | 删除 |
| 设置里误导性「主库=可无 ES」 | 删除；组合项写明 ES 仍负责 BM25 |

## 8. 验收

1. 五组合均可启动（依赖对应中间件）；非法组合拒绝。  
2. `es-es` / `es-qdrant` 回归与现网一致（混合检索可用）。  
3. `qdrant-qdrant` / `milvus-milvus` 无 like SQL/过滤；日志可见 sparse 查询。  
4. `es-milvus`：BM25 命中来自 ES，dense 来自 Milvus。  
5. 设置页无 `.env` 字样；存储无计量时有「未接入」说明。  
6. 切换组合并重建索引后对话/搜索可返回结果。

## 9. 风险

- Sparse 质量与中文分词：需在文档标明，默认仍推荐 `es-es`。  
- `milvus-milvus` 从 like→sparse 为破坏性变更。  
- 双写失败策略：延续 Qdrant `fail-open` 思路并统一。

## 10. 与「刚刚需求」对照

| 需求 | 本设计 | 状态 |
|------|--------|------|
| ① 去 `.env` + 设置/进程体验对齐 | §6.1；计划 Task 6 全 Tab 扫文案 | **计划内，未编码** |
| ② 存储计量或「未接入计量」 | §6.2；本迭代默认文案，真接线后续 | **计划内，未编码** |
| 单库/组合清晰 | §6.1 | 计划内 |
| Qdrant 单库 | `qdrant-qdrant` | 计划内 |
| 去掉 like | §5、§7 | 计划内 |
| 白名单五组合 | §2 | 计划内 |
| 搜索重排配置入口 | 系统设置 → **检索/RAG** → 启用重排序 / 重排打分模型（已有代码；计划 Task 6 加强可见性） | **功能已有；入口易找不到** |
| 其它设置 Tab 体验 | 计划 Task 6b 轻量文案对齐（不扩功能） | 计划内 |

### 重排配置路径（给用户）

1. 顶部/头像菜单进入 **系统设置**（`/admin/settings`）  
2. 左侧切到 **「检索/RAG」**（不是「AI设置」）  
3. 见 **启用重排序**，以及下方 **重排打分模型**（模式 / Provider / 模型）  
