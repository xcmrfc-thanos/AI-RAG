# 搜索重排展示 + 设置对齐 + 系统状态真数

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 未开重排不显示「重排 -」；设置页补齐重排打分模型配置并热读；系统状态文档/用户改为真实 COUNT；诚实标明与 Nacos/`.env` 不同步。

**Architecture:** 搜索请求带 `enableRerank` → RAG retrieve → VO 透传 `rerankScore`；前端仅 finite 分数渲染芯片。设置写入 `kb_system_config`；`RagRuntimeSettings` 热读 enabled/mode。`getSystemStatus` 查 `kb_document` / `kb_user`。

**Tech Stack:** React、Spring Boot、MyBatis-Plus、SystemConfigCache

**Spec:** [docs/superpowers/specs/2026-07-21-settings-rerank-status-truth-design.md](../specs/2026-07-21-settings-rerank-status-truth-design.md)

---

## 文件地图

| 文件 | 职责 |
|------|------|
| `SearchPage.tsx` / `SearchResultCard.tsx` | enableRerank + 条件展示芯片 |
| `SearchServiceImpl.java` | 透传 rerankScore |
| `SettingsPage.tsx` | RAG 重排 mode/provider/model、Qdrant 旁路文案 |
| `SettingsServiceImpl.java` FIELD_TO_CONFIG + getSystemStatus | 新键 + 真 COUNT |
| `RagRuntimeSettings.java` | 热读 rerank enabled/mode |
| `RerankProviderResolver` / `RagRetrievalServiceImpl` | 优先热读 |
| `patch_settings_*.sql` / `sql/data/init_kb_foundation.sql` | 种子 |
| `kb-intelligence-dev.yaml.template` | 注释默认（不双向同步） |

---

### Task 1: 搜索 UI——无重排不显示芯片

**Files:**
- Modify: `frontend/src/pages/SearchPage.tsx`
- Modify: `frontend/src/components/search/SearchResultCard.tsx`
- Modify: `frontend/src/components/search/search-utils.ts`（可选 helper）

- [x] **Step 1: SearchPage 传入 enableRerank**

从设置拉取或本地 state：混合模式默认 `enableRerank = settings.rag?.ragRerankEnabled ?? false`。  
请求体：`enableRerank: searchMode === 'hybrid' && enableRerank`。

可选：混合模式下增加 Switch「精排」，绑定同一 state。

- [x] **Step 2: SearchResultCard 条件渲染**

Props 增加 `enableRerank?: boolean`。

```tsx
{searchMode === 'hybrid' && enableRerank && Number.isFinite(result.rerankScore) && (
  <span className="score-chip rerank">重排 {formatRawScoreChip(result.rerankScore)}</span>
)}
```

禁止在 `rerankScore == null` 时渲染「重排 -」。

- [x] **Step 3: 手工/单测**

未开重排：DOM 无「重排」；开启且有分：有数值。

- [x] **Step 4: Commit**（与后续 Task 合并一次提交）

---

### Task 2: 后端透传 rerankScore

**Files:**
- Modify: `backend/kb-intelligence/kb-intelligence-retrieval/.../SearchServiceImpl.java`（hybrid 聚合处）

- [x] **Step 1: ChunkResult / SearchResultVO 写入 rerankScore**

在构建 `ChunkResult` 与文档级 VO 时增加：

```java
.rerankScore(item.getRerankScore())
```

- [x] **Step 2: Commit**（合并提交）

---

### Task 3: 设置字段 + 种子 + FIELD_TO_CONFIG

**Files:**
- Modify: `SettingsServiceImpl.java`（FIELD_TO_CONFIG）
- Modify: `SettingsPage.tsx` renderRagTab / types
- Modify: `backend/sql/...` 种子或 patch

- [x] **Step 1: 增加配置键**

```
ragRerankMode     → rag.rerank.mode       default api
ragRerankProvider → rag.rerank.provider   default auto
ragRerankModel    → rag.rerank.model      default ""
ragQdrantEnabled  → rag.qdrant.enabled    default false
```

- [x] **Step 2: Settings UI**

RAG Tab：Select mode / provider；Input model（可空）；Switch「Qdrant 旁路（BM25 仍 ES）」；Alert 写明不写 Nacos/`.env`，密钥走部署通道。

向量库下拉：去掉或禁用会让人以为「纯 Qdrant 主库」的误导项——保留 ES/Milvus 为主；Qdrant 用旁路开关（与设计一致）。

- [x] **Step 3: SQL 种子 INSERT IGNORE**

- [x] **Step 4: Commit**（合并提交）

---

### Task 4: RagRuntimeSettings 热读 + 接线

**Files:**
- Modify: `RagRuntimeSettings.java` (+Test)
- Modify: `RerankProviderResolver.java` 或 `RagRetrievalServiceImpl.java`
- Modify: `RagChatServiceImpl.safeRetrieve` 使用热读 enabled

- [x] **Step 1: resolveRerankEnabled / resolveRerankMode**（缓存优先，yml 兜底）

- [x] **Step 2: retrieve 路径**

`enableRerank && resolveRerankEnabled()` 才进入 api/llm；mode 从热读覆盖 `RagProperties.rerank.mode`。

- [x] **Step 3: 单测 + Commit**（合并提交）

---

### Task 5: 系统状态真 COUNT + 去掉假数

**Files:**
- Modify: `SettingsServiceImpl.getSystemStatus`
- 注入或跨模块：`DocumentMapper` / `UserMapper`（platform 模块依赖允许则注入；否则 JDBC 到同库或 Feign——优先同库 Mapper 已有 `UserMapper.countUsers()`）

- [x] **Step 1: documentCount**（`documentJdbcTemplate` COUNT）

- [x] **Step 2: userCount**（`iamJdbcTemplate` COUNT）

- [x] **Step 3: 存储/备份**

`totalStorage`/`usedStorage`/`lastBackupTime` → null；前端 Settings 状态卡显示「—」或「未接入」。

- [x] **Step 4: 运维按钮文案**

`testEmail` / `createBackup` 返回信息带「占位未实际执行」。

- [x] **Step 5: Commit**（合并提交）

---

### Task 6: 文档与自检

- [x] 更新 Settings Alert、`deploy/README` 一句配置边界  
- [x] 更新 `readme_plan.md`  
- [x] 自检清单：无重排无芯片；开重排有分；状态数≈库表；设置不写 Nacos  

---

## 执行顺序

`1 → 2 → 3 → 4 → 5 → 6`

## 明确不做

- 设置保存自动改 Nacos / `.env`
- `rag.vector-store=qdrant` 纯主库

## Plan self-review

- 搜索展示、设置字段、热读、真 COUNT、假数据扫描均有 Task  
- 无 TBD；表名 `kb_document` / `kb_user` 已锁定  
