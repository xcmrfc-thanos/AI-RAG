package com.knowledge.base.ai.rag.service.impl;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch.core.BulkRequest;
import co.elastic.clients.elasticsearch.core.BulkResponse;
import co.elastic.clients.elasticsearch.core.DeleteByQueryRequest;
import co.elastic.clients.elasticsearch.indices.CreateIndexRequest;
import co.elastic.clients.elasticsearch.indices.DeleteIndexRequest;
import co.elastic.clients.elasticsearch.indices.ExistsRequest;
import com.knowledge.base.ai.config.RagProperties;
import com.knowledge.base.ai.rag.entity.DocumentChunk;
import com.knowledge.base.ai.rag.milvus.MilvusChunkWriter;
import com.knowledge.base.ai.rag.qdrant.QdrantChunkWriter;
import com.knowledge.base.ai.rag.retriever.HybridRetriever;
import com.knowledge.base.ai.rag.retriever.KeywordRetriever;
import com.knowledge.base.ai.rag.service.VectorIndexService;
import com.knowledge.base.ai.vo.Bm25CollapsePageVO;
import com.knowledge.base.ai.vo.RagSearchResultVO;
import com.knowledge.base.common.config.IntelligenceIndexingProperties;
import com.knowledge.base.common.elasticsearch.ElasticsearchIndexDefinitionLoader;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Elasticsearch 向量索引服务实现（存储门面）
 *
 * <p>索引 CRUD 留在本类；关键词 / 稠密 / 混合检索委托
 * {@link KeywordRetriever} 与 {@link HybridRetriever}（任务 61 分层）。
 * {@code es-qdrant} 旁路双写 Qdrant；{@code es-milvus} 旁路双写 Milvus dense。</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "rag.vector-store", havingValue = "elasticsearch", matchIfMissing = true)
public class ElasticsearchVectorIndexServiceImpl implements VectorIndexService {

    private final ElasticsearchClient esClient;
    private final RagProperties ragProperties;
    private final IntelligenceIndexingProperties indexingProperties;
    private final KeywordRetriever keywordRetriever;
    private final HybridRetriever hybridRetriever;
    private final ObjectProvider<QdrantChunkWriter> qdrantChunkWriter;
    private final ObjectProvider<MilvusChunkWriter> milvusChunkWriter;

    /** {@inheritDoc} */
    /**
     * indexChunks 方法。
     */
    @Override
    public void indexChunks(List<DocumentChunk> chunks) {
        if (chunks == null || chunks.isEmpty()) {
            return;
        }

        createIndexIfNotExists();

        BulkRequest.Builder bulkBuilder = new BulkRequest.Builder();
        for (DocumentChunk chunk : chunks) {
            Map<String, Object> docMap = buildDocMap(chunk);
            bulkBuilder.operations(op -> op
                    .index(idx -> idx
                            .index(chunkIndexName())
                            .id(chunk.getChunkId())
                            .document(docMap)));
        }

        try {
            BulkResponse response = esClient.bulk(bulkBuilder.build());
            if (response.errors()) {
                List<String> failedIds = response.items().stream()
                        .filter(item -> item.error() != null)
                        .map(item -> item.id() + ": " + item.error().reason())
                        .collect(Collectors.toList());
                log.error("ES批量索引部分失败：{}", String.join(", ", failedIds));
            } else {
                log.info("ES批量索引成功：{} chunks", chunks.size());
                dualWriteSecondary(chunks);
            }
        } catch (Exception e) {
            log.error("ES批量索引失败：{}", e.getMessage(), e);
            throw new RuntimeException("ES批量索引失败：" + e.getMessage(), e);
        }
    }

    /** {@inheritDoc} */
    /**
     * 删除ByDocId。
     */
    @Override
    public void deleteByDocId(Long documentId) {
        try {
            DeleteByQueryRequest request = DeleteByQueryRequest.of(d -> d
                    .index(chunkIndexName())
                    .query(q -> q.term(t -> t.field("document_id").value(documentId))));
            esClient.deleteByQuery(request);
            log.info("已从ES删除文档块：documentId={}", documentId);
            QdrantChunkWriter qWriter = qdrantChunkWriter.getIfAvailable();
            if (qWriter != null) {
                qWriter.deleteByDocId(documentId);
            }
            MilvusChunkWriter mWriter = milvusChunkWriter.getIfAvailable();
            if (mWriter != null) {
                mWriter.deleteByDocId(documentId);
            }
        } catch (Exception e) {
            log.error("ES删除文档块失败：documentId={}, error={}", documentId, e.getMessage());
        }
    }

    /**
     * ES 写入成功后双写 Qdrant / Milvus（未装配时跳过）。
     *
     * @param chunks 分块列表
     */
    private void dualWriteSecondary(List<DocumentChunk> chunks) {
        QdrantChunkWriter qWriter = qdrantChunkWriter.getIfAvailable();
        if (qWriter != null) {
            qWriter.upsert(chunks);
        }
        MilvusChunkWriter mWriter = milvusChunkWriter.getIfAvailable();
        if (mWriter != null) {
            mWriter.upsert(chunks);
        }
    }

    /** {@inheritDoc} */
    /**
     * 搜索Bm25Collapsed。
     */
    @Override
    public Bm25CollapsePageVO searchBm25Collapsed(String queryText, int from, int size,
                                                  int innerHitsPerDoc, List<Long> categoryIds) {
        if (!StringUtils.hasText(queryText) || size <= 0) {
            return Bm25CollapsePageVO.builder().total(0L).documents(List.of()).build();
        }
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
        try {
            return esClient.indices().exists(ExistsRequest.of(e -> e.index(chunkIndexName()))).value();
        } catch (Exception e) {
            return false;
        }
    }

    /** {@inheritDoc} */
    /**
     * 创建IndexIfNotExists。
     */
    @Override
    public void createIndexIfNotExists() {
        try {
            if (indexExists()) {
                ensurePublishTimeMapping();
                return;
            }
            String indexBody = ElasticsearchIndexDefinitionLoader.loadChunkIndexBody(
                    ragProperties.getEmbedding().getDimension(),
                    indexingProperties.isUseIkAnalyzer());
            CreateIndexRequest request = CreateIndexRequest.of(c -> c
                    .index(chunkIndexName())
                    .withJson(ElasticsearchIndexDefinitionLoader.toReader(indexBody)));
            esClient.indices().create(request);
            log.info("ES索引创建成功：index={}", chunkIndexName());
        } catch (Exception e) {
            if (e.getMessage() != null && e.getMessage().contains("resource_already_exists_exception")) {
                log.info("ES索引已存在，跳过创建：index={}", chunkIndexName());
                return;
            }
            log.error("ES索引创建失败：{}", e.getMessage(), e);
        }
    }

    /**
     * 确保 publish_time 字段映射存在（兼容旧索引升级）
     */
    private void ensurePublishTimeMapping() {
        try {
            esClient.indices().putMapping(m -> m
                    .index(chunkIndexName())
                    .properties("publish_time", p -> p.date(d -> d)));
            log.debug("publish_time 字段映射已更新");
        } catch (Exception e) {
            log.debug("更新 publish_time 映射：{}", e.getMessage());
        }
    }

    /** {@inheritDoc} */
    /**
     * dropIndex 方法。
     */
    @Override
    public void dropIndex() {
        try {
            esClient.indices().delete(DeleteIndexRequest.of(d -> d.index(chunkIndexName())));
            log.info("ES索引已删除：index={}", chunkIndexName());
        } catch (Exception e) {
            log.warn("ES索引删除失败：{}", e.getMessage());
        }
    }

    /**
     * 构建 ES bulk 文档字段
     */
    private Map<String, Object> buildDocMap(DocumentChunk chunk) {
        Map<String, Object> doc = new LinkedHashMap<>();
        doc.put("chunk_id", chunk.getChunkId());
        doc.put("document_id", chunk.getDocumentId());
        doc.put("document_title", chunk.getDocumentTitle());
        doc.put("content", chunk.getContent());
        doc.put("heading", chunk.getHeading());
        doc.put("chunk_index", chunk.getChunkIndex());
        doc.put("total_chunks", chunk.getTotalChunks());
        doc.put("category_id", chunk.getCategoryId());
        doc.put("author_id", chunk.getAuthorId());
        doc.put("team_id", chunk.getTeamId());
        doc.put("is_public", Boolean.TRUE.equals(chunk.getIsPublic()));
        doc.put("doc_status", chunk.getDocStatus());
        doc.put("publish_time", chunk.getPublishTime());
        doc.put("indexed_at", LocalDateTime.now().toString());
        if (chunk.getEmbedding() != null) {
            doc.put("embedding", chunk.getEmbedding());
        }
        return doc;
    }

    /**
     * 获取分块向量 ES 索引名
     */
    private String chunkIndexName() {
        return indexingProperties.getChunkIndex();
    }
}
