package com.knowledge.base.agent.tool;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 最新文档 Tool：统计超采后经 get_document ACL 过滤
 */
@Component
@RequiredArgsConstructor
public class LatestDocumentsTool implements AgentTool {

    private final GatewayToolHttpClient httpClient;

    @Override
    public String name() {
        return "latest_documents";
    }

    @Override
    public Map<String, Object> execute(Map<String, Object> input, ToolContext context) {
        Map<String, Object> source = input != null ? input : Map.of();
        int size = ToolInputSupport.integer(source.get("size"), 6, 1, 20, "size", name());
        int fetch = Math.min(30, Math.max(size * 3, size));

        Map<String, Object> query = new LinkedHashMap<>();
        query.put("size", fetch);

        JsonNode data = httpClient.get("/api/statistics/latest/documents", query, context, name()).path("data");
        DocumentVisibilityProbe probe = new DocumentVisibilityProbe(httpClient, context, name());
        List<Map<String, Object>> documents = HotDocumentsTool.filterByAcl(data, probe, size);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("documents", documents);
        out.put("count", documents.size());
        out.put("untrustedCorpus", UntrustedDataWrapper.wrap(toCorpus(documents)));
        return out;
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
