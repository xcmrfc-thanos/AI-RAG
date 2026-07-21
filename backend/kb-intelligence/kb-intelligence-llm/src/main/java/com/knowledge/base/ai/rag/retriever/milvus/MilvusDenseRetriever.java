package com.knowledge.base.ai.rag.retriever.milvus;

import com.knowledge.base.ai.config.RagProperties;
import com.knowledge.base.ai.rag.retriever.DenseRetriever;
import com.knowledge.base.ai.rag.support.HybridSearchFusion;
import io.milvus.client.MilvusServiceClient;
import io.milvus.grpc.SearchResults;
import io.milvus.param.MetricType;
import io.milvus.param.R;
import io.milvus.param.dml.SearchParam;
import io.milvus.response.QueryResultsWrapper;
import io.milvus.response.SearchResultsWrapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import com.knowledge.base.ai.rag.milvus.MilvusCollectionSupport;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * Milvus 稠密向量检索器（milvus-milvus / es-milvus）。
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnExpression("'${rag.vector-store:}'.equalsIgnoreCase('milvus') "
        + "|| '${rag.retrieval.dense-engine:}'.equalsIgnoreCase('milvus') "
        + "|| '${rag.retrieval.profile:}'.equalsIgnoreCase('es-milvus') "
        + "|| '${rag.retrieval.profile:}'.equalsIgnoreCase('milvus-milvus')")
public class MilvusDenseRetriever implements DenseRetriever {

    private final MilvusServiceClient milvusClient;
    private final RagProperties ragProperties;
    private final MilvusCollectionSupport collectionSupport;

    /** {@inheritDoc} */
    @Override
    public List<HybridSearchFusion.FusionCandidate> retrieve(float[] queryEmbedding, int topK) {
        if (queryEmbedding == null || topK <= 0) {
            return List.of();
        }
        // es-milvus 仅 dense；milvus-milvus 含 sparse 字段，但 dense 检索不强制重建
        boolean includeSparse = "milvus".equalsIgnoreCase(ragProperties.getVectorStore())
                || "milvus-milvus".equalsIgnoreCase(
                ragProperties.getRetrieval() != null ? ragProperties.getRetrieval().getProfile() : "");
        collectionSupport.ensureCollection(includeSparse);
        List<List<Float>> vectors = Collections.singletonList(toFloatList(queryEmbedding));

        SearchParam searchParam = SearchParam.newBuilder()
                .withCollectionName(collectionSupport.collectionName())
                .withMetricType(MetricType.COSINE)
                .withTopK(topK)
                .withVectors(vectors)
                .withVectorFieldName(MilvusCollectionSupport.FIELD_DENSE)
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

    private HybridSearchFusion.FusionCandidate toCandidate(QueryResultsWrapper.RowRecord record, double score) {
        return HybridSearchFusion.FusionCandidate.of(
                asString(record.get("chunk_id")),
                asLong(record.get("document_id")),
                asString(record.get("document_title")),
                asString(record.get("content")),
                asString(record.get("heading")),
                asString(record.get("publish_time")),
                score,
                asBoolean(record.get("is_public")),
                asLong(record.get("author_id")),
                asLong(record.get("team_id"))
        );
    }

    private static Boolean asBoolean(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Boolean b) {
            return b;
        }
        if (value instanceof Number n) {
            return n.intValue() == 1;
        }
        String s = value.toString().trim();
        if ("true".equalsIgnoreCase(s) || "1".equals(s)) {
            return true;
        }
        if ("false".equalsIgnoreCase(s) || "0".equals(s)) {
            return false;
        }
        return null;
    }

    private static List<Float> toFloatList(float[] array) {
        List<Float> list = new ArrayList<>(array.length);
        for (float value : array) {
            list.add(value);
        }
        return list;
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
}
