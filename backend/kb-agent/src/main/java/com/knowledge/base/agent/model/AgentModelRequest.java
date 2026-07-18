package com.knowledge.base.agent.model;

/**
 * Agent LLM 请求
 *
 * @param systemPrompt 系统指令（可信）
 * @param userPrompt   用户/模板展开后的提示（可含不可信资料）
 * @param modelKey     可选覆盖模型键：qwen / deepseek；空则用默认
 * @author AI-RAG
 * @since 1.0.0
 */
public record AgentModelRequest(String systemPrompt, String userPrompt, String modelKey) {
}
