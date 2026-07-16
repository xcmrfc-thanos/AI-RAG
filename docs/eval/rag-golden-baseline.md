# RAG Golden v0 Baseline

> **日期**：2026-07-16  
> **题集**：[rag-golden-set.json](./rag-golden-set.json)（schemaVersion=1，15 条）  
> **数据版本**：`backend/sql/data/init_kb_document.sql` 样例文档  
> **用途**：任务 61 Retriever 分层前的可重复对照基线

## 配置快照（运行前核对）

| 项 | 约定值 |
|----|--------|
| 检索入口 | Gateway `POST /api/search/` 或 `GET /api/search/search` |
| searchMode | `keyword`（主路径）；可选再跑一轮 `hybrid` |
| topK / size | 5 |
| 默认模型 | `ai.default-model=qwen`（与任务 59 一致） |
| Embedding | Nacos `rag.embedding`（qwen text-embedding-v3 / 1024） |
| 向量库 | `rag.vector-store=elasticsearch` |
| 账号 | admin / admin123（公开样例文档均 `is_public=1`） |

## 指标定义

| 指标 | 定义 |
|------|------|
| Hit@5 | Top5 中是否出现任一 `expectedDocIds`（no_answer / acl 题：Top5 与期望集合无交集或空结果视为通过） |
| MRR | 第一个命中期望文档的排名倒数；未命中为 0；no_answer 题不计入 MRR 平均 |
| citation 非空率 | 命中题中，结果含 summary/chunks/highlights 任一非空的比例 |
| 耗时 | 全量题集墙钟时间（秒） |

## 首次基线结果

> 由 `deploy/scripts/verify-rag-golden.ps1 -WriteBaseline` 在服务就绪后回写。  
> **当前状态**：题集与脚本已入库；下表待联调环境首次跑通后填写。

| 模式 | Hit@5 | MRR | citation非空率 | 耗时(s) | 失败样本 |
|------|-------|-----|----------------|---------|----------|
| keyword | _pending_ | _pending_ | _pending_ | _pending_ | _pending_ |
| hybrid | _pending_ | _pending_ | _pending_ | _pending_ | _pending_ |

### 失败样本模板

```text
id=<case-id> query=... got=[docIds...] expected=[...]
```

## 复跑命令

```powershell
cd deploy\scripts
# 仅校验题集 JSON（无服务）
.\verify-rag-golden.ps1 -OfflineOnly

# 联调跑 keyword 基线并回写本文件指标区
.\verify-rag-golden.ps1 -SearchMode keyword -WriteBaseline

# 对比 hybrid（不覆盖 keyword 行时可手工粘贴）
.\verify-rag-golden.ps1 -SearchMode hybrid
```

## 变更约定

- 任务 61 及之后的检索改动：**同一题集**对比 Hit@5 / MRR，并在 PR/readme_plan 记录差值
- 变更样例文档 ID 时同步更新 `rag-golden-set.json` 的 `datasetRef` 与 `expectedDocIds`
