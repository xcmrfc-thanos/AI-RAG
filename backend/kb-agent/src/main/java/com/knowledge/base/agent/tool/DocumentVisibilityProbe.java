package com.knowledge.base.agent.tool;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * 经 Gateway get_document 探测文档对当前用户是否可读（请求内本地缓存）
 *
 * <p>统计/图谱接口本身无终端可见性过滤；Agent Tool 用本探针超采后过滤，避免泄露无权元数据。</p>
 */
final class DocumentVisibilityProbe {

    private final GatewayToolHttpClient httpClient;
    private final ToolContext context;
    private final String tool;
    private final Map<Long, Boolean> cache = new HashMap<>();

    /**
     * 构造探针
     *
     * @param httpClient Gateway 客户端
     * @param context    当前用户上下文
     * @param tool       工具名（审计）
     */
    DocumentVisibilityProbe(GatewayToolHttpClient httpClient, ToolContext context, String tool) {
        this.httpClient = httpClient;
        this.context = context;
        this.tool = tool;
    }

    /**
     * 判断文档是否对当前 Bearer 用户可读
     *
     * @param documentId 文档 ID
     * @return 可读为 true；403/404/业务失败为 false
     */
    boolean isReadable(Long documentId) {
        if (documentId == null || documentId <= 0) {
            return false;
        }
        Boolean cached = cache.get(documentId);
        if (cached != null) {
            return cached;
        }
        boolean ok;
        try {
            JsonNode resp = httpClient.get("/api/document/documents/" + documentId, context, tool);
            JsonNode data = resp.path("data");
            int code = resp.path("code").asInt(0);
            ok = !data.isMissingNode() && !data.isNull() && (code == 0 || code == 200);
        } catch (ToolException e) {
            ok = false;
        }
        cache.put(documentId, ok);
        return ok;
    }

    /**
     * 批量探测并返回可读 ID 集合
     *
     * @param documentIds 候选 ID
     * @return 可读 ID
     */
    Set<Long> filterReadable(Iterable<Long> documentIds) {
        Set<Long> readable = new HashSet<>();
        if (documentIds == null) {
            return readable;
        }
        for (Long id : documentIds) {
            if (isReadable(id)) {
                readable.add(id);
            }
        }
        return readable;
    }
}
