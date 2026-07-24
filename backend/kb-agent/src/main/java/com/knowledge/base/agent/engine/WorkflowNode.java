package com.knowledge.base.agent.engine;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * 工作流节点
 *
 * @author AI-RAG
 * @since 1.0.0
 */
public class WorkflowNode {

    private static final Set<String> ALLOWED_TOOLS = Set.of(
            "hybrid_search",
            "get_document",
            "list_documents",
            "list_categories",
            "list_tags",
            "hot_documents",
            "latest_documents",
            "graph_search",
            "text_template");

    private final String id;
    private final String type;
    private final String tool;
    private final Map<String, Object> input;

    /**
     * 构造节点
     *
     * @param id    节点 id
     * @param type  tool|llm|condition
     * @param tool  工具名（tool 节点）
     * @param input 输入模板
     */
    public WorkflowNode(String id, String type, String tool, Map<String, Object> input) {
        this.id = id;
        this.type = type;
        this.tool = tool;
        this.input = input;
    }

    /**
     * 获取Id。
     */
    public String getId() {
        return id;
    }

    /**
     * 获取Type。
     */
    public String getType() {
        return type;
    }

    /**
     * 获取Tool。
     */
    public String getTool() {
        return tool;
    }

    public Map<String, Object> getInput() {
        return input;
    }

    /**
     * 解析单个节点
     *
     * @param n JSON
     * @return 节点
     */
    /**
     * parse 方法。
     */
    @SuppressWarnings("unchecked")
    public static WorkflowNode parse(JsonNode n) {
        String id = n.path("id").asText("");
        if (!id.matches("^[a-zA-Z][a-zA-Z0-9_]*$")) {
            throw new ValidationException("INVALID_SCHEMA", "非法节点 id: " + id);
        }
        String type = n.path("type").asText("");
        if (!"tool".equals(type) && !"llm".equals(type) && !"condition".equals(type)) {
            throw new ValidationException("INVALID_SCHEMA", "节点类型仅允许 tool|llm|condition");
        }
        ObjectMapper mapper = new ObjectMapper();
        Map<String, Object> input = new LinkedHashMap<>();
        if (n.has("input") && n.get("input").isObject()) {
            input = mapper.convertValue(n.get("input"), Map.class);
        }
        String tool = null;
        if ("tool".equals(type)) {
            tool = n.path("tool").asText("");
            if (!ALLOWED_TOOLS.contains(tool)) {
                throw new ValidationException("INVALID_SCHEMA", "工具不在白名单: " + tool);
            }
            if (input == null) {
                throw new ValidationException("INVALID_SCHEMA", "tool 节点 input 必填");
            }
        } else if ("llm".equals(type)) {
            if (input == null || !(input.get("prompt") instanceof String prompt) || prompt.isBlank()) {
                throw new ValidationException("INVALID_SCHEMA", "llm 节点 input.prompt 必填");
            }
        } else {
            if (input == null || !(input.get("expression") instanceof String expr) || expr.isBlank()) {
                throw new ValidationException("INVALID_SCHEMA", "condition 节点 input.expression 必填");
            }
        }
        return new WorkflowNode(id, type, tool, input != null ? input : Map.of());
    }
}
