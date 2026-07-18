package com.knowledge.base.agent.tool;

import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Agent 工具注册表（仅注册产品白名单内的 Spring Tool）
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Component
public class AgentToolRegistry {

    private final Map<String, AgentTool> tools = new LinkedHashMap<>();

    /**
     * 注册 Spring 注入的全部工具
     *
     * @param toolList 工具列表
     */
    public AgentToolRegistry(List<AgentTool> toolList) {
        if (toolList != null) {
            for (AgentTool tool : toolList) {
                tools.put(tool.name(), tool);
            }
        }
    }

    /**
     * 按名获取工具
     *
     * @param name 工具名
     * @return 工具
     */
    public AgentTool require(String name) {
        AgentTool tool = tools.get(name);
        if (tool == null) {
            throw new ToolException("UNKNOWN_TOOL", name, "未注册的工具: " + name);
        }
        return tool;
    }

    /**
     * 已注册工具名
     *
     * @return 名称集合
     */
    public Collection<String> names() {
        return tools.keySet();
    }

    /**
     * 是否已注册
     *
     * @param name 工具名
     * @return 是否存在
     */
    public boolean has(String name) {
        return tools.containsKey(name);
    }
}
