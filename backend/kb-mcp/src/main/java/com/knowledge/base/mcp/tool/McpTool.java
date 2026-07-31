package com.knowledge.base.mcp.tool;

import java.util.Map;

/**
 * MCP 只读工具接口
 *
 * @author AI-RAG
 * @since 1.0.0
 */
public interface McpTool {

    /**
     * 工具名（白名单）
     *
     * @return 名称
     */
    String name();

    /**
     * 供 tools/list 的简短说明
     *
     * @return 描述
     */
    String description();

    /**
     * JSON Schema 风格入参说明（简化 Map）
     *
     * @return inputSchema
     */
    Map<String, Object> inputSchema();

    /**
     * 执行工具
     *
     * @param input   入参
     * @param context 用户上下文
     * @return 结构化结果
     */
    Map<String, Object> execute(Map<String, Object> input, McpToolContext context);
}
