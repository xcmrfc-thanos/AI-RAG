package com.knowledge.base.agent.tool;

/**
 * 结构化工具错误（超时 / 非 2xx / 参数非法 / 过长输出）
 *
 * @author AI-RAG
 * @since 1.0.0
 */
public class ToolException extends RuntimeException {

    private final String code;
    private final String toolName;

    /**
     * 构造工具异常
     *
     * @param code     错误码
     * @param toolName 工具名
     * @param message  说明
     */
    public ToolException(String code, String toolName, String message) {
        super(message);
        this.code = code;
        this.toolName = toolName;
    }

    /**
     * 错误码
     *
     * @return 错误码
     */
    public String getCode() {
        return code;
    }

    /**
     * 工具名
     *
     * @return 工具名
     */
    public String getToolName() {
        return toolName;
    }
}
