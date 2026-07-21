# 设置页重排展示 / 配置对齐 / 系统状态真数 设计

> **日期**：2026-07-21  
> **状态**：待用户确认  
> **背景**：搜索页写死 `enableRerank=false` 却展示「重排 -」；设置无 rerank mode/provider/model；系统状态文档/用户为写死假数；设置表与 Nacos/`.env` 不同步易误导

## 1. 目标

1. **搜索 UI**：仅当本次请求真正启用重排且返回了 `rerankScore` 时展示「重排」芯片；未开启不显示「重排 -」。
2. **搜索可开重排**：混合搜索的 `enableRerank` 与设置 `rag.rerank.enabled`（或搜索页开关）对齐，不再写死 false。
3. **设置页补齐重排打分配置**：mode / provider / model（及只读说明：与 embedding auto 关系）；写入 `kb_system_config` + Redis；种子 SQL。
4. **诚实标注配置边界**：设置页不假装能改 Nacos/`.env`；标明哪些键热读、哪些仅管理面。
5. **系统状态真数**：文档数、用户数改为 DB `COUNT(*)`；扫描并标注其余占位项（存储/备份/邮件）。

## 2. 非目标

- **不做**设置页 ↔ Nacos / `deploy/.env` 双向自动同步（部署通道与管理面通道分离，保持现状并写清）。
- 不做「向量库选 Qdrant」= 纯 Qdrant 主库（仍为 `rag.qdrant.enabled` 旁路）。
- 不改假备份/假邮件为真实运维（本迭代只标注或隐藏误导数字）。

## 3. 现状缺口

| 项 | 现状 | 问题 |
|----|------|------|
| SearchPage | `enableRerank: false` | 混合搜永远不重排 |
| SearchResultCard | `rerankScore !== undefined` 时展示；`null` 也会显示「-」 | 未开重排仍见「重排 -」 |
| 设置 RAG | 仅有 `ragRerankEnabled` 布尔 | 无 mode/provider/model；与专用 rerank 实现脱节 |
| 设置 → 运行时 | 写入 `kb_system_config`；intelligence 对 TopK 热读；`rag.rerank.*` 多数字段仍读 Nacos/yml | 用户以为设置=全站生效 |
| 配置键 | 设置用 `rag.vector.store`；Boot 用 `rag.vector-store` | 易对不齐 |
| SystemStatus | `documentCount=2847`、`userCount=128`、存储/备份占位 | 与真实 10 篇文档矛盾 |

## 4. 搜索重排行为

### 4.1 请求

- `SearchPage`：`enableRerank` 默认读设置接口中的 `ragRerankEnabled`（或独立「精排」开关，默认跟随设置）。
- 混合模式且 `enableRerank=true` 时：`SearchServiceImpl` → `ragRetrievalService.retrieve(..., true)`。
- 聚合文档结果时 **透传** `item.getRerankScore()` 到 `SearchResultVO` / chunk。

### 4.2 展示

```
if (searchMode === 'hybrid' && enableRerank && Number.isFinite(rerankScore)) {
  显示「重排 {score}」
} else {
  不渲染重排芯片
}
```

BM25 / 向量芯片保持：有值才显示。

## 5. 设置页 RAG 扩展字段

| 表单字段 | config_key | 说明 |
|----------|------------|------|
| ragRerankEnabled | `rag.rerank.enabled` | 已有 |
| ragRerankMode | `rag.rerank.mode` | `api` \| `off` \| `llm` |
| ragRerankProvider | `rag.rerank.provider` | `auto` \| `qwen` \| `siliconflow` \| `custom` |
| ragRerankModel | `rag.rerank.model` | 空=按 provider 默认 |
| ragQdrantEnabled | `rag.qdrant.enabled` | 旁路开关（与「主向量库」区分文案） |

**热读（本迭代）**：`RagRuntimeSettings` 增加 `resolveRerankEnabled()` / `resolveRerankMode()`（至少 enabled+mode）；`RagRetrievalServiceImpl` / `RerankProviderResolver` 优先读缓存。

**Nacos**：模板可增加同名占位默认值；**不**从设置页回写 Nacos。Alert 文案写明：

> 重排 mode/provider 写入系统配置并尽量热读；密钥与 base-url 仍以部署 `.env`→Nacos 为准。不与 Nacos 双向同步。

种子：`init_kb_foundation` / `patch_settings_*` INSERT IGNORE。

## 6. 系统状态真数

`SettingsServiceImpl.getSystemStatus()`：

| 字段 | 改法 |
|------|------|
| documentCount | `SELECT COUNT(*) FROM kb_document WHERE deleted=0`（经 DocumentMapper 或 JDBC） |
| userCount | `SELECT COUNT(*) FROM` 用户表 `WHERE deleted=0`（确认表名，常见 `kb_user` / `sys_user`） |
| totalStorage / usedStorage | 本迭代改为 `null` 或前端显示「—」，去掉假 GB；或标「未接入」 |
| lastBackupTime | 无备份记录则「—」/ null，去掉 `now()-1day` |
| dbStatus | 可保留简单连通探测 |
| clearCache / createBackup / testEmail | 文案标明占位，或隐藏按钮 |

## 7. 假数据扫描清单（实现时勾选）

| 位置 | 现象 | 处理 |
|------|------|------|
| `SettingsServiceImpl.getSystemStatus` | 2847/128/存储/备份 | 真 COUNT / — |
| `SettingsServiceImpl.clearCache/createBackup/testEmail` | 占位成功 | 文案诚实 |
| Settings AI Alert | 已提示 Nacos | 强化重排相关说明 |
| `rag.vector.store` vs `rag.vector-store` | 键不一致 | 文档+兼容别名或统一 |

## 8. 验收

1. 混合搜索 `enableRerank=false`：无「重排」芯片。  
2. `true` 且 api 成功：显示数值重排分。  
3. 设置可改 mode/provider/model 并落库；intelligence 热读 enabled/mode（重启非必须）。  
4. 系统状态文档数 ≈ 真实 `kb_document` 行数；用户数 ≈ 真实用户表。  
5. 设置页明确：不写 Nacos/`.env`。

## 9. 分期

| Phase | 内容 |
|-------|------|
| A | 搜索 UI 隐藏「重排 -」+ 透传 score + enableRerank 跟随设置 |
| B | 设置字段 + 种子 + RagRuntimeSettings 热读 |
| C | SystemStatus 真 COUNT + 去掉/标注其他假数 |
