package com.knowledge.base.intelligence.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Intelligence BC 分域线程池配置（搜索 / RAG / 图谱构建隔离）。
 *
 * @author knowledge-base-team
 * @since 1.0.0
 */
@Data
@ConfigurationProperties(prefix = "intelligence.executor")
public class IntelligenceExecutorProperties {

    private Pool search = new Pool(0, 0, 200);

    private Pool rag = new Pool(0, 0, 300);

    private Pool graph = new Pool(2, 4, 50);

    /**
     * 单线程池参数；core/max 为 0 时由 {@link IntelligenceExecutorConfig} 按 CPU 自动推算。
     */
    @Data
    public static class Pool {

        private int corePoolSize;

        private int maxPoolSize;

        private int queueCapacity;

        public Pool() {
        }

        public Pool(int corePoolSize, int maxPoolSize, int queueCapacity) {
            this.corePoolSize = corePoolSize;
            this.maxPoolSize = maxPoolSize;
            this.queueCapacity = queueCapacity;
        }
    }
}
