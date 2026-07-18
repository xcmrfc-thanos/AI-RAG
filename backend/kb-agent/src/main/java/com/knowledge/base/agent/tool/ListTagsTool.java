package com.knowledge.base.agent.tool;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 读取热门标签或指定分类标签
 */
@Component
@RequiredArgsConstructor
public class ListTagsTool implements AgentTool {

    private final GatewayToolHttpClient httpClient;

    @Override
    public String name() {
        return "list_tags";
    }

    @Override
    public Map<String, Object> execute(Map<String, Object> input, ToolContext context) {
        Map<String, Object> source = input != null ? input : Map.of();
        Long categoryId = ToolInputSupport.positiveLong(source.get("categoryId"), "categoryId", name());
        int limit = ToolInputSupport.integer(source.get("limit"), 10, 1, 50, "limit", name());
        JsonNode response;
        if (categoryId != null) {
            response = httpClient.get("/api/document/api/tags/category/" + categoryId, context, name());
        } else {
            response = httpClient.get("/api/document/api/tags/hot",
                    Map.of("limit", limit), context, name());
        }
        List<Map<String, Object>> tags = normalize(response.path("data"));
        return Map.of("tags", tags, "count", tags.size());
    }

    private List<Map<String, Object>> normalize(JsonNode items) {
        List<Map<String, Object>> result = new ArrayList<>();
        if (!items.isArray()) {
            return result;
        }
        for (JsonNode item : items) {
            Map<String, Object> tag = new LinkedHashMap<>();
            tag.put("id", item.path("id").asLong());
            tag.put("tagName", item.path("tagName").asText(""));
            tag.put("tagCode", item.path("tagCode").asText(""));
            if (!item.path("categoryId").isNull() && !item.path("categoryId").isMissingNode()) {
                tag.put("categoryId", item.path("categoryId").asLong());
            }
            tag.put("categoryName", item.path("categoryName").asText(""));
            tag.put("docCount", item.path("docCount").asInt(0));
            result.add(tag);
        }
        return result;
    }
}
