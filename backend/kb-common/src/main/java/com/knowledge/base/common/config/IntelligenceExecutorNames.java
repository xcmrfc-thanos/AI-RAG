package com.knowledge.base.common.config;

/**
 * Intelligence BC 专用线程池 Bean 名称常量（搜索 / RAG / 图谱构建分池）。
 *
 * @author knowledge-base-team
 * @since 1.0.0
 */
public final class IntelligenceExecutorNames {

    /** 全文/混合搜索与搜索历史异步写入 */
    public static final String SEARCH = "searchTaskExecutor";

    /** RAG 检索、对话流式输出、向量混合检索、RAG 重建索引 */
    public static final String RAG = "ragTaskExecutor";

    /** KAG 图谱构建（LLM 抽取 + Neo4j 写入） */
    public static final String GRAPH = "graphTaskExecutor";

    private IntelligenceExecutorNames() {
    }
}
