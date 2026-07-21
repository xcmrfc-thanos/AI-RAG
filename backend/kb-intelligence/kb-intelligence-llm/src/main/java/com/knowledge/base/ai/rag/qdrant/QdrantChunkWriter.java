package com.knowledge.base.ai.rag.qdrant;

import com.knowledge.base.ai.config.RagProperties;
import com.knowledge.base.ai.config.RetrievalEngineProfile;
import com.knowledge.base.ai.config.RetrievalEngineResolver;
import com.knowledge.base.ai.rag.entity.DocumentChunk;
import com.knowledge.base.ai.rag.sparse.HashingBm25SparseEmbedder;
import com.knowledge.base.ai.rag.sparse.SparseVectorSupport;
import io.qdrant.client.QdrantClient;
import io.qdrant.client.grpc.Collections.CreateCollection;
import io.qdrant.client.grpc.Collections.Distance;
import io.qdrant.client.grpc.Collections.SparseVectorConfig;
import io.qdrant.client.grpc.Collections.SparseVectorParams;
import io.qdrant.client.grpc.Collections.VectorParams;
import io.qdrant.client.grpc.Collections.VectorParamsMap;
import io.qdrant.client.grpc.Collections.VectorsConfig;
import io.qdrant.client.grpc.Points.Condition;
import io.qdrant.client.grpc.Points.FieldCondition;
import io.qdrant.client.grpc.Points.Filter;
import io.qdrant.client.grpc.Points.Match;
import io.qdrant.client.grpc.Points.PointStruct;
import io.qdrant.client.grpc.Points.Vector;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import static io.qdrant.client.PointIdFactory.id;
import static io.qdrant.client.ValueFactory.value;
import static io.qdrant.client.VectorFactory.vector;
import static io.qdrant.client.VectorsFactory.namedVectors;
import static io.qdrant.client.VectorsFactory.vectors;

/**
 * Qdrant chunk 写入。
 *
 * <ul>
 *   <li>{@code es-qdrant}：未命名 dense（旁路双写）</li>
 *   <li>{@code qdrant-qdrant}：named dense + sparse 单库</li>
 * </ul>
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnExpression("${rag.qdrant.enabled:false} "
        + "&& !'${rag.retrieval.profile:}'.equalsIgnoreCase('es-es') "
        + "&& !'${rag.retrieval.profile:}'.equalsIgnoreCase('es-milvus') "
        + "&& !'${rag.retrieval.profile:}'.equalsIgnoreCase('milvus-milvus')")
public class QdrantChunkWriter {

    /** qdrant-qdrant dense 向量名 */
    public static final String VECTOR_DENSE = "dense";
    /** qdrant-qdrant sparse 向量名 */
    public static final String VECTOR_SPARSE = "sparse";

    private final QdrantClient qdrantClient;
    private final RagProperties ragProperties;
    private final RetrievalEngineResolver engineResolver;
    private final HashingBm25SparseEmbedder sparseEmbedder;

    /**
     * 是否为 Qdrant 单库（named dense+sparse）。
     *
     * @return true 单库
     */
    public boolean isHybridSparseMode() {
        return engineResolver.current() == RetrievalEngineProfile.QDRANT_QDRANT
                || "qdrant".equalsIgnoreCase(ragProperties.getVectorStore());
    }

    /**
     * 批量 upsert chunk 向量与 payload。
     *
     * @param chunks 已带 embedding 的分块
     */
    public void upsert(List<DocumentChunk> chunks) {
        if (chunks == null || chunks.isEmpty()) {
            return;
        }
        try {
            ensureCollection();
            boolean hybrid = isHybridSparseMode();
            List<PointStruct> points = new ArrayList<>(chunks.size());
            for (DocumentChunk chunk : chunks) {
                if (chunk.getEmbedding() == null || chunk.getEmbedding().length == 0
                        || !StringUtils.hasText(chunk.getChunkId())) {
                    continue;
                }
                points.add(toPoint(chunk, hybrid));
            }
            if (points.isEmpty()) {
                return;
            }
            qdrantClient.upsertAsync(collectionName(), points)
                    .get(ragProperties.getQdrant().getConnectTimeoutMs(), TimeUnit.MILLISECONDS);
            log.info("Qdrant 写入成功：{} points, hybridSparse={}", points.size(), hybrid);
        } catch (Throwable t) {
            handleFailure("upsert", t);
        }
    }

    /**
     * 按文档 ID 删除 Qdrant 中全部 chunk。
     *
     * @param documentId 文档 ID
     */
    public void deleteByDocId(Long documentId) {
        if (documentId == null) {
            return;
        }
        try {
            if (!collectionExists()) {
                return;
            }
            Filter filter = Filter.newBuilder()
                    .addMust(Condition.newBuilder()
                            .setField(FieldCondition.newBuilder()
                                    .setKey("document_id")
                                    .setMatch(Match.newBuilder().setInteger(documentId).build())
                                    .build())
                            .build())
                    .build();
            qdrantClient.deleteAsync(collectionName(), filter)
                    .get(ragProperties.getQdrant().getConnectTimeoutMs(), TimeUnit.MILLISECONDS);
            log.info("Qdrant 已删除文档块：documentId={}", documentId);
        } catch (Throwable t) {
            handleFailure("deleteByDocId documentId=" + documentId, t);
        }
    }

    /**
     * 确保集合存在；单库形态创建 dense+sparse named vectors。
     */
    public void ensureCollection() {
        int dimension = ragProperties.getEmbedding().getDimension();
        boolean hybrid = isHybridSparseMode();
        try {
            Boolean exists = qdrantClient.collectionExistsAsync(collectionName())
                    .get(ragProperties.getQdrant().getConnectTimeoutMs(), TimeUnit.MILLISECONDS);
            if (Boolean.TRUE.equals(exists)) {
                if (!hybrid) {
                    validateUnnamedDimension(dimension);
                }
                return;
            }
            if (hybrid) {
                CreateCollection create = CreateCollection.newBuilder()
                        .setCollectionName(collectionName())
                        .setVectorsConfig(VectorsConfig.newBuilder()
                                .setParamsMap(VectorParamsMap.newBuilder()
                                        .putMap(VECTOR_DENSE, VectorParams.newBuilder()
                                                .setSize(dimension)
                                                .setDistance(Distance.Cosine)
                                                .build())
                                        .build())
                                .build())
                        .setSparseVectorsConfig(SparseVectorConfig.newBuilder()
                                .putMap(VECTOR_SPARSE, SparseVectorParams.getDefaultInstance())
                                .build())
                        .build();
                qdrantClient.createCollectionAsync(create)
                        .get(ragProperties.getQdrant().getConnectTimeoutMs(), TimeUnit.MILLISECONDS);
            } else {
                qdrantClient.createCollectionAsync(
                                collectionName(),
                                VectorParams.newBuilder()
                                        .setSize(dimension)
                                        .setDistance(Distance.Cosine)
                                        .build())
                        .get(ragProperties.getQdrant().getConnectTimeoutMs(), TimeUnit.MILLISECONDS);
            }
            log.info("Qdrant 集合创建成功：collection={}, dimension={}, hybridSparse={}",
                    collectionName(), dimension, hybrid);
        } catch (Throwable t) {
            handleFailure("ensureCollection", t);
        }
    }

    private void validateUnnamedDimension(int expectedDimension) throws Exception {
        var info = qdrantClient.getCollectionInfoAsync(collectionName())
                .get(ragProperties.getQdrant().getConnectTimeoutMs(), TimeUnit.MILLISECONDS);
        var vectorsConfig = info.getConfig().getParams().getVectorsConfig();
        if (!vectorsConfig.hasParams()) {
            return;
        }
        long actual = vectorsConfig.getParams().getSize();
        if (actual != expectedDimension) {
            throw new IllegalStateException(String.format(
                    "Qdrant 集合维度不匹配：collection=%s, expected=%d, actual=%d；请删集合后重建索引",
                    collectionName(), expectedDimension, actual));
        }
    }

    private boolean collectionExists() throws Exception {
        Boolean exists = qdrantClient.collectionExistsAsync(collectionName())
                .get(ragProperties.getQdrant().getConnectTimeoutMs(), TimeUnit.MILLISECONDS);
        return Boolean.TRUE.equals(exists);
    }

    private PointStruct toPoint(DocumentChunk chunk, boolean hybrid) {
        Map<String, io.qdrant.client.grpc.JsonWithInt.Value> payload = new HashMap<>();
        payload.put("chunk_id", value(chunk.getChunkId()));
        payload.put("document_id", value(chunk.getDocumentId() != null ? chunk.getDocumentId() : 0L));
        payload.put("document_title", value(defaultString(chunk.getDocumentTitle())));
        payload.put("content", value(defaultString(chunk.getContent())));
        payload.put("heading", value(defaultString(chunk.getHeading())));
        payload.put("publish_time", value(defaultString(chunk.getPublishTime())));
        if (chunk.getCategoryId() != null) {
            payload.put("category_id", value(chunk.getCategoryId()));
        }
        if (chunk.getAuthorId() != null) {
            payload.put("author_id", value(chunk.getAuthorId()));
        }
        if (chunk.getTeamId() != null) {
            payload.put("team_id", value(chunk.getTeamId()));
        }
        if (chunk.getDocStatus() != null) {
            payload.put("doc_status", value(chunk.getDocStatus()));
        }
        if (chunk.getIsPublic() != null) {
            payload.put("is_public", value(chunk.getIsPublic()));
        }

        PointStruct.Builder builder = PointStruct.newBuilder()
                .setId(id(toUuid(chunk.getChunkId())))
                .putAllPayload(payload);

        List<Float> dense = toFloatList(chunk.getEmbedding());
        if (hybrid) {
            Map<Integer, Float> sparse = sparseEmbedder.embed(
                    SparseVectorSupport.joinText(chunk.getDocumentTitle(), chunk.getContent()));
            Map<String, Vector> named = new LinkedHashMap<>();
            named.put(VECTOR_DENSE, vector(dense));
            named.put(VECTOR_SPARSE, vector(
                    SparseVectorSupport.toValueList(sparse),
                    SparseVectorSupport.toIndexList(sparse)));
            builder.setVectors(namedVectors(named));
        } else {
            builder.setVectors(vectors(dense));
        }
        return builder.build();
    }

    private void handleFailure(String action, Throwable error) {
        if (ragProperties.getQdrant().isFailOpen() && !isHybridSparseMode()) {
            log.warn("Qdrant {} 失败（fail-open）：{}", action, error.toString());
            return;
        }
        // 单库主路径：fail-open 也告警但不拖垮若为旁路；单库抛错
        if (isHybridSparseMode() && !ragProperties.getQdrant().isFailOpen()) {
            throw new RuntimeException("Qdrant " + action + " 失败：" + error.getMessage(), error);
        }
        if (isHybridSparseMode()) {
            log.warn("Qdrant {} 失败（单库 fail-open）：{}", action, error.toString());
            return;
        }
        throw new RuntimeException("Qdrant " + action + " 失败：" + error.getMessage(), error);
    }

    private String collectionName() {
        return ragProperties.getQdrant().getCollection();
    }

    private static UUID toUuid(String chunkId) {
        try {
            return UUID.fromString(chunkId);
        } catch (IllegalArgumentException ex) {
            return UUID.nameUUIDFromBytes(chunkId.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        }
    }

    private static List<Float> toFloatList(float[] embedding) {
        List<Float> list = new ArrayList<>(embedding.length);
        for (float value : embedding) {
            list.add(value);
        }
        return list;
    }

    private static String defaultString(String value) {
        return value != null ? value : "";
    }
}
