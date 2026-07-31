package com.knowledge.base.mcp.tool;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * get_document：经 Gateway GET /api/document/documents/{id}
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Component
@RequiredArgsConstructor
public class GetDocumentMcpTool implements McpTool {

    private final GatewayMcpHttpClient httpClient;

    /**
     * {@inheritDoc}
     */
    @Override
    public String name() {
        return "get_document";
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public String description() {
        return "按用户 ACL 读取单篇文档正文（只读，自动截断）";
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public Map<String, Object> inputSchema() {
        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("type", "object");
        Map<String, Object> props = new LinkedHashMap<>();
        props.put("documentId", Map.of("type", "string", "description", "文档 ID"));
        props.put("maxChars", Map.of("type", "integer", "minimum", 500, "maximum", 10000, "default", 4000));
        schema.put("properties", props);
        schema.put("required", List.of("documentId"));
        return schema;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public Map<String, Object> execute(Map<String, Object> input, McpToolContext context) {
        Object rawId = input != null ? input.get("documentId") : null;
        if (rawId == null || !StringUtils.hasText(String.valueOf(rawId))) {
            throw new McpToolException("INVALID_ARGUMENT", name(), "documentId 必填");
        }
        long documentId;
        try {
            documentId = Long.parseLong(String.valueOf(rawId).trim());
        } catch (NumberFormatException e) {
            throw new McpToolException("INVALID_ARGUMENT", name(), "documentId 须为数字");
        }
        int maxChars = asInt(input.get("maxChars"), 4000);
        if (maxChars < 500 || maxChars > 10000) {
            throw new McpToolException("INVALID_ARGUMENT", name(), "maxChars 须为 500～10000");
        }

        JsonNode resp = httpClient.get("/api/document/documents/" + documentId, context, name());
        JsonNode data = resp.path("data");
        if (data.isMissingNode() || data.isNull()) {
            throw new McpToolException("NOT_FOUND", name(), "文档不存在或不可见");
        }

        String title = firstText(data, "title", "documentTitle");
        String summary = firstText(data, "summary");
        String content = firstText(data, "content", "htmlContent", "markdownContent", "summary");
        boolean truncated = false;
        if (content.length() > maxChars) {
            content = content.substring(0, maxChars);
            truncated = true;
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("documentId", documentId);
        out.put("title", title);
        if (StringUtils.hasText(summary)) {
            out.put("summary", summary.length() > 500 ? summary.substring(0, 500) : summary);
        }
        out.put("contentTruncated", content);
        out.put("truncated", truncated);
        out.put("maxChars", maxChars);
        return out;
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
            throw new McpToolException("INVALID_ARGUMENT", name(), "maxChars 须为整数");
        }
    }

    /**
     * 取首个非空文本字段
     *
     * @param data   JSON
     * @param fields 候选字段
     * @return 文本
     */
    private String firstText(JsonNode data, String... fields) {
        for (String f : fields) {
            JsonNode n = data.path(f);
            if (!n.isMissingNode() && !n.isNull() && StringUtils.hasText(n.asText())) {
                return n.asText();
            }
        }
        return "";
    }
}
