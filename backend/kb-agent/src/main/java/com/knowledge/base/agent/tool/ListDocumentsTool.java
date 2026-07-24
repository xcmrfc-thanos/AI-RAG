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
 * 按当前用户可见范围列出文档
 */
@Component
@RequiredArgsConstructor
public class ListDocumentsTool implements AgentTool {

    private static final Set<String> SORT_FIELDS = Set.of(
            "publishTime", "createdAt", "viewCount", "likeCount");
    private final GatewayToolHttpClient httpClient;

    /**
     * name 方法。
     */
    @Override
    public String name() {
        return "list_documents";
    }

    @Override
    public Map<String, Object> execute(Map<String, Object> input, ToolContext context) {
        Map<String, Object> source = input != null ? input : Map.of();
        LinkedHashMap<String, Object> query = new LinkedHashMap<>();
        query.put("current", 1);
        query.put("size", ToolInputSupport.integer(source.get("size"), 10, 1, 20, "size", name()));
        putText(query, "keyword", source.get("keyword"), 200);
        putPositiveLong(query, "categoryId", source.get("categoryId"));
        putPositiveLong(query, "teamId", source.get("teamId"));
        putStatus(query, source.get("status"));
        putSort(query, source.get("sortBy"), source.get("sortOrder"));

        JsonNode data = httpClient.get("/api/document/documents/page", query, context, name()).path("data");
        List<Map<String, Object>> documents = normalizeDocuments(data.path("records"));
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("documents", documents);
        out.put("total", data.path("total").asLong(documents.size()));
        out.put("count", documents.size());
        out.put("untrustedCorpus", UntrustedDataWrapper.wrap(toCorpus(documents)));
        return out;
    }

    private void putText(Map<String, Object> query, String field, Object value, int max) {
        String text = ToolInputSupport.text(value, max, field, name());
        if (text != null) {
            query.put(field, text);
        }
    }

    private void putPositiveLong(Map<String, Object> query, String field, Object value) {
        Long parsed = ToolInputSupport.positiveLong(value, field, name());
        if (parsed != null) {
            query.put(field, parsed);
        }
    }

    private void putStatus(Map<String, Object> query, Object value) {
        if (value != null) {
            query.put("status", ToolInputSupport.integer(value, 0, 0, 9, "status", name()));
        }
    }

    private void putSort(Map<String, Object> query, Object sortByValue, Object sortOrderValue) {
        String sortBy = ToolInputSupport.text(sortByValue, 32, "sortBy", name());
        if (sortBy == null) {
            return;
        }
        if (!SORT_FIELDS.contains(sortBy)) {
            throw new ToolException("INVALID_ARGUMENT", name(), "sortBy 不在允许范围");
        }
        String order = ToolInputSupport.text(sortOrderValue, 4, "sortOrder", name());
        order = order == null ? "desc" : order.toLowerCase();
        if (!"asc".equals(order) && !"desc".equals(order)) {
            throw new ToolException("INVALID_ARGUMENT", name(), "sortOrder 仅允许 asc|desc");
        }
        query.put("sortBy", sortBy);
        query.put("sortOrder", order);
    }

    private List<Map<String, Object>> normalizeDocuments(JsonNode records) {
        List<Map<String, Object>> result = new ArrayList<>();
        if (!records.isArray()) {
            return result;
        }
        for (JsonNode item : records) {
            Map<String, Object> doc = new LinkedHashMap<>();
            copy(doc, item, "id", true);
            copy(doc, item, "title", false);
            copy(doc, item, "summary", false);
            copy(doc, item, "categoryId", true);
            copy(doc, item, "categoryName", false);
            copy(doc, item, "authorId", true);
            copy(doc, item, "authorName", false);
            copy(doc, item, "publishTime", false);
            result.add(doc);
        }
        return result;
    }

    private void copy(Map<String, Object> target, JsonNode source, String field, boolean number) {
        JsonNode value = source.path(field);
        if (!value.isMissingNode() && !value.isNull()) {
            target.put(field, number && value.isNumber() ? value.asLong() : value.asText(""));
        }
    }

    private String toCorpus(List<Map<String, Object>> documents) {
        StringBuilder corpus = new StringBuilder();
        for (Map<String, Object> doc : documents) {
            corpus.append(doc.getOrDefault("title", "")).append('\n')
                    .append(doc.getOrDefault("summary", "")).append("\n\n");
        }
        return corpus.toString();
    }
}
