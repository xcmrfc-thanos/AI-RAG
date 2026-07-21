# Sparse 兜底算法约定（RAG 引擎白名单）

> 锁定日期：2026-07-21  
> 适用：`qdrant-qdrant` / `milvus-milvus` 关键词腿

## 选型

本迭代采用 **Hashing BM25-lite 词袋稀疏**（`HashingBm25SparseEmbedder`）：

- 不分第二套外网稀疏模型，可离线跑通单库混合。
- 与 ES 真 BM25 **质量不对等**；默认产品形态仍推荐 `es-es`。
- 后续可替换为 BGE-M3 sparse / SPLADE，而不改 Retriever 接口。

## 算法要点

1. **分词**：小写；按非字母数字/非 CJK 切分；连续 CJK 按单字 + 可选 bigram（实现类注明）。
2. **哈希**：`index = floorMod(token.hashCode(), sparseDimension)`，默认 `sparseDimension=30000`。
3. **权重**：同桶累加 TF，再 `log(1+tf)`；可选 L2 归一到单位稀疏向量。
4. **同点写入**：与 dense 同一 chunk id / point；Qdrant 用 named vectors `dense` + `sparse`（或等价）；Milvus 用 sparse 字段 + dense 字段。
5. **查询**：关键词腿只搜 sparse；向量腿只搜 dense；融合仍走 RRF。

## 配置键（可选）

```
rag.sparse.dimension=30000
rag.sparse.enabled=true   # 单库 profile 强制需要
```

## 破坏性

- 从 Milvus like → sparse：**必须重建** Milvus collection。
- 首次启用 `qdrant-qdrant`：**必须**按 named vector schema 重建 Qdrant collection。
