package com.knowledge.base.ai.rag.service.impl;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.knowledge.base.ai.config.RagProperties;
import com.knowledge.base.ai.rag.entity.DocumentChunk;
import com.knowledge.base.ai.rag.service.VectorIndexService;
import com.knowledge.base.ai.rag.support.HybridSearchFusion;
import com.knowledge.base.ai.vo.RagSearchResultVO;
import io.milvus.client.MilvusServiceClient;
import io.milvus.grpc.DataType;
import io.milvus.grpc.MutationResult;
import io.milvus.grpc.SearchResults;
import io.milvus.param.IndexType;
import io.milvus.param.MetricType;
import io.milvus.param.R;
import io.milvus.param.RpcStatus;
import io.milvus.param.collection.*;
import io.milvus.param.dml.DeleteParam;
import io.milvus.param.dml.InsertParam;
import io.milvus.param.dml.QueryParam;
import io.milvus.param.dml.SearchParam;
import io.milvus.param.index.CreateIndexParam;
import io.milvus.response.QueryResultsWrapper;
import io.milvus.response.SearchResultsWrapper;
import jakarta.annotation.Resource;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

/**
 * Milvus 向量索引服务实现
 *
 * <p>实现 {@link VectorIndexService}，使用 Milvus 存储文档块向量并支持混合检索。</p>
 *
 * @author knowledge-base-team
 * @since 1.0.0
 */
@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "rag.vector-store", havingValue = "milvus")
public class MilvusVectorIndexServiceImpl implements VectorIndexService {

    private final MilvusServiceClient milvusClient;
    private final RagProperties ragProperties;

    @Resource
    private ThreadPoolTaskExecutor asyncTaskExecutor;

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
    public List<RagSearchResultVO> searchHybrid(String queryText, float[] queryEmbedding,
                                                int topK, int hybridTopK, int rrfC) {
        CompletableFuture<List<HybridSearchFusion.FusionCandidate>> bm25Future = CompletableFuture.supplyAsync(() ->
                keywordSearch(queryText, hybridTopK), asyncTaskExecutor);

        CompletableFuture<List<HybridSearchFusion.FusionCandidate>> knnFuture;
        if (queryEmbedding != null) {
            knnFuture = CompletableFuture.supplyAsync(() ->
                    vectorSearch(queryEmbedding, hybridTopK), asyncTaskExecutor);
        } else {
            knnFuture = CompletableFuture.completedFuture(List.of());
        }

        try {
            return HybridSearchFusion.fuseAndConvert(
                    bm25Future.get(30, TimeUnit.SECONDS),
                    knnFuture.get(30, TimeUnit.SECONDS),
                    topK,
                    rrfC
            );
        } catch (Exception e) {
            log.error("Milvus 混合搜索失败：{}", e.getMessage());
            return HybridSearchFusion.fuseAndConvert(
                    bm25Future.getNow(List.of()),
                    knnFuture.getNow(List.of()),
                    topK,
                    rrfC
            );
        }
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
     * 关键词检索（Milvus VARCHAR like 表达式，作为 BM25 近似）
     */
    private List<HybridSearchFusion.FusionCandidate> keywordSearch(String queryText, int topK) {
        if (!StringUtils.hasText(queryText)) {
            return List.of();
        }
        loadCollection();
        String keyword = escapeExprValue(queryText.trim());
        String expr = String.format("content like \"%%%s%%\" || document_title like \"%%%s%%\"", keyword, keyword);

        QueryParam queryParam = QueryParam.newBuilder()
                .withCollectionName(collectionName())
                .withExpr(expr)
                .withOutFields(Arrays.asList("chunk_id", "document_id", "document_title", "content", "heading", "publish_time"))
                .withLimit((long) topK)
                .build();

        R<io.milvus.grpc.QueryResults> response = milvusClient.query(queryParam);
        if (response.getStatus() != R.Status.Success.getCode() || response.getData() == null) {
            log.warn("Milvus 关键词检索失败：{}", response.getMessage());
            return List.of();
        }

        QueryResultsWrapper wrapper = new QueryResultsWrapper(response.getData());
        List<HybridSearchFusion.FusionCandidate> results = new ArrayList<>();
        for (QueryResultsWrapper.RowRecord record : wrapper.getRowRecords()) {
            results.add(toCandidate(record, 1.0));
        }
        return results;
    }

    /**
     * 向量相似度检索
     */
    private List<HybridSearchFusion.FusionCandidate> vectorSearch(float[] queryEmbedding, int topK) {
        loadCollection();
        List<List<Float>> vectors = Collections.singletonList(toFloatList(queryEmbedding));

        SearchParam searchParam = SearchParam.newBuilder()
                .withCollectionName(collectionName())
                .withMetricType(MetricType.COSINE)
                .withTopK(topK)
                .withVectors(vectors)
                .withVectorFieldName("embedding")
                .withOutFields(Arrays.asList("chunk_id", "document_id", "document_title", "content", "heading", "publish_time"))
                .build();

        R<SearchResults> response = milvusClient.search(searchParam);
        if (response.getStatus() != R.Status.Success.getCode() || response.getData() == null) {
            log.warn("Milvus 向量检索失败：{}", response.getMessage());
            return List.of();
        }

        SearchResultsWrapper wrapper = new SearchResultsWrapper(response.getData().getResults());
        List<HybridSearchFusion.FusionCandidate> results = new ArrayList<>();
        if (wrapper.getRowRecords(0) == null) {
            return results;
        }
        List<SearchResultsWrapper.IDScore> scores = wrapper.getIDScore(0);
        for (int i = 0; i < wrapper.getRowRecords(0).size(); i++) {
            QueryResultsWrapper.RowRecord record = wrapper.getRowRecords(0).get(i);
            float score = scores != null && scores.size() > i ? scores.get(i).getScore() : 0f;
            results.add(toCandidate(record, score));
        }
        return results;
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

    private HybridSearchFusion.FusionCandidate toCandidate(QueryResultsWrapper.RowRecord record, double score) {
        return HybridSearchFusion.FusionCandidate.of(
                asString(record.get("chunk_id")),
                asLong(record.get("document_id")),
                asString(record.get("document_title")),
                asString(record.get("content")),
                asString(record.get("heading")),
                asString(record.get("publish_time")),
                score
        );
    }

    private static List<Float> toFloatList(float[] array) {
        List<Float> list = new ArrayList<>(array.length);
        for (float value : array) {
            list.add(value);
        }
        return list;
    }

    private static String defaultString(String value) {
        return value != null ? value : "";
    }

    private static String asString(Object value) {
        return value != null ? value.toString() : null;
    }

    private static Long asLong(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        return Long.parseLong(value.toString());
    }

    private static String escapeExprValue(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
