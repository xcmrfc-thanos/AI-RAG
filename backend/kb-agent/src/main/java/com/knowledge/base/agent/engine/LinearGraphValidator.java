package com.knowledge.base.agent.engine;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * 工作流图校验：线性链 + 条件二分支（须汇合到单终点）
 *
 * @author AI-RAG
 * @since 1.0.0
 */
public final class LinearGraphValidator {

    private LinearGraphValidator() {
    }

    /**
     * 校验并返回拓扑序（含未执行分支节点，仅用于结构校验）
     *
     * @param definition 工作流定义
     * @return 拓扑序节点
     */
    public static List<WorkflowNode> validateAndOrder(WorkflowDefinition definition) {
        Map<String, WorkflowNode> nodeMap = definition.nodeMap();
        Map<String, List<WorkflowEdge>> outs = new HashMap<>();
        Map<String, Integer> inDeg = new HashMap<>();
        Map<String, Integer> outDeg = new HashMap<>();
        for (String id : nodeMap.keySet()) {
            outs.put(id, new ArrayList<>());
            inDeg.put(id, 0);
            outDeg.put(id, 0);
        }
        for (WorkflowEdge e : definition.getEdges()) {
            if (!nodeMap.containsKey(e.from()) || !nodeMap.containsKey(e.to())) {
                throw new ValidationException("INVALID_GRAPH",
                        "edges 引用不存在的节点: " + e.from() + " -> " + e.to());
            }
            outs.get(e.from()).add(e);
            outDeg.merge(e.from(), 1, Integer::sum);
            inDeg.merge(e.to(), 1, Integer::sum);
        }

        for (WorkflowNode node : nodeMap.values()) {
            String id = node.getId();
            int out = outDeg.get(id);
            if ("condition".equals(node.getType())) {
                if (out != 2) {
                    throw new ValidationException("INVALID_GRAPH",
                            "条件节点必须恰好两条出边(true/false): " + id);
                }
                Set<String> whens = new HashSet<>();
                for (WorkflowEdge edge : outs.get(id)) {
                    String when = normalizeWhen(edge.when());
                    if (!"true".equals(when) && !"false".equals(when)) {
                        throw new ValidationException("INVALID_GRAPH",
                                "条件节点出边 when 必须为 true|false: " + id);
                    }
                    if (!whens.add(when)) {
                        throw new ValidationException("INVALID_GRAPH",
                                "条件节点出边 when 重复: " + id + "/" + when);
                    }
                }
            } else if (out > 1) {
                throw new ValidationException("INVALID_GRAPH",
                        "存在并行分支（非条件节点出度>1）: " + id);
            } else if (out == 1) {
                WorkflowEdge only = outs.get(id).get(0);
                if (only.when() != null && !only.when().isBlank()) {
                    throw new ValidationException("INVALID_GRAPH",
                            "非条件节点出边不能带 when: " + id);
                }
            }
        }

        List<String> starts = new ArrayList<>();
        List<String> ends = new ArrayList<>();
        for (String id : nodeMap.keySet()) {
            if (inDeg.get(id) == 0) {
                starts.add(id);
            }
            if (outDeg.get(id) == 0) {
                ends.add(id);
            }
        }
        if (nodeMap.size() == 1) {
            return List.of(nodeMap.values().iterator().next());
        }
        if (starts.size() != 1 || ends.size() != 1) {
            throw new ValidationException("INVALID_GRAPH",
                    "图必须恰好一个起点和一个终点（条件分支需汇合）");
        }
        for (String id : nodeMap.keySet()) {
            if (inDeg.get(id) == 0 && outDeg.get(id) == 0) {
                throw new ValidationException("INVALID_GRAPH", "存在孤立节点: " + id);
            }
        }

        Set<String> reachable = new HashSet<>();
        ArrayDeque<String> queue = new ArrayDeque<>();
        queue.add(starts.get(0));
        while (!queue.isEmpty()) {
            String cur = queue.removeFirst();
            if (!reachable.add(cur)) {
                continue;
            }
            for (WorkflowEdge e : outs.get(cur)) {
                queue.add(e.to());
            }
        }
        if (reachable.size() != nodeMap.size()) {
            throw new ValidationException("INVALID_GRAPH", "图不连通或存在不可达节点");
        }

        Map<String, Integer> visit = new HashMap<>();
        for (String id : nodeMap.keySet()) {
            visit.put(id, 0);
        }
        if (dfsCycle(starts.get(0), outs, visit)) {
            throw new ValidationException("INVALID_GRAPH", "存在环");
        }

        return topologicalOrder(nodeMap, outs, inDeg);
    }

    /**
     * 取节点出边
     *
     * @param definition 定义
     * @param nodeId     节点
     * @return 出边列表
     */
    public static List<WorkflowEdge> outgoing(WorkflowDefinition definition, String nodeId) {
        List<WorkflowEdge> list = new ArrayList<>();
        for (WorkflowEdge e : definition.getEdges()) {
            if (e.from().equals(nodeId)) {
                list.add(e);
            }
        }
        return list;
    }

    /**
     * 唯一起点
     *
     * @param definition 定义
     * @return 起点 id
     */
    public static String startNodeId(WorkflowDefinition definition) {
        Map<String, Integer> inDeg = new HashMap<>();
        for (WorkflowNode n : definition.getNodes()) {
            inDeg.put(n.getId(), 0);
        }
        for (WorkflowEdge e : definition.getEdges()) {
            inDeg.merge(e.to(), 1, Integer::sum);
        }
        List<String> starts = inDeg.entrySet().stream()
                .filter(e -> e.getValue() == 0)
                .map(Map.Entry::getKey)
                .toList();
        if (starts.size() != 1) {
            throw new ValidationException("INVALID_GRAPH", "图必须恰好一个起点");
        }
        return starts.get(0);
    }

    private static String normalizeWhen(String when) {
        if (when == null) {
            return "";
        }
        return when.trim().toLowerCase(Locale.ROOT);
    }

    private static boolean dfsCycle(String cur,
                                    Map<String, List<WorkflowEdge>> outs,
                                    Map<String, Integer> state) {
        state.put(cur, 1);
        for (WorkflowEdge e : outs.getOrDefault(cur, List.of())) {
            int st = state.getOrDefault(e.to(), 0);
            if (st == 1) {
                return true;
            }
            if (st == 0 && dfsCycle(e.to(), outs, state)) {
                return true;
            }
        }
        state.put(cur, 2);
        return false;
    }

    private static List<WorkflowNode> topologicalOrder(Map<String, WorkflowNode> nodeMap,
                                                       Map<String, List<WorkflowEdge>> outs,
                                                       Map<String, Integer> inDeg) {
        Map<String, Integer> deg = new HashMap<>(inDeg);
        ArrayDeque<String> queue = new ArrayDeque<>();
        for (Map.Entry<String, Integer> e : deg.entrySet()) {
            if (e.getValue() == 0) {
                queue.add(e.getKey());
            }
        }
        List<WorkflowNode> ordered = new ArrayList<>();
        while (!queue.isEmpty()) {
            String cur = queue.removeFirst();
            ordered.add(nodeMap.get(cur));
            for (WorkflowEdge edge : outs.get(cur)) {
                int d = deg.merge(edge.to(), -1, Integer::sum);
                if (d == 0) {
                    queue.add(edge.to());
                }
            }
        }
        if (ordered.size() != nodeMap.size()) {
            throw new ValidationException("INVALID_GRAPH", "存在环");
        }
        return ordered;
    }
}
