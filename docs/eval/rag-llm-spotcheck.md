# 真实 LLM 质量抽验清单（v0）

> **目的**：Stub 关闭后，对人做 citations / 幻觉 / 拒答的业务门验收。  
> **题集**：[rag-llm-spotcheck-set.json](./rag-llm-spotcheck-set.json)  
> **脚本**：`deploy/scripts/verify-rag-llm-spotcheck.ps1`（半自动结构检查 + 导出人工判定表）

## 前置条件

| 项 | 要求 |
|----|------|
| `AI_DEV_STUB` | `false`（或未设） |
| `QWEN_API_KEY` | 已配置且网关可达真实模型 |
| 索引 | seed 文档已入 ES（与 Golden 同源） |
| 账号 | `admin` / `admin123` |

```powershell
cd deploy\scripts
.\verify-rag-llm-spotcheck.ps1
# 仅校验题集 JSON：
.\verify-rag-llm-spotcheck.ps1 -OfflineOnly
# 写出人工判定 CSV：
.\verify-rag-llm-spotcheck.ps1 -WriteJudgementSheet
```

## 半自动门（脚本）

| 检查 | 通过条件 |
|------|----------|
| citations | `requireCitation=true` 时 `citations` 非空，且 documentId 落在 `expectedDocIds` |
| fromKnowledgeBase | 与 `expectFromKb` 一致 |
| 拒答结构 | `expectRefuse=true` 时：无引用 **或** 正文含拒答语义词；且 `fromKnowledgeBase=false` 优先 |
| 禁语 | `forbidPhrases` 不得出现在回答中 |

## 人肉判定（业务门，必做）

对脚本导出的每行（或前端 RAG 对话复现）勾选：

| 题 id | 引用是否对题 | 有无幻觉（编造库外事实） | 拒答是否得体 | 结论 Pass/Fail | 备注 |
|-------|--------------|--------------------------|--------------|----------------|------|
| cite-spring-boot | | | n/a | | |
| cite-mysql-index | | | n/a | | |
| cite-k8s-deploy | | | n/a | | |
| refuse-quantum | | | | | |
| refuse-mars | | | | | |
| hallucination-probe | | | n/a | | |

**通过标准（建议）**：6 题中结构门全过；人肉至少 **5/6 Pass**，且拒答题不得「一本正经编造 + 假引用」。

## 与 Search Golden 的关系

| 层 | 脚本 | 覆盖 |
|----|------|------|
| 检索 | `verify-rag-golden.ps1` | Hit@5 / MRR |
| 生成 | 本清单 + `verify-rag-llm-spotcheck.ps1` | 引用落地、拒答、幻觉 |

检索过关 ≠ 对话可用；本抽验是「系统能不能当真用」的最后一道业务门。
