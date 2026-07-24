package com.knowledge.base.agent.tool;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 读取文档分类树
 */
@Component
@RequiredArgsConstructor
public class ListCategoriesTool implements AgentTool {

    private final GatewayToolHttpClient httpClient;

    /**
     * name 方法。
     */
    @Override
    public String name() {
        return "list_categories";
    }

    @Override
    public Map<String, Object> execute(Map<String, Object> input, ToolContext context) {
        JsonNode data = httpClient.get("/api/document/categories/tree", context, name()).path("data");
        List<Map<String, Object>> tree = normalizeList(data);
        List<Map<String, Object>> flat = new ArrayList<>();
        flatten(tree, flat);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("categories", tree);
        out.put("flatCategories", flat);
        out.put("count", flat.size());
        return out;
    }

    private List<Map<String, Object>> normalizeList(JsonNode items) {
        List<Map<String, Object>> result = new ArrayList<>();
        if (!items.isArray()) {
            return result;
        }
        for (JsonNode item : items) {
            Map<String, Object> category = new LinkedHashMap<>();
            category.put("id", item.path("id").asLong());
            category.put("name", item.path("name").asText(""));
            category.put("description", item.path("description").asText(""));
            if (!item.path("parentId").isNull() && !item.path("parentId").isMissingNode()) {
                category.put("parentId", item.path("parentId").asLong());
            }
            category.put("documentCount", item.path("documentCount").asLong(0));
            category.put("children", normalizeList(item.path("children")));
            result.add(category);
        }
        return result;
    }

    @SuppressWarnings("unchecked")
    private void flatten(List<Map<String, Object>> source, List<Map<String, Object>> target) {
        for (Map<String, Object> category : source) {
            Map<String, Object> item = new LinkedHashMap<>(category);
            Object children = item.remove("children");
            target.add(item);
            if (children instanceof List<?> list) {
                flatten((List<Map<String, Object>>) list, target);
            }
        }
    }
}
