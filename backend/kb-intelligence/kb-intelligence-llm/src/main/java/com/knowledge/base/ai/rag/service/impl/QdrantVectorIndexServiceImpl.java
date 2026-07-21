package com.knowledge.base.ai.rag.service.impl;

import com.knowledge.base.ai.rag.entity.DocumentChunk;
import com.knowledge.base.ai.rag.qdrant.QdrantChunkWriter;
import com.knowledge.base.ai.rag.retriever.HybridRetriever;
import com.knowledge.base.ai.rag.retriever.KeywordRetriever;
import com.knowledge.base.ai.rag.service.VectorIndexService;
import com.knowledge.base.ai.vo.Bm25CollapsePageVO;
import com.knowledge.base.ai.vo.RagSearchResultVO;
import io.qdrant.client.QdrantClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Qdrant 单库索引门面（{@code qdrant-qdrant}）。
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "rag.vector-store", havingValue = "qdrant")
public class QdrantVectorIndexServiceImpl implements VectorIndexService {

    private final QdrantClient qdrantClient;
    private final QdrantChunkWriter qdrantChunkWriter;
    private final KeywordRetriever keywordRetriever;
    private final HybridRetriever hybridRetriever;
    private final com.knowledge.base.ai.config.RagProperties ragProperties;

    /** {@inheritDoc} */
    @Override
    public void indexChunks(List<DocumentChunk> chunks) {
        qdrantChunkWriter.upsert(chunks);
    }

    /** {@inheritDoc} */
    @Override
    public void deleteByDocId(Long documentId) {
        qdrantChunkWriter.deleteByDocId(documentId);
    }

    /** {@inheritDoc} */
    @Override
    public Bm25CollapsePageVO searchBm25Collapsed(String queryText, int from, int size,
                                                  int innerHitsPerDoc, List<Long> categoryIds) {
        createIndexIfNotExists();
        return keywordRetriever.retrieveCollapsed(queryText, from, size, innerHitsPerDoc, categoryIds);
    }

    /** {@inheritDoc} */
    @Override
    public List<RagSearchResultVO> searchBm25(String queryText, int topK) {
        if (!StringUtils.hasText(queryText) || topK <= 0) {
            return List.of();
        }
        createIndexIfNotExists();
        return keywordRetriever.retrieve(queryText, topK);
    }

    /** {@inheritDoc} */
    @Override
    public List<RagSearchResultVO> searchHybrid(String queryText, float[] queryEmbedding,
                                                int topK, int hybridTopK, int rrfC) {
        createIndexIfNotExists();
        return hybridRetriever.retrieve(queryText, queryEmbedding, topK, hybridTopK, rrfC);
    }

    /** {@inheritDoc} */
    @Override
    public boolean indexExists() {
        try {
            Boolean exists = qdrantClient.collectionExistsAsync(ragProperties.getQdrant().getCollection())
                    .get(ragProperties.getQdrant().getConnectTimeoutMs(), TimeUnit.MILLISECONDS);
            return Boolean.TRUE.equals(exists);
        } catch (Exception e) {
            log.warn("检查 Qdrant 集合失败：{}", e.getMessage());
            return false;
        }
    }

    /** {@inheritDoc} */
    @Override
    public void createIndexIfNotExists() {
        qdrantChunkWriter.ensureCollection();
    }

    /** {@inheritDoc} */
    @Override
    public void dropIndex() {
        if (!indexExists()) {
            return;
        }
        try {
            qdrantClient.deleteCollectionAsync(ragProperties.getQdrant().getCollection())
                    .get(ragProperties.getQdrant().getConnectTimeoutMs(), TimeUnit.MILLISECONDS);
            log.info("Qdrant 集合已删除：{}", ragProperties.getQdrant().getCollection());
        } catch (Exception e) {
            log.warn("Qdrant 集合删除失败：{}", e.getMessage());
        }
    }
}
