package com.knowledge.base.ai.rag.retriever;

import com.knowledge.base.ai.vo.RagSearchResultVO;

import java.util.List;

/**
 * 混合检索编排（Keyword + Dense + RRF 融合）
 */
public interface HybridRetriever {

    /**
     * 并行执行关键词与稠密检索并做 RRF 融合
     *
     * @param queryText      查询文本
     * @param queryEmbedding 查询向量（可空，空则仅关键词）
     * @param topK           最终返回条数
     * @param hybridTopK     各路候选数
     * @param rrfC           RRF 常数
     * @return 融合后的结果
     */
    List<RagSearchResultVO> retrieve(String queryText, float[] queryEmbedding,
                                     int topK, int hybridTopK, int rrfC);
}
