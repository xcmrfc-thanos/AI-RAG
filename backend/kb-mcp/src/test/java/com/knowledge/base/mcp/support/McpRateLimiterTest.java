package com.knowledge.base.mcp.support;

import com.knowledge.base.mcp.config.McpProperties;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * {@link McpRateLimiter} 单测
 *
 * @author AI-RAG
 * @since 1.0.0
 */
class McpRateLimiterTest {

    /**
     * 超过 per-user QPS 抛限流
     */
    @Test
    void exceedsQps() {
        McpProperties props = new McpProperties();
        props.getRateLimit().setPerUserQps(2);
        McpRateLimiter limiter = new McpRateLimiter(props);
        assertDoesNotThrow(() -> limiter.acquire(99L));
        assertDoesNotThrow(() -> limiter.acquire(99L));
        assertThrows(McpRateLimitedException.class, () -> limiter.acquire(99L));
    }
}
