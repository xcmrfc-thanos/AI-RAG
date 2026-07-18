package com.knowledge.base.intelligence.acceptance.support;

import com.knowledge.base.ai.rag.entity.DocumentChunk;
import com.knowledge.base.ai.rag.service.ReindexService;
import com.knowledge.base.ai.rag.service.VectorIndexService;
import com.knowledge.base.ai.vo.ReindexProgressVO;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * E2E 测试用同步重建索引：跳过 RabbitMQ，直接向 kb_chunk 写入可检索分块。
 */
public class SynchronousE2EReindexService implements ReindexService {

    /** 与文档标题/摘要共用的验收关键词 */
    public static final String KEYWORD = "startTransitionE2E9311";

    private final VectorIndexService vectorIndexService;
    private final int embeddingDimension;

    /**
     * @param vectorIndexService  向量索引服务
     * @param embeddingDimension  测试向量维度
     */
    public SynchronousE2EReindexService(VectorIndexService vectorIndexService, int embeddingDimension) {
        this.vectorIndexService = vectorIndexService;
        this.embeddingDimension = embeddingDimension;
    }

    /** {@inheritDoc} */
    @Override
    public String reindexAll() {
        return "e2e-all";
    }

    /** {@inheritDoc} */
    @Override
    public String reindexByDocId(Long documentId) {
        return reindexBatch(List.of(documentId));
    }

    /** {@inheritDoc} */
    @Override
    public String reindexBatch(List<Long> documentIds) {
        if (documentIds == null || documentIds.isEmpty()) {
            return "e2e-empty";
        }
        for (Long documentId : documentIds) {
            vectorIndexService.deleteByDocId(documentId);
            DocumentChunk chunk = DocumentChunk.builder()
                    .chunkId(UUID.randomUUID().toString())
                    .documentId(documentId)
                    .documentTitle("E2E " + KEYWORD)
                    .content("chunk body contains " + KEYWORD + " for bm25 hit")
                    .heading("intro")
                    .chunkIndex(0)
                    .totalChunks(1)
                    .docStatus(1)
                    .embedding(zeroEmbedding())
                    .indexedAt(LocalDateTime.now())
                    .build();
            vectorIndexService.indexChunks(List.of(chunk));
        }
        return "e2e-" + documentIds.get(0);
    }

    /** {@inheritDoc} */
    @Override
    public ReindexProgressVO getProgress(String taskId) {
        return ReindexProgressVO.builder().taskId(taskId).status("COMPLETED").build();
    }

    /** {@inheritDoc} */
    @Override
    public String deleteByDocId(Long documentId) {
        vectorIndexService.deleteByDocId(documentId);
        return "e2e-delete";
    }

    /** {@inheritDoc} */
    @Override
    public String deleteByDocIds(List<Long> documentIds) {
        if (documentIds != null) {
            documentIds.forEach(vectorIndexService::deleteByDocId);
        }
        return "e2e-delete-batch";
    }

    private float[] zeroEmbedding() {
        return new float[embeddingDimension];
    }
}
