package com.knowledge.base.intelligence.config;

import com.knowledge.base.common.config.IntelligenceExecutorNames;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.test.context.TestPropertySource;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNotSame;

/**
 * Intelligence 分域线程池 Bean 加载验收。
 */
@SpringBootTest(classes = IntelligenceExecutorConfig.class)
@TestPropertySource(properties = {
        "intelligence.executor.search.core-pool-size=2",
        "intelligence.executor.search.max-pool-size=4",
        "intelligence.executor.rag.core-pool-size=3",
        "intelligence.executor.rag.max-pool-size=6",
        "intelligence.executor.graph.core-pool-size=1",
        "intelligence.executor.graph.max-pool-size=2"
})
class IntelligenceExecutorConfigTest {

    @Autowired
    @Qualifier(IntelligenceExecutorNames.SEARCH)
    private ThreadPoolTaskExecutor searchTaskExecutor;

    @Autowired
    @Qualifier(IntelligenceExecutorNames.RAG)
    private ThreadPoolTaskExecutor ragTaskExecutor;

    @Autowired
    @Qualifier(IntelligenceExecutorNames.GRAPH)
    private ThreadPoolTaskExecutor graphTaskExecutor;

    /**
     * 三个线程池 Bean 均应成功创建且彼此独立。
     */
    @Test
    void shouldRegisterIsolatedExecutors() {
        assertNotNull(searchTaskExecutor);
        assertNotNull(ragTaskExecutor);
        assertNotNull(graphTaskExecutor);
        assertNotSame(searchTaskExecutor, ragTaskExecutor);
        assertNotSame(ragTaskExecutor, graphTaskExecutor);
        assertNotSame(searchTaskExecutor, graphTaskExecutor);
    }
}
