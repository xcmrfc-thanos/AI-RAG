package com.knowledge.base.mcp.tool;

import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * MCP 工具白名单注册表
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Component
public class McpToolRegistry {

    private final Map<String, McpTool> tools = new LinkedHashMap<>();

    /**
     * 注册全部 {@link McpTool} Bean
     *
     * @param toolList Spring 注入的工具列表
     */
    public McpToolRegistry(List<McpTool> toolList) {
        if (toolList != null) {
            for (McpTool tool : toolList) {
                tools.put(tool.name(), tool);
            }
        }
    }

    /**
     * 按名查找工具
     *
     * @param name 工具名
     * @return 工具
     */
    public McpTool require(String name) {
        McpTool tool = tools.get(name);
        if (tool == null) {
            throw new McpToolException("UNKNOWN_TOOL", name != null ? name : "", "未知工具: " + name);
        }
        return tool;
    }

    /**
     * 全部已注册工具
     *
     * @return 工具集合
     */
    public Collection<McpTool> all() {
        return tools.values();
    }
}
