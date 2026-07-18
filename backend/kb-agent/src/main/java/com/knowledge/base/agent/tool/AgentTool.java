package com.knowledge.base.agent.tool;

import java.util.Map;

/**
 * Agent 工具接口（任务 66）
 *
 * @author AI-RAG
 * @since 1.0.0
 */
public interface AgentTool {

    /**
     * 工具名（工作流 JSON 中的 tool 字段）
     *
     * @return 工具名
     */
    String name();

    /**
     * 执行工具
     *
     * @param input   节点 input（已做变量展开后的原始 map）
     * @param context 运行上下文（含用户 Token）
     * @return 成功输出快照；失败抛 {@link ToolException}
     */
    Map<String, Object> execute(Map<String, Object> input, ToolContext context);
}
