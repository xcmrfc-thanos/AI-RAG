package com.knowledge.base.mcp.support;

import com.knowledge.base.mcp.config.McpProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * MCP 总开关门闩：默认关闭时拒绝业务调用
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Component
@RequiredArgsConstructor
public class McpServerGate {

    private final McpProperties mcpProperties;

    /**
     * 是否允许处理 MCP 业务请求
     *
     * @return true 已启用
     */
    public boolean isEnabled() {
        return mcpProperties.getServer() != null && mcpProperties.getServer().isEnabled();
    }

    /**
     * 未启用时抛出业务异常（由控制器映射为 503）
     */
    public void requireEnabled() {
        if (!isEnabled()) {
            throw new McpDisabledException("MCP Server 未启用（mcp.server.enabled=false）");
        }
    }
}
