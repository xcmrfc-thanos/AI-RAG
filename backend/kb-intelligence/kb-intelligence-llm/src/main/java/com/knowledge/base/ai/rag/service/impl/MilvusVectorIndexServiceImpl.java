package com.knowledge.base.ai.rag.service.impl;

import com.knowledge.base.ai.config.RagProperties;
import com.knowledge.base.ai.rag.entity.DocumentChunk;
import com.knowledge.base.ai.rag.milvus.MilvusChunkWriter;
import com.knowledge.base.ai.rag.milvus.MilvusCollectionSupport;
import com.knowledge.base.ai.rag.retriever.HybridRetriever;
import com.knowledge.base.ai.rag.retriever.KeywordRetriever;
import com.knowledge.base.ai.rag.service.VectorIndexService;
import com.knowledge.base.ai.vo.Bm25CollapsePageVO;
import com.knowledge.base.ai.vo.RagSearchResultVO;
import io.milvus.client.MilvusServiceClient;
import io.milvus.param.R;
import io.milvus.param.RpcStatus;
import io.milvus.param.collection.DropCollectionParam;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

/**
 * Milvus 向量索引服务实现（milvus-milvus 单库主路径）。
 *
 * <p>索引写入委托 {@link MilvusChunkWriter}（sparse+dense）；检索委托 Keyword/Hybrid Retriever。</p>
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "rag.vector-store", havingValue = "milvus")
public class MilvusVectorIndexServiceImpl implements VectorIndexService {

    private final MilvusServiceClient milvusClient;
    private final RagProperties ragProperties;
    private final KeywordRetriever keywordRetriever;
    private final HybridRetriever hybridRetriever;
    private final MilvusChunkWriter milvusChunkWriter;
    private final MilvusCollectionSupport collectionSupport;

    /** {@inheritDoc} */
    /**
     * indexChunks 方法。
     */
    @Override
    public void indexChunks(List<DocumentChunk> chunks) {
        if (chunks == null || chunks.isEmpty()) {
            return;
        }
        milvusChunkWriter.upsert(chunks);
    }

    /** {@inheritDoc} */
    /**
     * 删除ByDocId。
     */
    @Override
    public void deleteByDocId(Long documentId) {
        milvusChunkWriter.deleteByDocId(documentId);
    }

    /** {@inheritDoc} */
    /**
     * 搜索Bm25Collapsed。
     */
    @Override
    public Bm25CollapsePageVO searchBm25Collapsed(String queryText, int from, int size,
                                                  int innerHitsPerDoc, List<Long> categoryIds) {
        createIndexIfNotExists();
        return keywordRetriever.retrieveCollapsed(queryText, from, size, innerHitsPerDoc, categoryIds);
    }

    /** {@inheritDoc} */
    /**
     * 搜索Bm25。
     */
    @Override
    public List<RagSearchResultVO> searchBm25(String queryText, int topK) {
        if (!StringUtils.hasText(queryText) || topK <= 0) {
            return List.of();
        }
        createIndexIfNotExists();
        return keywordRetriever.retrieve(queryText, topK);
    }

    /** {@inheritDoc} */
    /**
     * 搜索Hybrid。
     */
    @Override
    public List<RagSearchResultVO> searchHybrid(String queryText, float[] queryEmbedding,
                                                int topK, int hybridTopK, int rrfC) {
        createIndexIfNotExists();
        return hybridRetriever.retrieve(queryText, queryEmbedding, topK, hybridTopK, rrfC);
    }

    /** {@inheritDoc} */
    /**
     * indexExists 方法。
     */
    @Override
    public boolean indexExists() {
        return collectionSupport.collectionExists();
    }

    /** {@inheritDoc} */
    /**
     * 创建IndexIfNotExists。
     */
    @Override
    public void createIndexIfNotExists() {
        collectionSupport.ensureCollection(true);
    }

    /** {@inheritDoc} */
    /**
     * dropIndex 方法。
     */
    @Override
    public void dropIndex() {
        if (!indexExists()) {
            return;
        }
        R<RpcStatus> response = milvusClient.dropCollection(DropCollectionParam.newBuilder()
                .withCollectionName(ragProperties.getMilvus().getCollection())
                .build());
        if (response.getStatus() == R.Status.Success.getCode()) {
            log.info("Milvus 集合已删除：collection={}", ragProperties.getMilvus().getCollection());
        } else {
            log.warn("Milvus 集合删除失败：{}", response.getMessage());
        }
    }
}
