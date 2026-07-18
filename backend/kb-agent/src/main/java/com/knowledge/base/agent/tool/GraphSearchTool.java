package com.knowledge.base.agent.tool;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 知识图谱只读搜索 Tool：图谱命中后按关联 documentId 做 ACL 过滤
 *
 * <p>无 documentId 的实体节点：拉取邻域关系，若任一关联文档可读则保留。</p>
 */
@Component
@RequiredArgsConstructor
public class GraphSearchTool implements AgentTool {

    private final GatewayToolHttpClient httpClient;

    @Override
    public String name() {
        return "graph_search";
    }

    @Override
    public Map<String, Object> execute(Map<String, Object> input, ToolContext context) {
        Map<String, Object> source = input != null ? input : Map.of();
        String keyword = ToolInputSupport.text(source.get("keyword"), 100, "keyword", name());
        if (keyword == null) {
            keyword = ToolInputSupport.text(source.get("query"), 100, "query", name());
        }
        if (keyword == null) {
            throw new ToolException("INVALID_ARGUMENT", name(), "keyword 或 query 必填");
        }
        int limit = ToolInputSupport.integer(source.get("limit"), 10, 1, 30, "limit", name());

        Map<String, Object> query = new LinkedHashMap<>();
        query.put("keyword", keyword);
        JsonNode data = httpClient.get("/api/graph/search", query, context, name()).path("data");

        DocumentVisibilityProbe probe = new DocumentVisibilityProbe(httpClient, context, name());
        List<Map<String, Object>> nodes = new ArrayList<>();
        if (data != null && data.isArray()) {
            for (JsonNode item : data) {
                if (nodes.size() >= limit) {
                    break;
                }
                if (!isNodeVisible(item, probe, context)) {
                    continue;
                }
                nodes.add(normalizeNode(item));
            }
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("nodes", nodes);
        out.put("count", nodes.size());
        out.put("keyword", keyword);
        out.put("untrustedCorpus", UntrustedDataWrapper.wrap(toCorpus(nodes)));
        return out;
    }

    /**
     * 节点可见性：自带 documentId 直接探针；否则查邻域文档
     */
    private boolean isNodeVisible(JsonNode item, DocumentVisibilityProbe probe, ToolContext context) {
        Long docId = readDocumentId(item);
        if (docId != null) {
            return probe.isReadable(docId);
        }
        String nodeId = item.path("id").asText(null);
        if (!StringUtils.hasText(nodeId)) {
            return false;
        }
        try {
            JsonNode relations = httpClient.get(
                    "/api/graph/node/" + nodeId + "/relations", context, name()).path("data");
            if (relations == null || !relations.isArray()) {
                return false;
            }
            int checked = 0;
            for (JsonNode rel : relations) {
                if (checked >= 8) {
                    break;
                }
                Long relatedDoc = readDocumentId(rel.path("targetNode"));
                if (relatedDoc == null) {
                    relatedDoc = readDocumentId(rel.path("sourceNode"));
                }
                if (relatedDoc == null) {
                    relatedDoc = readDocumentId(rel);
                }
                if (relatedDoc != null) {
                    checked++;
                    if (probe.isReadable(relatedDoc)) {
                        return true;
                    }
                }
            }
        } catch (ToolException e) {
            return false;
        }
        return false;
    }

    private static Map<String, Object> normalizeNode(JsonNode item) {
        Map<String, Object> node = new LinkedHashMap<>();
        copyText(node, item, "id");
        copyText(node, item, "name");
        copyText(node, item, "type");
        copyText(node, item, "label");
        Long docId = readDocumentId(item);
        if (docId != null) {
            node.put("documentId", docId);
        }
        return node;
    }

    private static Long readDocumentId(JsonNode item) {
        if (item == null || item.isMissingNode() || item.isNull()) {
            return null;
        }
        JsonNode n = item.path("documentId");
        if (n.isMissingNode() || n.isNull()) {
            n = item.path("docId");
        }
        if (n.isNumber()) {
            return n.asLong();
        }
        if (n.isTextual() && StringUtils.hasText(n.asText())) {
            try {
                return Long.parseLong(n.asText().trim());
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        JsonNode props = item.path("properties");
        if (props.isObject()) {
            JsonNode p = props.path("docId");
            if (p.isNumber()) {
                return p.asLong();
            }
            if (p.isTextual()) {
                try {
                    return Long.parseLong(p.asText().trim());
                } catch (NumberFormatException ignored) {
                    return null;
                }
            }
        }
        return null;
    }

    private static void copyText(Map<String, Object> target, JsonNode source, String field) {
        JsonNode value = source.path(field);
        if (!value.isMissingNode() && !value.isNull()) {
            target.put(field, value.asText(""));
        }
    }

    private static String toCorpus(List<Map<String, Object>> nodes) {
        StringBuilder corpus = new StringBuilder();
        for (Map<String, Object> node : nodes) {
            corpus.append(node.getOrDefault("type", "")).append(':')
                    .append(node.getOrDefault("name", "")).append('\n');
        }
        return corpus.toString();
    }
}
