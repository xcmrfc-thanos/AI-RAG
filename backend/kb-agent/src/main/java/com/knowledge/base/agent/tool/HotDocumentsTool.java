package com.knowledge.base.agent.tool;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 热门文档 Tool：统计超采后经 get_document ACL 过滤
 */
@Component
@RequiredArgsConstructor
public class HotDocumentsTool implements AgentTool {

    private static final Set<String> HOT_TYPES = Set.of("composite", "view", "like", "favorite");

    private final GatewayToolHttpClient httpClient;

    @Override
    public String name() {
        return "hot_documents";
    }

    @Override
    public Map<String, Object> execute(Map<String, Object> input, ToolContext context) {
        Map<String, Object> source = input != null ? input : Map.of();
        int size = ToolInputSupport.integer(source.get("size"), 6, 1, 20, "size", name());
        String type = ToolInputSupport.text(source.get("type"), 16, "type", name());
        if (type == null) {
            type = "composite";
        }
        if (!HOT_TYPES.contains(type)) {
            throw new ToolException("INVALID_ARGUMENT", name(), "type 仅允许 composite|view|like|favorite");
        }

        int fetch = Math.min(30, Math.max(size * 3, size));
        Map<String, Object> query = new LinkedHashMap<>();
        query.put("type", type);
        query.put("size", fetch);

        JsonNode data = httpClient.get("/api/statistics/hot/document", query, context, name()).path("data");
        DocumentVisibilityProbe probe = new DocumentVisibilityProbe(httpClient, context, name());
        List<Map<String, Object>> documents = filterByAcl(data, probe, size);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("documents", documents);
        out.put("count", documents.size());
        out.put("type", type);
        out.put("untrustedCorpus", UntrustedDataWrapper.wrap(toCorpus(documents)));
        return out;
    }

    /**
     * 按 ACL 过滤统计结果并截断到 size
     */
    static List<Map<String, Object>> filterByAcl(JsonNode data, DocumentVisibilityProbe probe, int size) {
        List<Map<String, Object>> result = new ArrayList<>();
        if (data == null || !data.isArray()) {
            return result;
        }
        for (JsonNode item : data) {
            if (result.size() >= size) {
                break;
            }
            Long id = readDocumentId(item);
            if (id == null || !probe.isReadable(id)) {
                continue;
            }
            Map<String, Object> doc = new LinkedHashMap<>();
            doc.put("documentId", id);
            copyText(doc, item, "title");
            copyText(doc, item, "summary");
            copyText(doc, item, "authorName");
            copyText(doc, item, "categoryName");
            copyNumber(doc, item, "viewCount");
            copyNumber(doc, item, "likeCount");
            copyNumber(doc, item, "favoriteCount");
            copyNumber(doc, item, "statisticsValue");
            result.add(doc);
        }
        return result;
    }

    private static Long readDocumentId(JsonNode item) {
        JsonNode n = item.path("documentId");
        if (n.isMissingNode() || n.isNull()) {
            n = item.path("id");
        }
        if (n.isNumber()) {
            return n.asLong();
        }
        if (n.isTextual()) {
            try {
                return Long.parseLong(n.asText().trim());
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    private static void copyText(Map<String, Object> target, JsonNode source, String field) {
        JsonNode value = source.path(field);
        if (!value.isMissingNode() && !value.isNull() && value.isTextual()) {
            target.put(field, value.asText(""));
        }
    }

    private static void copyNumber(Map<String, Object> target, JsonNode source, String field) {
        JsonNode value = source.path(field);
        if (!value.isMissingNode() && !value.isNull() && value.isNumber()) {
            target.put(field, value.asLong());
        }
    }

    private static String toCorpus(List<Map<String, Object>> documents) {
        StringBuilder corpus = new StringBuilder();
        for (Map<String, Object> doc : documents) {
            corpus.append(doc.getOrDefault("title", "")).append('\n')
                    .append(doc.getOrDefault("summary", "")).append("\n\n");
        }
        return corpus.toString();
    }
}
