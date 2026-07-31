package com.knowledge.base.mcp.support;

import com.knowledge.base.mcp.config.McpProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

/**
 * 每用户近似 QPS 限流（滑动 1 秒窗口）
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Component
@RequiredArgsConstructor
public class McpRateLimiter {

    private final McpProperties mcpProperties;
    private final Map<Long, Window> windows = new ConcurrentHashMap<>();

    /**
     * 尝试获取配额；超限抛 RATE_LIMITED
     *
     * @param userId 用户 ID，null 时跳过（不应发生在已鉴权路径）
     */
    public void acquire(Long userId) {
        if (userId == null) {
            return;
        }
        int limit = Math.max(1, mcpProperties.getRateLimit().getPerUserQps());
        long now = System.currentTimeMillis();
        Window window = windows.computeIfAbsent(userId, id -> new Window(now));
        synchronized (window) {
            if (now - window.windowStartMs.get() >= 1000L) {
                window.windowStartMs.set(now);
                window.count.set(0);
            }
            if (window.count.incrementAndGet() > limit) {
                throw new McpRateLimitedException("超过每用户 QPS 上限: " + limit);
            }
        }
    }

    /**
     * 一秒窗口计数器
     */
    private static final class Window {
        private final AtomicLong windowStartMs;
        private final AtomicInteger count = new AtomicInteger(0);

        /**
         * @param startMs 窗口起点
         */
        private Window(long startMs) {
            this.windowStartMs = new AtomicLong(startMs);
        }
    }
}
