package com.knowledge.base.ai.rag.retriever;

import com.knowledge.base.ai.config.RagProperties;
import com.knowledge.base.ai.rag.support.HybridSearchFusion;
import com.knowledge.base.ai.vo.RagSearchResultVO;
import com.knowledge.base.common.config.IntelligenceExecutorNames;
import jakarta.annotation.Resource;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

/**
 * 混合检索编排（默认 RRF，可选 weighted）
 *
 * <p>并行调用 {@link KeywordRetriever} 与 {@link DenseRetriever}，融合算法复用
 * {@link HybridSearchFusion}。开启 Qdrant 时 Dense 通道为 Qdrant，Keyword 仍为 ES BM25。</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RrfHybridRetriever implements HybridRetriever {

    private final KeywordRetriever keywordRetriever;
    private final DenseRetriever denseRetriever;
    private final RagProperties ragProperties;

    @Resource(name = IntelligenceExecutorNames.RAG)
    private ThreadPoolTaskExecutor ragTaskExecutor;

    /** {@inheritDoc} */
    @Override
    public List<RagSearchResultVO> retrieve(String queryText, float[] queryEmbedding,
                                            int topK, int hybridTopK, int rrfC) {
        CompletableFuture<List<HybridSearchFusion.FusionCandidate>> bm25Future =
                CompletableFuture.supplyAsync(
                        () -> keywordRetriever.retrieveCandidates(queryText, hybridTopK),
                        ragTaskExecutor);

        CompletableFuture<List<HybridSearchFusion.FusionCandidate>> knnFuture;
        if (queryEmbedding != null) {
            knnFuture = CompletableFuture.supplyAsync(
                    () -> denseRetriever.retrieve(queryEmbedding, hybridTopK),
                    ragTaskExecutor);
        } else {
            knnFuture = CompletableFuture.completedFuture(List.of());
        }

        List<HybridSearchFusion.FusionCandidate> bm25Results;
        List<HybridSearchFusion.FusionCandidate> knnResults;
        try {
            bm25Results = bm25Future.get(30, TimeUnit.SECONDS);
            knnResults = knnFuture.get(30, TimeUnit.SECONDS);
        } catch (Exception e) {
            log.error("混合搜索超时或失败：{}", e.getMessage());
            bm25Results = bm25Future.getNow(List.of());
            knnResults = knnFuture.getNow(List.of());
        }

        Set<Long> keywordDocumentIds = bm25Results.stream()
                .map(HybridSearchFusion.FusionCandidate::getDocumentId)
                .collect(Collectors.toSet());
        knnResults = knnResults.stream()
                .filter(candidate -> keywordDocumentIds.contains(candidate.getDocumentId()))
                .toList();

        String fusion = ragProperties.getHybrid() != null ? ragProperties.getHybrid().getFusion() : "rrf";
        log.debug("混合搜索结果：BM25={}条, kNN={}条, fusion={}", bm25Results.size(), knnResults.size(), fusion);
        if (StringUtils.hasText(fusion) && "weighted".equalsIgnoreCase(fusion.trim())) {
            return HybridSearchFusion.fuseWeightedAndConvert(
                    bm25Results,
                    knnResults,
                    topK,
                    ragProperties.getHybrid().getBm25Weight(),
                    ragProperties.getHybrid().getDenseWeight());
        }
        return HybridSearchFusion.fuseAndConvert(bm25Results, knnResults, topK, rrfC);
    }
}
