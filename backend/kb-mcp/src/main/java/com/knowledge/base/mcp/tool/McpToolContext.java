package com.knowledge.base.mcp.tool;

import org.springframework.util.StringUtils;

/**
 * MCP 工具调用上下文（终端用户身份）
 *
 * @author AI-RAG
 * @since 1.0.0
 */
public record McpToolContext(Long userId, String authorization) {

    /**
     * 规范化 Bearer 头
     *
     * @return Authorization 头值，缺失时 null
     */
    public String bearerHeader() {
        if (!StringUtils.hasText(authorization)) {
            return null;
        }
        String v = authorization.trim();
        if (v.regionMatches(true, 0, "Bearer ", 0, 7)) {
            return "Bearer " + v.substring(7).trim();
        }
        return "Bearer " + v;
    }
}
