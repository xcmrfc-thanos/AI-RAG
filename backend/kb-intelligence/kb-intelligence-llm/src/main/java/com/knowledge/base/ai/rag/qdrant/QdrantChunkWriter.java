package com.knowledge.base.ai.rag.qdrant;

import com.knowledge.base.ai.config.RagProperties;
import com.knowledge.base.ai.rag.entity.DocumentChunk;
import io.qdrant.client.QdrantClient;
import io.qdrant.client.grpc.Collections.Distance;
import io.qdrant.client.grpc.Collections.VectorParams;
import io.qdrant.client.grpc.Points.Condition;
import io.qdrant.client.grpc.Points.FieldCondition;
import io.qdrant.client.grpc.Points.Filter;
import io.qdrant.client.grpc.Points.Match;
import io.qdrant.client.grpc.Points.PointStruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import static io.qdrant.client.PointIdFactory.id;
import static io.qdrant.client.ValueFactory.value;
import static io.qdrant.client.VectorsFactory.vectors;

/**
 * Qdrant chunk 旁路写入（双写）
 *
 * <p>在 ES 索引成功后 upsert；删除按 document_id payload 过滤。</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "rag.qdrant.enabled", havingValue = "true")
public class QdrantChunkWriter {

    private final QdrantClient qdrantClient;
    private final RagProperties ragProperties;

    /**
     * 批量 upsert chunk 向量与 payload
     *
     * @param chunks 已带 embedding 的分块
     */
    public void upsert(List<DocumentChunk> chunks) {
        if (chunks == null || chunks.isEmpty()) {
            return;
        }
        try {
            ensureCollection();
            List<PointStruct> points = new ArrayList<>(chunks.size());
            for (DocumentChunk chunk : chunks) {
                if (chunk.getEmbedding() == null || chunk.getEmbedding().length == 0
                        || !StringUtils.hasText(chunk.getChunkId())) {
                    continue;
                }
                points.add(toPoint(chunk));
            }
            if (points.isEmpty()) {
                return;
            }
            qdrantClient.upsertAsync(collectionName(), points)
                    .get(ragProperties.getQdrant().getConnectTimeoutMs(), TimeUnit.MILLISECONDS);
            log.info("Qdrant 双写成功：{} points", points.size());
        } catch (Throwable t) {
            // NoClassDefFoundError 等属于 Error，需一并 fail-open，避免拖垮 ES 重建
            handleFailure("upsert", t);
        }
    }

    /**
     * 按文档 ID 删除 Qdrant 中全部 chunk
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
     * 确保集合存在且向量维度与配置一致。
     * <p>已存在但维度不匹配时记录错误并抛出，由调用方 fail-open，避免写入错误维度。</p>
     */
    public void ensureCollection() {
        int dimension = ragProperties.getEmbedding().getDimension();
        try {
            Boolean exists = qdrantClient.collectionExistsAsync(collectionName())
                    .get(ragProperties.getQdrant().getConnectTimeoutMs(), TimeUnit.MILLISECONDS);
            if (Boolean.TRUE.equals(exists)) {
                validateCollectionDimension(dimension);
                return;
            }
            qdrantClient.createCollectionAsync(
                            collectionName(),
                            VectorParams.newBuilder()
                                    .setSize(dimension)
                                    .setDistance(Distance.Cosine)
                                    .build())
                    .get(ragProperties.getQdrant().getConnectTimeoutMs(), TimeUnit.MILLISECONDS);
            log.info("Qdrant 集合创建成功：collection={}, dimension={}", collectionName(), dimension);
        } catch (Throwable t) {
            handleFailure("ensureCollection", t);
        }
    }

    /**
     * 校验已有集合的向量维度是否与 embedding.dimension 一致。
     *
     * @param expectedDimension 期望维度
     * @throws Exception 维度不匹配或查询失败
     */
    private void validateCollectionDimension(int expectedDimension) throws Exception {
        var info = qdrantClient.getCollectionInfoAsync(collectionName())
                .get(ragProperties.getQdrant().getConnectTimeoutMs(), TimeUnit.MILLISECONDS);
        long actual = info.getConfig().getParams().getVectorsConfig().getParams().getSize();
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

    private PointStruct toPoint(DocumentChunk chunk) {
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

        return PointStruct.newBuilder()
                .setId(id(toUuid(chunk.getChunkId())))
                .setVectors(vectors(toFloatList(chunk.getEmbedding())))
                .putAllPayload(payload)
                .build();
    }

    /**
     * 处理 Qdrant 旁路失败（fail-open 时仅告警）
     *
     * @param action 动作名
     * @param error  异常或 Error
     */
    private void handleFailure(String action, Throwable error) {
        if (ragProperties.getQdrant().isFailOpen()) {
            log.warn("Qdrant {} 失败（fail-open）：{}", action, error.toString());
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
