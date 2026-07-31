package com.knowledge.base.mcp.support;

/**
 * MCP 限流异常
 *
 * @author AI-RAG
 * @since 1.0.0
 */
public class McpRateLimitedException extends RuntimeException {

    /**
     * 构造限流异常
     *
     * @param message 说明
     */
    public McpRateLimitedException(String message) {
        super(message);
    }
}
