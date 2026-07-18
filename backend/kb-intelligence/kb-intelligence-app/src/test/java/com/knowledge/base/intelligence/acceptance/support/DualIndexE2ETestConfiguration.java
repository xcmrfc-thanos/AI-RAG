package com.knowledge.base.intelligence.acceptance.support;

import com.knowledge.base.ai.config.RagProperties;
import com.knowledge.base.ai.config.KbCoreInternalProperties;
import com.knowledge.base.ai.rag.kag.graph.GraphBuildService;
import com.knowledge.base.ai.rag.retriever.HybridRetriever;
import com.knowledge.base.ai.rag.retriever.es.ElasticsearchKeywordRetriever;
import com.knowledge.base.ai.rag.service.RagRetrievalService;
import com.knowledge.base.ai.rag.service.ReindexService;
import com.knowledge.base.ai.rag.service.VectorIndexService;
import com.knowledge.base.ai.rag.service.impl.ElasticsearchVectorIndexServiceImpl;
import com.knowledge.base.common.config.IntelligenceIndexingProperties;
import com.knowledge.base.common.config.IntelligenceExecutorNames;
import com.knowledge.base.search.service.impl.SearchServiceImpl;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * 双索引 E2E 测试 Spring 切片：仅加载 ES 检索/RAG 写入相关 Bean。
 */
@Configuration
@EnableConfigurationProperties({
        RagProperties.class,
        IntelligenceIndexingProperties.class,
        KbCoreInternalProperties.class
})
@Import({
        SearchServiceImpl.class,
        ElasticsearchVectorIndexServiceImpl.class,
        ElasticsearchKeywordRetriever.class
})
public class DualIndexE2ETestConfiguration {

    /** E2E 测试向量维度（缩小 dense_vector 开销） */
    public static final int E2E_EMBEDDING_DIMENSION = 8;

    /**
     * RAG 混合检索在关键词 E2E 中不参与，提供空实现占位。
     */
    @Bean
    RagRetrievalService ragRetrievalService() {
        return mock(RagRetrievalService.class);
    }

    /**
     * E2E 仅验证 BM25 双索引链路，混合检索提供空实现占位。
     */
    @Bean
    HybridRetriever hybridRetriever() {
        return mock(HybridRetriever.class);
    }

    /**
     * 同步重建索引，替代 MQ 异步流水线。
     */
    @Bean
    @Primary
    ReindexService e2eReindexService(VectorIndexService vectorIndexService) {
        return new SynchronousE2EReindexService(vectorIndexService, E2E_EMBEDDING_DIMENSION);
    }

    /**
     * 图谱构建在双索引 E2E 中不验证，返回固定 taskId。
     */
    @Bean
    GraphBuildService graphBuildService() {
        GraphBuildService service = mock(GraphBuildService.class);
        when(service.publishBuildTask(org.mockito.ArgumentMatchers.anyLong())).thenReturn("e2e-graph");
        when(service.publishDeleteTask(org.mockito.ArgumentMatchers.anyLong())).thenReturn("e2e-graph-delete");
        return service;
    }

    /**
     * E2E 测试用分池线程池（小容量，三池共用同一实现）。
     */
    @Bean(name = {
            IntelligenceExecutorNames.SEARCH,
            IntelligenceExecutorNames.RAG,
            IntelligenceExecutorNames.GRAPH
    })
    ThreadPoolTaskExecutor e2eTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setThreadNamePrefix("e2e-intel-");
        executor.initialize();
        return executor;
    }
}
