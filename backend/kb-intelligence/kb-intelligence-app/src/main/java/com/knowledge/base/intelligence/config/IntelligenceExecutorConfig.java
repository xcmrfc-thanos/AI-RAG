package com.knowledge.base.intelligence.config;

import com.knowledge.base.common.config.IntelligenceExecutorNames;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.ThreadPoolExecutor;

/**
 * Intelligence BC 分域线程池：搜索、RAG、图谱构建互不共享队列，避免高负载互相饿死。
 *
 * @author knowledge-base-team
 * @since 1.0.0
 */
@Slf4j
@Configuration
@EnableConfigurationProperties(IntelligenceExecutorProperties.class)
@RequiredArgsConstructor
public class IntelligenceExecutorConfig {

    private final IntelligenceExecutorProperties properties;

    /**
     * 全文/混合搜索专用线程池。
     */
    @Bean(name = IntelligenceExecutorNames.SEARCH)
    public ThreadPoolTaskExecutor searchTaskExecutor() {
        int cores = Runtime.getRuntime().availableProcessors();
        IntelligenceExecutorProperties.Pool pool = properties.getSearch();
        int core = resolveSize(pool.getCorePoolSize(), Math.max(2, cores / 2));
        int max = resolveSize(pool.getMaxPoolSize(), Math.max(core, cores));
        return buildExecutor("intel-search-", core, max, pool.getQueueCapacity());
    }

    /**
     * RAG 检索、对话与向量索引专用线程池。
     */
    @Bean(name = IntelligenceExecutorNames.RAG)
    public ThreadPoolTaskExecutor ragTaskExecutor() {
        int cores = Runtime.getRuntime().availableProcessors();
        IntelligenceExecutorProperties.Pool pool = properties.getRag();
        int core = resolveSize(pool.getCorePoolSize(), cores);
        int max = resolveSize(pool.getMaxPoolSize(), cores * 2);
        return buildExecutor("intel-rag-", core, max, pool.getQueueCapacity());
    }

    /**
     * KAG 图谱构建专用线程池（LLM 抽取偏重，默认较小并发）。
     */
    @Bean(name = IntelligenceExecutorNames.GRAPH)
    public ThreadPoolTaskExecutor graphTaskExecutor() {
        IntelligenceExecutorProperties.Pool pool = properties.getGraph();
        int core = resolveSize(pool.getCorePoolSize(), 2);
        int max = resolveSize(pool.getMaxPoolSize(), 4);
        return buildExecutor("intel-graph-", core, max, pool.getQueueCapacity());
    }

    /**
     * 解析线程池大小：配置为 0 时使用自动推算值。
     */
    private int resolveSize(int configured, int fallback) {
        return configured > 0 ? configured : fallback;
    }

    /**
     * 创建并初始化 ThreadPoolTaskExecutor。
     */
    private ThreadPoolTaskExecutor buildExecutor(String prefix, int core, int max, int queueCapacity) {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(core);
        executor.setMaxPoolSize(max);
        executor.setQueueCapacity(queueCapacity);
        executor.setThreadNamePrefix(prefix);
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(60);
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        log.info("Intelligence 线程池初始化：prefix={}, core={}, max={}, queue={}",
                prefix, core, max, queueCapacity);
        return executor;
    }
}
