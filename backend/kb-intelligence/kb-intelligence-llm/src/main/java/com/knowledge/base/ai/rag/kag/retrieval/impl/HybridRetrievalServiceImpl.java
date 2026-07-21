package com.knowledge.base.ai.rag.kag.retrieval.impl;

import com.knowledge.base.common.config.IntelligenceExecutorNames;
import com.knowledge.base.ai.config.KAGProperties;
import com.knowledge.base.ai.rag.kag.retrieval.GraphContext;
import com.knowledge.base.ai.rag.kag.retrieval.HybridRetrievalService;
import com.knowledge.base.ai.rag.kag.retrieval.KAGRetrievalService;
import com.knowledge.base.ai.rag.service.RagRetrievalService;
import com.knowledge.base.ai.vo.RagSearchResultVO;
import jakarta.annotation.Resource;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

/**
 * 混合检索服务实现
 *
 * <p>并行执行 RAG（文本向量检索）和 KAG（知识图谱推理），合并去重后返回。</p>
 *
 * @author 苏三
 * @since 1.0.0
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class HybridRetrievalServiceImpl implements HybridRetrievalService {

    private final RagRetrievalService ragRetrievalService;
    private final KAGRetrievalService kagRetrievalService;
    private final KAGProperties kagProperties;

    @Resource(name = IntelligenceExecutorNames.GRAPH)
    private ThreadPoolTaskExecutor graphTaskExecutor;

    @Resource(name = IntelligenceExecutorNames.RAG)
    private ThreadPoolTaskExecutor ragTaskExecutor;

    /** {@inheritDoc} */
    @Override
    public HybridResult retrieveHybrid(String query, int topK, boolean enableRerank, boolean enableKAG) {
        CompletableFuture<List<RagSearchResultVO>> ragFuture = CompletableFuture.supplyAsync(() -> {
            try {
                return ragRetrievalService.retrieve(query, topK * 2, enableRerank);
            } catch (Exception e) {
                log.warn("RAG retrieval failed: {}", e.getMessage());
                return Collections.emptyList();
            }
        }, ragTaskExecutor);

        CompletableFuture<GraphContext> kagFuture;
        if (enableKAG) {
            kagFuture = CompletableFuture.supplyAsync(() -> {
                try {
                    return kagRetrievalService.retrieveGraphContext(query);
                } catch (Exception e) {
                    log.warn("KAG retrieval failed, falling back to RAG only: {}", e.getMessage());
                    return GraphContext.builder().hasResults(false).build();
                }
            }, graphTaskExecutor);
        } else {
            kagFuture = CompletableFuture.completedFuture(
                    GraphContext.builder().hasResults(false).build());
        }

        List<RagSearchResultVO> ragResults;
        try {
            ragResults = ragFuture.get(
                    Math.max(10, kagProperties.getRetrieval().getTimeoutSeconds() + 20),
                    TimeUnit.SECONDS);
        } catch (Exception e) {
            log.warn("RAG retrieval timeout or error: {}", e.getMessage());
            ragResults = Collections.emptyList();
        }

        GraphContext kagContext;
        try {
            kagContext = kagFuture.get(
                    kagProperties.getRetrieval().getTimeoutSeconds(), TimeUnit.SECONDS);
        } catch (Exception e) {
            log.warn("KAG retrieval timeout or error: {}", e.getMessage());
            kagContext = GraphContext.builder().hasResults(false).build();
        }

        List<RagSearchResultVO> fusedResults = mergeResults(ragResults, kagContext, topK);
        return new HybridResult(
                ragResults,
                kagContext,
                fusedResults,
                kagContext.isHasResults()
        );
    }

    /**
     * 合并 RAG 文本结果和 KAG 图谱关联的文本块。
     *
     * @param ragResults RAG 结果
     * @param kagContext KAG 上下文
     * @param topK       截断
     * @return 融合列表
     */
    private List<RagSearchResultVO> mergeResults(
            List<RagSearchResultVO> ragResults, GraphContext kagContext, int topK) {

        Map<String, RagSearchResultVO> merged = new LinkedHashMap<>();

        for (RagSearchResultVO result : ragResults) {
            String key = result.getChunkId();
            if (key == null) {
                key = "rag_" + UUID.randomUUID();
            }
            merged.putIfAbsent(key, result);
        }

        if (kagContext.isHasResults() && kagContext.getAssociatedChunks() != null) {
            for (GraphContext.GraphChunk chunk : kagContext.getAssociatedChunks()) {
                String key = chunk.getChunkId();
                if (key == null || merged.containsKey(key)) {
                    continue;
                }
                RagSearchResultVO kagResult = RagSearchResultVO.builder()
                        .chunkId(chunk.getChunkId())
                        .documentId(chunk.getDocId())
                        .documentTitle(chunk.getDocTitle())
                        .content(chunk.getContent())
                        .heading(chunk.getHeading())
                        .score(0.65)
                        .bm25Score(0.0)
                        .vectorScore(0.65)
                        .build();
                merged.put(key, kagResult);
            }
        }

        return merged.values().stream()
                .sorted(Comparator.comparingDouble(RagSearchResultVO::getScore).reversed())
                .limit(topK)
                .collect(Collectors.toList());
    }
}
