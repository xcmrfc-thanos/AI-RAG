package com.knowledge.base.ai.rag.retriever;

import com.knowledge.base.ai.rag.support.HybridSearchFusion;

import java.util.List;

/**
 * 稠密向量检索器（ES kNN / Milvus 向量检索）
 *
 * <p>预留任务 74 扩展：可替换为 Qdrant/Milvus 专用实现而不改 Search/RAG 门面。</p>
 */
public interface DenseRetriever {

    /**
     * 按查询向量检索
     *
     * @param queryEmbedding 查询向量（可空，空则返回空列表）
     * @param topK           返回条数
     * @return 融合候选列表
     */
    List<HybridSearchFusion.FusionCandidate> retrieve(float[] queryEmbedding, int topK);
}
