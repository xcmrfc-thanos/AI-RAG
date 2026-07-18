package com.knowledge.base.agent.engine;

/**
 * 工作流边（可选 when：条件节点出边为 true|false）
 *
 * @param from 起点节点 id
 * @param to   终点节点 id
 * @param when 条件标签，可空；条件节点出边必须为 true/false
 * @author AI-RAG
 * @since 1.0.0
 */
public record WorkflowEdge(String from, String to, String when) {

    /**
     * 无条件边（线性链）
     *
     * @param from 起点
     * @param to   终点
     */
    public WorkflowEdge(String from, String to) {
        this(from, to, null);
    }
}
