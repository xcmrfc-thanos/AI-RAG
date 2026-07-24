package com.knowledge.base.agent.tool;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * get_document 工具：经 Gateway GET /api/document/documents/{id}
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Component
@RequiredArgsConstructor
public class GetDocumentTool implements AgentTool {

    private final GatewayToolHttpClient httpClient;

    /**
     * {@inheritDoc}
     */
    /**
     * name 方法。
     */
    @Override
    public String name() {
        return "get_document";
    }

    /**
     * {@inheritDoc}
     */
    @Override
    public Map<String, Object> execute(Map<String, Object> input, ToolContext context) {
        Object rawId = input != null ? input.get("documentId") : null;
        if (rawId == null || !StringUtils.hasText(String.valueOf(rawId))) {
            throw new ToolException("INVALID_ARGUMENT", name(), "documentId 必填");
        }
        long documentId;
        try {
            documentId = Long.parseLong(String.valueOf(rawId).trim());
        } catch (NumberFormatException e) {
            throw new ToolException("INVALID_ARGUMENT", name(), "documentId 须为数字");
        }
        int maxChars = asInt(input.get("maxChars"), 4000);
        if (maxChars < 500 || maxChars > 10000) {
            throw new ToolException("INVALID_ARGUMENT", name(), "maxChars 须为 500～10000");
        }

        JsonNode resp = httpClient.get("/api/document/documents/" + documentId, context, name());
        JsonNode data = resp.path("data");
        if (data.isMissingNode() || data.isNull()) {
            throw new ToolException("NOT_FOUND", name(), "文档不存在或不可见");
        }

        String title = firstText(data, "title", "documentTitle");
        String content = firstText(data, "content", "htmlContent", "markdownContent", "summary");
        boolean truncated = false;
        if (content.length() > maxChars) {
            content = content.substring(0, maxChars);
            truncated = true;
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("documentId", documentId);
        out.put("title", title);
        out.put("content", content);
        out.put("truncated", truncated);
        out.put("maxChars", maxChars);
        out.put("untrustedContent", UntrustedDataWrapper.wrap(content));
        return out;
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
            throw new ToolException("INVALID_ARGUMENT", name(), "maxChars 须为整数");
        }
    }

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
