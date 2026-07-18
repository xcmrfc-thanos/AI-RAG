package com.knowledge.base.ai.rag.retriever.qdrant;

import com.knowledge.base.ai.config.RagProperties;
import com.knowledge.base.ai.rag.qdrant.QdrantChunkWriter;
import com.knowledge.base.ai.rag.retriever.DenseRetriever;
import com.knowledge.base.ai.rag.support.HybridSearchFusion;
import com.knowledge.base.ai.rag.support.RagAclContextResolver;
import com.knowledge.base.ai.rag.support.RagAclQuerySupport;
import io.qdrant.client.QdrantClient;
import io.qdrant.client.WithPayloadSelectorFactory;
import io.qdrant.client.grpc.Points.ScoredPoint;
import io.qdrant.client.grpc.Points.SearchPoints;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Qdrant 稠密向量检索器（Cosine）
 *
 * <p>仅在 {@code rag.qdrant.enabled=true} 时装配，替换 ES dense 通道。</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "rag.qdrant.enabled", havingValue = "true")
public class QdrantDenseRetriever implements DenseRetriever {

    private final QdrantClient qdrantClient;
    private final RagProperties ragProperties;
    private final QdrantChunkWriter qdrantChunkWriter;
    private final RagAclContextResolver aclContextResolver;

    /** {@inheritDoc} */
    @Override
    public List<HybridSearchFusion.FusionCandidate> retrieve(float[] queryEmbedding, int topK) {
        if (queryEmbedding == null || topK <= 0) {
            return List.of();
        }
        try {
            qdrantChunkWriter.ensureCollection();
            SearchPoints request = SearchPoints.newBuilder()
                    .setCollectionName(collectionName())
                    .addAllVector(toFloatList(queryEmbedding))
                    .setLimit(topK)
                    .setFilter(RagAclQuerySupport.buildQdrantChunkAclFilter(aclContextResolver.resolve()))
                    .setWithPayload(WithPayloadSelectorFactory.enable(true))
                    .build();
            List<ScoredPoint> points = qdrantClient.searchAsync(request)
                    .get(ragProperties.getQdrant().getConnectTimeoutMs(), TimeUnit.MILLISECONDS);
            List<HybridSearchFusion.FusionCandidate> results = new ArrayList<>(points.size());
            for (ScoredPoint point : points) {
                results.add(toCandidate(point));
            }
            return results;
        } catch (Exception e) {
            log.warn("Qdrant 向量检索失败：{}", e.getMessage());
            return List.of();
        }
    }

    private HybridSearchFusion.FusionCandidate toCandidate(ScoredPoint point) {
        var payload = point.getPayloadMap();
        String chunkId = payloadContains(payload, "chunk_id")
                ? payload.get("chunk_id").getStringValue()
                : point.getId().getUuid();
        return HybridSearchFusion.FusionCandidate.of(
                chunkId,
                payloadLong(payload, "document_id"),
                payloadString(payload, "document_title"),
                payloadString(payload, "content"),
                payloadString(payload, "heading"),
                payloadString(payload, "publish_time"),
                point.getScore(),
                payloadBoolean(payload, "is_public"),
                payloadLong(payload, "author_id"),
                payloadLong(payload, "team_id")
        );
    }

    private String collectionName() {
        return ragProperties.getQdrant().getCollection();
    }

    private static boolean payloadContains(java.util.Map<String, io.qdrant.client.grpc.JsonWithInt.Value> payload,
                                           String key) {
        return payload != null && payload.containsKey(key);
    }

    private static String payloadString(java.util.Map<String, io.qdrant.client.grpc.JsonWithInt.Value> payload,
                                        String key) {
        if (!payloadContains(payload, key)) {
            return null;
        }
        var value = payload.get(key);
        if (value.hasStringValue()) {
            return value.getStringValue();
        }
        return value.toString();
    }

    private static Long payloadLong(java.util.Map<String, io.qdrant.client.grpc.JsonWithInt.Value> payload,
                                    String key) {
        if (!payloadContains(payload, key)) {
            return null;
        }
        var value = payload.get(key);
        if (value.hasIntegerValue()) {
            return value.getIntegerValue();
        }
        try {
            return Long.parseLong(value.getStringValue());
        } catch (Exception ignored) {
            return null;
        }
    }

    private static Boolean payloadBoolean(java.util.Map<String, io.qdrant.client.grpc.JsonWithInt.Value> payload,
                                          String key) {
        if (!payloadContains(payload, key)) {
            return null;
        }
        var value = payload.get(key);
        if (value.hasBoolValue()) {
            return value.getBoolValue();
        }
        if (value.hasIntegerValue()) {
            return value.getIntegerValue() == 1;
        }
        if (value.hasStringValue()) {
            String s = value.getStringValue().trim();
            if ("true".equalsIgnoreCase(s) || "1".equals(s)) {
                return true;
            }
            if ("false".equalsIgnoreCase(s) || "0".equals(s)) {
                return false;
            }
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
}
