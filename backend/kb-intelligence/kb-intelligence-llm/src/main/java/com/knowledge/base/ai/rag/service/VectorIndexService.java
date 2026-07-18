package com.knowledge.base.ai.rag.service;

import com.knowledge.base.ai.rag.entity.DocumentChunk;
import com.knowledge.base.ai.vo.Bm25CollapsePageVO;
import com.knowledge.base.ai.vo.RagSearchResultVO;

import java.util.List;

/**
 * 向量索引服务接口（存储门面 + 检索委托入口）
 *
 * <p>写入/删除由实现类直接操作存储；{@code searchBm25*} / {@code searchHybrid} 委托
 * {@code KeywordRetriever} / {@code HybridRetriever}（任务 61）。签名保持不变以兼容
 * Search/RAG/MQ 调用方。实现类由 {@code rag.vector-store} 切换：elasticsearch（默认）| milvus。
 * 另可通过 {@code rag.qdrant.enabled=true} 在 ES 主路径上旁路双写 Qdrant（dense 检索）。</p>
 *
 * @author 苏三
 * @since 1.0.0
 */
public interface VectorIndexService {

    /**
     * 批量索引文档块
     *
     * @param chunks 文档块列表
     */
    void indexChunks(List<DocumentChunk> chunks);

    /**
     * 按文档ID删除所有已索引的块
     *
     * @param documentId 文档ID
     */
    void deleteByDocId(Long documentId);

    /**
     * 混合搜索（BM25 + kNN + RRF融合）
     *
     * @param queryText          查询文本
     * @param queryEmbedding     查询向量
     * @param topK               返回Top-K
     * @param hybridTopK         BM25和kNN各自返回的候选数
     * @param rrfC               RRF常数
     * @return 融合排序后的搜索结果
     */
    List<RagSearchResultVO> searchHybrid(String queryText, float[] queryEmbedding,
                                          int topK, int hybridTopK, int rrfC);

    /**
     * BM25 关键词搜索（仅 chunk 索引，不走向量与重排序）
     *
     * <p>供关键词搜索联动正文检索，支持英文/代码标识符。</p>
     *
     * @param queryText 查询文本
     * @param topK      返回 Top-K chunk
     * @return BM25 命中的 chunk 列表
     */
    List<RagSearchResultVO> searchBm25(String queryText, int topK);

    /**
     * BM25 关键词搜索并按 document_id collapse 分页
     *
     * <p>在 ES 侧按文档聚合，避免拉取大量 chunk 后在内存去重分页。</p>
     *
     * @param queryText        查询文本
     * @param from             偏移量
     * @param size             每页文档数
     * @param innerHitsPerDoc  每个文档保留的 top chunk 数
     * @return collapse 分页结果
     */
    Bm25CollapsePageVO searchBm25Collapsed(String queryText, int from, int size,
                                           int innerHitsPerDoc, List<Long> categoryIds);

    /**
     * 检查kb_chunk索引是否存在
     */
    boolean indexExists();

    /**
     * 创建kb_chunk索引（如果不存在）
     */
    void createIndexIfNotExists();

    /**
     * 删除整个kb_chunk索引
     */
    void dropIndex();
}
