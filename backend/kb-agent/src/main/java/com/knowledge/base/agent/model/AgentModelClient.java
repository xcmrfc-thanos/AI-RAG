package com.knowledge.base.agent.model;

/**
 * Agent 模型客户端 Port（不依赖 kb-intelligence-llm 实现类）
 *
 * @author AI-RAG
 * @since 1.0.0
 */
public interface AgentModelClient {

    /**
     * 完成一次 LLM 生成
     *
     * @param request 生成请求
     * @return 模型文本输出
     */
    AgentModelResponse complete(AgentModelRequest request);
}
