package com.knowledge.base.ai.rag.service.impl;

import com.knowledge.base.ai.config.RagProperties;
import com.knowledge.base.ai.config.RagRuntimeSettings;
import com.knowledge.base.ai.rag.rerank.ApiRerankService;
import com.knowledge.base.ai.rag.rerank.LlmRerankService;
import com.knowledge.base.ai.rag.rerank.RerankProviderResolver;
import com.knowledge.base.ai.rag.rerank.ResolvedRerank;
import com.knowledge.base.ai.rag.service.EmbeddingService;
import com.knowledge.base.ai.rag.service.RagRetrievalService;
import com.knowledge.base.ai.rag.service.VectorIndexService;
import com.knowledge.base.ai.rag.support.RagAclFilter;
import com.knowledge.base.ai.vo.RagSearchResultVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * RAG检索服务实现
 *
 * <p>编排：Query Embedding → Hybrid Search → ACL → Rerank（api/llm/off）。</p>
 *
 * @author 苏三
 * @since 1.0.0
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RagRetrievalServiceImpl implements RagRetrievalService {

    private final EmbeddingService embeddingService;
    private final VectorIndexService vectorIndexService;
    private final RagProperties ragProperties;
    private final RagRuntimeSettings ragRuntimeSettings;
    private final RagAclFilter ragAclFilter;
    private final RerankProviderResolver rerankProviderResolver;
    private final ApiRerankService apiRerankService;
    private final LlmRerankService llmRerankService;

    /** {@inheritDoc} */
    @Override
    public List<RagSearchResultVO> retrieve(String query, int topK, boolean enableRerank) {
        if (query != null) {
            query = query.trim();
        }
        long t0 = System.currentTimeMillis();

        // 索引创建留在写入/searchHybrid 路径，避免每次检索打 ES
        float[] queryEmbedding = null;
        try {
            queryEmbedding = embeddingService.embed(query);
        } catch (Exception e) {
            log.warn("查询嵌入失败，降级为BM25-only搜索：{}", e.getMessage());
        }
        long embedMs = System.currentTimeMillis() - t0;

        int hybridTopK = ragRuntimeSettings.resolveHybridTopK();
        int rrfC = ragProperties.getRetrieval().getRrfC();
        int candidateK = Math.max(topK * 4, hybridTopK);

        long tHybrid = System.currentTimeMillis();
        List<RagSearchResultVO> candidates = vectorIndexService.searchHybrid(
                query, queryEmbedding, candidateK, hybridTopK, rrfC);
        long hybridMs = System.currentTimeMillis() - tHybrid;

        if (candidates.isEmpty()) {
            log.info("RAG检索无结果：query={}", query);
            return List.of();
        }

        candidates = ragAclFilter.filterVisible(candidates);
        if (candidates.isEmpty()) {
            log.info("RAG检索 ACL 过滤后无结果：query={}", query);
            return List.of();
        }

        int maxCand = Math.max(topK, ragProperties.getRerank().getMaxCandidates());
        if (candidates.size() > maxCand) {
            candidates = candidates.subList(0, maxCand);
        }

        // 请求开关 AND 热读/配置 enabled 才进入重排；mode 由热读覆盖
        boolean doRerank = enableRerank && ragRuntimeSettings.resolveRerankEnabled();
        String mode = doRerank ? ragRuntimeSettings.resolveRerankMode() : RerankProviderResolver.MODE_OFF;
        long tRerank = System.currentTimeMillis();
        List<RagSearchResultVO> results = applyRerank(query, candidates, topK, mode);
        long rerankMs = System.currentTimeMillis() - tRerank;

        log.info("RAG retrieve done: embedMs={}, hybridMs={}, rerankMs={}, mode={}, results={}",
                embedMs, hybridMs, rerankMs, mode, results.size());
        return results;
    }

    /**
     * 按 mode 执行重排或截断。
     *
     * @param query      查询
     * @param candidates 候选
     * @param topK       条数
     * @param mode       off|api|llm
     * @return 结果
     */
    private List<RagSearchResultVO> applyRerank(String query, List<RagSearchResultVO> candidates,
                                                int topK, String mode) {
        if (candidates.size() <= topK && !RerankProviderResolver.MODE_API.equals(mode)
                && !RerankProviderResolver.MODE_LLM.equals(mode)) {
            return candidates;
        }
        if (RerankProviderResolver.MODE_API.equals(mode)) {
            ResolvedRerank cfg = rerankProviderResolver.resolve();
            if (cfg.usable()) {
                try {
                    log.info("RAG rerank api: provider={}, model={}, baseUrl={}",
                            cfg.provider(), cfg.model(), cfg.baseUrl());
                    return apiRerankService.rerank(query, candidates, topK);
                } catch (Exception e) {
                    log.warn("API 重排失败，降级为融合分截断：{}", e.getMessage());
                }
            } else {
                log.warn("API 重排不可用（缺凭证或配置），降级为融合分截断");
            }
            return truncate(candidates, topK);
        }
        if (RerankProviderResolver.MODE_LLM.equals(mode)) {
            return llmRerankService.rerank(query, candidates, topK);
        }
        return truncate(candidates, topK);
    }

    /**
     * 按融合分截断。
     *
     * @param candidates 候选
     * @param topK       条数
     * @return 截断列表
     */
    private List<RagSearchResultVO> truncate(List<RagSearchResultVO> candidates, int topK) {
        if (candidates.size() <= topK) {
            return candidates;
        }
        return candidates.subList(0, topK);
    }
}
