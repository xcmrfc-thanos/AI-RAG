package com.knowledge.base.mcp.support;

/**
 * MCP 总开关关闭时的业务异常
 *
 * @author AI-RAG
 * @since 1.0.0
 */
public class McpDisabledException extends RuntimeException {

    /**
     * 构造关闭态异常
     *
     * @param message 说明
     */
    public McpDisabledException(String message) {
        super(message);
    }
}
