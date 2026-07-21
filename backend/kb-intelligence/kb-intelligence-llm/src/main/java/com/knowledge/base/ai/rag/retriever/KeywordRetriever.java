package com.knowledge.base.ai.rag.retriever;

import com.knowledge.base.ai.rag.support.HybridSearchFusion;
import com.knowledge.base.ai.vo.Bm25CollapsePageVO;
import com.knowledge.base.ai.vo.RagSearchResultVO;

import java.util.List;

/**
 * 关键词检索器（ES BM25 / Qdrant·Milvus sparse）
 *
 * <p>与存储 CRUD 解耦，供 {@link com.knowledge.base.ai.rag.service.VectorIndexService} 与
 * {@link HybridRetriever} 复用。单库向量库关键词腿为 Hashing BM25-lite sparse，禁止 VARCHAR like。</p>
 */
public interface KeywordRetriever {

    /**
     * 关键词检索，返回融合候选（供 RRF）
     *
     * @param queryText 查询文本
     * @param topK      返回条数
     * @return 候选列表
     */
    List<HybridSearchFusion.FusionCandidate> retrieveCandidates(String queryText, int topK);

    /**
     * 关键词检索，返回 RAG VO
     *
     * @param queryText 查询文本
     * @param topK      返回条数
     * @return 结果列表
     */
    List<RagSearchResultVO> retrieve(String queryText, int topK);

    /**
     * 按 document_id collapse 的关键词分页检索
     *
     * @param queryText       查询文本
     * @param from            偏移
     * @param size            页大小
     * @param innerHitsPerDoc 每文档保留 chunk 数
     * @param categoryIds     分类过滤（可空）
     * @return collapse 分页结果
     */
    Bm25CollapsePageVO retrieveCollapsed(String queryText, int from, int size,
                                         int innerHitsPerDoc, List<Long> categoryIds);
}
