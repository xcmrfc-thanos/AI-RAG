package com.knowledge.base.mcp.tool;

/**
 * MCP 工具执行异常（对外错误码）
 *
 * @author AI-RAG
 * @since 1.0.0
 */
public class McpToolException extends RuntimeException {

    private final String code;
    private final String tool;

    /**
     * 构造工具异常
     *
     * @param code    错误码
     * @param tool    工具名
     * @param message 说明
     */
    public McpToolException(String code, String tool, String message) {
        super(message);
        this.code = code;
        this.tool = tool;
    }

    /**
     * @return 错误码
     */
    public String getCode() {
        return code;
    }

    /**
     * @return 工具名
     */
    public String getTool() {
        return tool;
    }
}
