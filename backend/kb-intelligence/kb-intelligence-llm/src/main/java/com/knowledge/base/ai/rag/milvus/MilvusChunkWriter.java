package com.knowledge.base.ai.rag.milvus;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.knowledge.base.ai.config.RagProperties;
import com.knowledge.base.ai.config.RetrievalEngineProfile;
import com.knowledge.base.ai.config.RetrievalEngineResolver;
import com.knowledge.base.ai.rag.entity.DocumentChunk;
import com.knowledge.base.ai.rag.sparse.HashingBm25SparseEmbedder;
import com.knowledge.base.ai.rag.sparse.SparseVectorSupport;
import io.milvus.client.MilvusServiceClient;
import io.milvus.grpc.MutationResult;
import io.milvus.param.R;
import io.milvus.param.dml.DeleteParam;
import io.milvus.param.dml.InsertParam;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Map;
import java.util.SortedMap;
import java.util.stream.Collectors;

/**
 * Milvus chunk 写入（单库主路径或 ES+Milvus 双写）。
 *
 * <p>{@code es-milvus} 仅写 dense；{@code milvus-milvus} 同时写 sparse+dense。失败策略对齐 Qdrant fail-open。</p>
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnBean(MilvusServiceClient.class)
public class MilvusChunkWriter {

    private static final Gson GSON = new Gson();

    private final MilvusServiceClient milvusClient;
    private final RagProperties ragProperties;
    private final RetrievalEngineResolver engineResolver;
    private final MilvusCollectionSupport collectionSupport;
    private final HashingBm25SparseEmbedder sparseEmbedder;

    /**
     * 批量 upsert（insert）chunk。
     *
     * @param chunks 已带 dense embedding 的分块
     */
    public void upsert(List<DocumentChunk> chunks) {
        if (chunks == null || chunks.isEmpty()) {
            return;
        }
        try {
            boolean includeSparse = needsSparse();
            collectionSupport.ensureCollection(includeSparse);
            List<JsonObject> rows = chunks.stream()
                    .filter(c -> c.getEmbedding() != null && c.getEmbedding().length > 0
                            && StringUtils.hasText(c.getChunkId()))
                    .map(c -> toJsonRow(c, includeSparse))
                    .collect(Collectors.toList());
            if (rows.isEmpty()) {
                return;
            }
            R<MutationResult> response = milvusClient.insert(InsertParam.newBuilder()
                    .withCollectionName(collectionSupport.collectionName())
                    .withRows(rows)
                    .build());
            if (response.getStatus() != R.Status.Success.getCode()) {
                handleFailure("upsert", new RuntimeException(response.getMessage()));
                return;
            }
            log.info("Milvus 写入成功：{} points, sparse={}", rows.size(), includeSparse);
        } catch (Throwable t) {
            handleFailure("upsert", t);
        }
    }

    /**
     * 按文档 ID 删除。
     *
     * @param documentId 文档 ID
     */
    public void deleteByDocId(Long documentId) {
        if (documentId == null) {
            return;
        }
        try {
            if (!collectionSupport.collectionExists()) {
                return;
            }
            R<MutationResult> response = milvusClient.delete(DeleteParam.newBuilder()
                    .withCollectionName(collectionSupport.collectionName())
                    .withExpr("document_id == " + documentId)
                    .build());
            if (response.getStatus() == R.Status.Success.getCode()) {
                log.info("Milvus 已删除文档块：documentId={}", documentId);
            } else {
                handleFailure("deleteByDocId", new RuntimeException(response.getMessage()));
            }
        } catch (Throwable t) {
            handleFailure("deleteByDocId documentId=" + documentId, t);
        }
    }

    private boolean needsSparse() {
        RetrievalEngineProfile profile = engineResolver.current();
        return profile == RetrievalEngineProfile.MILVUS_MILVUS;
    }

    private boolean failOpen() {
        RetrievalEngineProfile profile = engineResolver.current();
        if (profile == RetrievalEngineProfile.ES_MILVUS) {
            return ragProperties.getMilvus() == null || ragProperties.getMilvus().isFailOpen();
        }
        return false;
    }

    private void handleFailure(String action, Throwable error) {
        if (failOpen()) {
            log.warn("Milvus {} 失败（fail-open）：{}", action, error.toString());
            return;
        }
        throw new RuntimeException("Milvus " + action + " 失败：" + error.getMessage(), error);
    }

    private JsonObject toJsonRow(DocumentChunk chunk, boolean includeSparse) {
        JsonObject row = new JsonObject();
        row.addProperty("chunk_id", chunk.getChunkId());
        row.addProperty("document_id", chunk.getDocumentId() != null ? chunk.getDocumentId() : 0L);
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

        JsonArray embedding = new JsonArray();
        for (float value : chunk.getEmbedding()) {
            embedding.add(value);
        }
        row.add(MilvusCollectionSupport.FIELD_DENSE, embedding);

        if (includeSparse) {
            Map<Integer, Float> sparse = sparseEmbedder.embed(
                    SparseVectorSupport.joinText(chunk.getDocumentTitle(), chunk.getContent()));
            SortedMap<Long, Float> milvusSparse = SparseVectorSupport.toMilvusSortedMap(sparse);
            row.add(MilvusCollectionSupport.FIELD_SPARSE, GSON.toJsonTree(milvusSparse));
        }
        return row;
    }

    private static String defaultString(String value) {
        return value != null ? value : "";
    }
}
