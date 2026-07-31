package com.knowledge.base.mcp.tool;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * hybrid_search：经 Gateway POST /api/search
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Component
@RequiredArgsConstructor
public class HybridSearchMcpTool implements McpTool {

    private final GatewayMcpHttpClient httpClient;

    /**
     * {@inheritDoc}
     */
    @Override
    public String name() {
        return "hybrid_search";
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public String description() {
        return "按用户 ACL 混合检索企业知识库文档（只读）";
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public Map<String, Object> inputSchema() {
        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("type", "object");
        Map<String, Object> props = new LinkedHashMap<>();
        props.put("query", Map.of("type", "string", "description", "检索词，1～1000 字符"));
        props.put("mode", Map.of("type", "string", "enum", List.of("keyword", "hybrid"), "default", "hybrid"));
        props.put("topK", Map.of("type", "integer", "minimum", 1, "maximum", 20, "default", 5));
        schema.put("properties", props);
        schema.put("required", List.of("query"));
        return schema;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public Map<String, Object> execute(Map<String, Object> input, McpToolContext context) {
        String query = asString(input != null ? input.get("query") : null);
        if (!StringUtils.hasText(query) || query.length() > 1000) {
            throw new McpToolException("INVALID_ARGUMENT", name(), "query 须为 1～1000 字符");
        }
        String mode = asString(input.get("mode"));
        if (!StringUtils.hasText(mode)) {
            mode = "hybrid";
        }
        if (!"keyword".equals(mode) && !"hybrid".equals(mode)) {
            throw new McpToolException("INVALID_ARGUMENT", name(), "mode 仅允许 keyword|hybrid");
        }
        int topK = asInt(input.get("topK"), 5);
        if (topK < 1 || topK > 20) {
            throw new McpToolException("INVALID_ARGUMENT", name(), "topK 须为 1～20");
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("keyword", query);
        body.put("searchMode", mode);
        body.put("topK", topK);
        body.put("current", 1);
        body.put("size", topK);

        JsonNode resp = httpClient.postJson("/api/search", body, context, name());
        JsonNode data = resp.path("data");
        List<Map<String, Object>> hits = new ArrayList<>();
        JsonNode records = data.path("records");
        if (!records.isArray()) {
            records = data.path("list");
        }
        if (records.isArray()) {
            for (JsonNode item : records) {
                Map<String, Object> hit = new LinkedHashMap<>();
                hit.put("documentId", textOrLong(item, "id"));
                hit.put("title", item.path("title").asText(""));
                String summary = item.path("summary").asText("");
                if (!StringUtils.hasText(summary)) {
                    summary = item.path("highlight").asText("");
                }
                if (summary.length() > 500) {
                    summary = summary.substring(0, 500);
                }
                hit.put("summary", summary);
                if (item.has("score") && item.get("score").isNumber()) {
                    hit.put("score", item.get("score").asDouble());
                }
                hits.add(hit);
            }
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("query", query);
        out.put("mode", mode);
        out.put("topK", topK);
        out.put("hits", hits);
        out.put("hitCount", hits.size());
        return out;
    }

    /**
     * 转字符串
     *
     * @param v 原值
     * @return 文本
     */
    private String asString(Object v) {
        return v == null ? null : String.valueOf(v).trim();
    }

    /**
     * 转整数
     *
     * @param v   原值
     * @param def 默认
     * @return int
     */
    private int asInt(Object v, int def) {
        if (v == null) {
            return def;
        }
        if (v instanceof Number n) {
            return n.intValue();
        }
        try {
            return Integer.parseInt(String.valueOf(v).trim());
        } catch (NumberFormatException e) {
            throw new McpToolException("INVALID_ARGUMENT", name(), "topK 须为整数");
        }
    }

    /**
     * 字段转 documentId
     *
     * @param item  JSON
     * @param field 字段名
     * @return id
     */
    private Object textOrLong(JsonNode item, String field) {
        JsonNode n = item.path(field);
        if (n.isNumber()) {
            return n.asLong();
        }
        return n.asText(null);
    }
}
