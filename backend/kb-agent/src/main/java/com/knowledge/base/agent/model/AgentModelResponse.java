package com.knowledge.base.agent.model;

/**
 * Agent LLM 响应
 *
 * @param text     生成文本
 * @param modelUsed 实际使用的模型标识
 * @param stub     是否 Stub
 * @author AI-RAG
 * @since 1.0.0
 */
public record AgentModelResponse(String text, String modelUsed, boolean stub) {
}
