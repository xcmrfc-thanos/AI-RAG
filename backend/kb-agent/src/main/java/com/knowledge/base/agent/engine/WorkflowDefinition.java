package com.knowledge.base.agent.engine;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 工作流定义解析结果
 *
 * @author AI-RAG
 * @since 1.0.0
 */
public class WorkflowDefinition {

    private final int schemaVersion;
    private final String name;
    private final List<WorkflowNode> nodes;
    private final List<WorkflowEdge> edges;

    /**
     * 构造定义
     *
     * @param schemaVersion schema 版本
     * @param name          名称
     * @param nodes         节点
     * @param edges         边
     */
    public WorkflowDefinition(int schemaVersion, String name,
                              List<WorkflowNode> nodes, List<WorkflowEdge> edges) {
        this.schemaVersion = schemaVersion;
        this.name = name;
        this.nodes = List.copyOf(nodes);
        this.edges = List.copyOf(edges);
    }

    /**
     * 获取SchemaVersion。
     */
    public int getSchemaVersion() {
        return schemaVersion;
    }

    /**
     * 获取Name。
     */
    public String getName() {
        return name;
    }

    /**
     * 获取Nodes。
     */
    public List<WorkflowNode> getNodes() {
        return nodes;
    }

    /**
     * 获取Edges。
     */
    public List<WorkflowEdge> getEdges() {
        return edges;
    }

    /**
     * 从 JSON 树解析（不做图合法性校验）
     *
     * @param root JSON 根
     * @return 定义
     */
    public static WorkflowDefinition parse(JsonNode root) {
        if (root == null || !root.isObject()) {
            throw new ValidationException("INVALID_SCHEMA", "工作流 JSON 必须为对象");
        }
        if (!root.has("schemaVersion") || root.get("schemaVersion").asInt() != 1) {
            throw new ValidationException("INVALID_SCHEMA", "schemaVersion 必须为 1");
        }
        String name = root.path("name").asText("");
        if (name.isBlank() || name.length() > 128) {
            throw new ValidationException("INVALID_SCHEMA", "name 须为 1～128 字符");
        }
        JsonNode nodesNode = root.get("nodes");
        if (nodesNode == null || !nodesNode.isArray() || nodesNode.isEmpty()) {
            throw new ValidationException("INVALID_SCHEMA", "nodes 不能为空");
        }
        if (nodesNode.size() > 12) {
            throw new ValidationException("INVALID_GRAPH", "节点数不能超过 12");
        }
        List<WorkflowNode> nodes = new ArrayList<>();
        for (JsonNode n : nodesNode) {
            nodes.add(WorkflowNode.parse(n));
        }
        List<WorkflowEdge> edges = new ArrayList<>();
        JsonNode edgesNode = root.path("edges");
        if (edgesNode.isArray()) {
            for (JsonNode e : edgesNode) {
                String from = e.path("from").asText("");
                String to = e.path("to").asText("");
                if (from.isBlank() || to.isBlank()) {
                    throw new ValidationException("INVALID_GRAPH", "edge.from/to 不能为空");
                }
                String when = e.has("when") && !e.path("when").isNull()
                        ? e.path("when").asText(null) : null;
                if (when != null && when.isBlank()) {
                    when = null;
                }
                edges.add(new WorkflowEdge(from, to, when));
            }
        }
        return new WorkflowDefinition(1, name, nodes, edges);
    }

    /**
     * 节点 id → 节点
     *
     * @return map
     */
    public Map<String, WorkflowNode> nodeMap() {
        Map<String, WorkflowNode> map = new LinkedHashMap<>();
        for (WorkflowNode n : nodes) {
            if (map.put(n.getId(), n) != null) {
                throw new ValidationException("INVALID_GRAPH", "节点 id 重复: " + n.getId());
            }
        }
        return map;
    }
}
