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
 * hybrid_search 工具：经 Gateway POST /api/search
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Component
@RequiredArgsConstructor
public class HybridSearchTool implements AgentTool {

    private final GatewayToolHttpClient httpClient;

    /**
     * {@inheritDoc}
     */
    /**
     * name 方法。
     */
    @Override
    public String name() {
        return "hybrid_search";
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public Map<String, Object> execute(Map<String, Object> input, ToolContext context) {
        String query = asString(input != null ? input.get("query") : null);
        if (!StringUtils.hasText(query) || query.length() > 1000) {
            throw new ToolException("INVALID_ARGUMENT", name(), "query 须为 1～1000 字符");
        }
        String mode = asString(input.get("mode"));
        if (!StringUtils.hasText(mode)) {
            mode = "hybrid";
        }
        if (!"keyword".equals(mode) && !"hybrid".equals(mode)) {
            throw new ToolException("INVALID_ARGUMENT", name(), "mode 仅允许 keyword|hybrid");
        }
        int topK = asInt(input.get("topK"), 5);
        if (topK < 1 || topK > 20) {
            throw new ToolException("INVALID_ARGUMENT", name(), "topK 须为 1～20");
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
                hit.put("summary", summary);
                hit.put("untrustedSummary", UntrustedDataWrapper.wrap(summary));
                hits.add(hit);
            }
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("query", query);
        out.put("mode", mode);
        out.put("topK", topK);
        out.put("hits", hits);
        out.put("hitCount", hits.size());
        // 供 LLM 节点直接引用的不可信聚合文本
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < hits.size(); i++) {
            Map<String, Object> h = hits.get(i);
            sb.append("[").append(i + 1).append("] ")
                    .append(h.get("title")).append('\n')
                    .append(h.get("summary")).append("\n\n");
        }
        out.put("untrustedCorpus", UntrustedDataWrapper.wrap(sb.toString()));
        return out;
    }

    private String asString(Object v) {
        return v == null ? null : String.valueOf(v).trim();
    }

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
            throw new ToolException("INVALID_ARGUMENT", name(), "topK 须为整数");
        }
    }

    private Object textOrLong(JsonNode item, String field) {
        JsonNode n = item.path(field);
        if (n.isNumber()) {
            return n.asLong();
        }
        return n.asText(null);
    }
}
