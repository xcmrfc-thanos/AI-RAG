package com.knowledge.base.agent.engine;

/**
 * 工作流校验 / 变量解析错误
 *
 * @author AI-RAG
 * @since 1.0.0
 */
public class ValidationException extends RuntimeException {

    private final String code;

    /**
     * 构造校验异常
     *
     * @param code    错误码
     * @param message 说明
     */
    public ValidationException(String code, String message) {
        super(message);
        this.code = code;
    }

    /**
     * 错误码
     *
     * @return 错误码
     */
    public String getCode() {
        return code;
    }
}
