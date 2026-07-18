package com.knowledge.base.ai.rag.service.impl;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.knowledge.base.ai.config.RagProperties;
import com.knowledge.base.ai.rag.entity.DocumentChunk;
import com.knowledge.base.ai.rag.retriever.HybridRetriever;
import com.knowledge.base.ai.rag.retriever.KeywordRetriever;
import com.knowledge.base.ai.rag.service.VectorIndexService;
import com.knowledge.base.ai.vo.Bm25CollapsePageVO;
import com.knowledge.base.ai.vo.RagSearchResultVO;
import io.milvus.client.MilvusServiceClient;
import io.milvus.grpc.DataType;
import io.milvus.grpc.MutationResult;
import io.milvus.param.IndexType;
import io.milvus.param.MetricType;
import io.milvus.param.R;
import io.milvus.param.RpcStatus;
import io.milvus.param.collection.*;
import io.milvus.param.dml.DeleteParam;
import io.milvus.param.dml.InsertParam;
import io.milvus.param.index.CreateIndexParam;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Milvus 向量索引服务实现（存储门面）
 *
 * <p>索引 CRUD 留在本类；检索委托 Keyword/Hybrid Retriever。
 * 关键词路径为 like 近似（降级完整度）。</p>
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

    /** {@inheritDoc} */
    @Override
    public void indexChunks(List<DocumentChunk> chunks) {
        if (chunks == null || chunks.isEmpty()) {
            return;
        }
        createIndexIfNotExists();

        List<JsonObject> rows = chunks.stream().map(this::toJsonRow).collect(Collectors.toList());
        InsertParam insertParam = InsertParam.newBuilder()
                .withCollectionName(collectionName())
                .withRows(rows)
                .build();

        R<MutationResult> response = milvusClient.insert(insertParam);
        if (response.getStatus() != R.Status.Success.getCode()) {
            throw new RuntimeException("Milvus 批量索引失败：" + response.getMessage());
        }
        log.info("Milvus 批量索引成功：{} chunks", chunks.size());
    }

    /** {@inheritDoc} */
    @Override
    public void deleteByDocId(Long documentId) {
        if (documentId == null) {
            return;
        }
        DeleteParam deleteParam = DeleteParam.newBuilder()
                .withCollectionName(collectionName())
                .withExpr("document_id == " + documentId)
                .build();
        R<MutationResult> response = milvusClient.delete(deleteParam);
        if (response.getStatus() == R.Status.Success.getCode()) {
            log.info("已从 Milvus 删除文档块：documentId={}", documentId);
        } else {
            log.warn("Milvus 删除文档块失败：documentId={}, message={}", documentId, response.getMessage());
        }
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
        R<Boolean> response = milvusClient.hasCollection(HasCollectionParam.newBuilder()
                .withCollectionName(collectionName())
                .build());
        return response.getStatus() == R.Status.Success.getCode() && Boolean.TRUE.equals(response.getData());
    }

    /** {@inheritDoc} */
    @Override
    public void createIndexIfNotExists() {
        if (indexExists()) {
            loadCollection();
            return;
        }

        int dimension = ragProperties.getEmbedding().getDimension();
        List<FieldType> fields = Arrays.asList(
                FieldType.newBuilder().withName("chunk_id").withDataType(DataType.VarChar).withMaxLength(64).withPrimaryKey(true).build(),
                FieldType.newBuilder().withName("document_id").withDataType(DataType.Int64).build(),
                FieldType.newBuilder().withName("document_title").withDataType(DataType.VarChar).withMaxLength(512).build(),
                FieldType.newBuilder().withName("content").withDataType(DataType.VarChar).withMaxLength(65535).build(),
                FieldType.newBuilder().withName("heading").withDataType(DataType.VarChar).withMaxLength(512).build(),
                FieldType.newBuilder().withName("chunk_index").withDataType(DataType.Int32).build(),
                FieldType.newBuilder().withName("total_chunks").withDataType(DataType.Int32).build(),
                FieldType.newBuilder().withName("category_id").withDataType(DataType.Int64).build(),
                FieldType.newBuilder().withName("author_id").withDataType(DataType.Int64).build(),
                FieldType.newBuilder().withName("team_id").withDataType(DataType.Int64).build(),
                FieldType.newBuilder().withName("doc_status").withDataType(DataType.Int32).build(),
                FieldType.newBuilder().withName("publish_time").withDataType(DataType.VarChar).withMaxLength(64).build(),
                FieldType.newBuilder().withName("embedding").withDataType(DataType.FloatVector).withDimension(dimension).build()
        );

        R<RpcStatus> createResponse = milvusClient.createCollection(CreateCollectionParam.newBuilder()
                .withCollectionName(collectionName())
                .withFieldTypes(fields)
                .build());
        if (createResponse.getStatus() != R.Status.Success.getCode()) {
            throw new RuntimeException("Milvus 创建集合失败：" + createResponse.getMessage());
        }

        R<RpcStatus> indexResponse = milvusClient.createIndex(CreateIndexParam.newBuilder()
                .withCollectionName(collectionName())
                .withFieldName("embedding")
                .withIndexType(IndexType.AUTOINDEX)
                .withMetricType(MetricType.COSINE)
                .build());
        if (indexResponse.getStatus() != R.Status.Success.getCode()) {
            throw new RuntimeException("Milvus 创建向量索引失败：" + indexResponse.getMessage());
        }

        loadCollection();
        log.info("Milvus 集合创建成功：collection={}", collectionName());
    }

    /** {@inheritDoc} */
    @Override
    public void dropIndex() {
        if (!indexExists()) {
            return;
        }
        R<RpcStatus> response = milvusClient.dropCollection(DropCollectionParam.newBuilder()
                .withCollectionName(collectionName())
                .build());
        if (response.getStatus() == R.Status.Success.getCode()) {
            log.info("Milvus 集合已删除：collection={}", collectionName());
        } else {
            log.warn("Milvus 集合删除失败：{}", response.getMessage());
        }
    }

    /**
     * 加载集合到内存
     */
    private void loadCollection() {
        milvusClient.loadCollection(LoadCollectionParam.newBuilder()
                .withCollectionName(collectionName())
                .build());
    }

    private String collectionName() {
        return ragProperties.getMilvus().getCollection();
    }

    /**
     * 构建 Milvus 插入行
     */
    private JsonObject toJsonRow(DocumentChunk chunk) {
        JsonObject row = new JsonObject();
        row.addProperty("chunk_id", chunk.getChunkId());
        row.addProperty("document_id", chunk.getDocumentId());
        row.addProperty("document_title", defaultString(chunk.getDocumentTitle()));
        row.addProperty("content", defaultString(chunk.getContent()));
        row.addProperty("heading", defaultString(chunk.getHeading()));
        row.addProperty("chunk_index", chunk.getChunkIndex() != null ? chunk.getChunkIndex() : 0);
        row.addProperty("total_chunks", chunk.getTotalChunks() != null ? chunk.getTotalChunks() : 0);
        row.addProperty("category_id", chunk.getCategoryId() != null ? chunk.getCategoryId() : 0L);
        row.addProperty("author_id", chunk.getAuthorId() != null ? chunk.getAuthorId() : 0L);
        row.addProperty("team_id", chunk.getTeamId() != null ? chunk.getTeamId() : 0L);
        row.addProperty("doc_status", chunk.getDocStatus() != null ? chunk.getDocStatus() : 0);
        row.addProperty("publish_time", defaultString(chunk.getPublishTime()));

        if (chunk.getEmbedding() != null) {
            JsonArray embedding = new JsonArray();
            for (float value : chunk.getEmbedding()) {
                embedding.add(value);
            }
            row.add("embedding", embedding);
        }
        return row;
    }

    private static String defaultString(String value) {
        return value != null ? value : "";
    }
}
