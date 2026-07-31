package com.knowledge.base.mcp.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.knowledge.base.common.utils.UserContextUtil;
import com.knowledge.base.mcp.support.McpRateLimiter;
import com.knowledge.base.mcp.support.McpServerGate;
import com.knowledge.base.mcp.tool.McpTool;
import com.knowledge.base.mcp.tool.McpToolContext;
import com.knowledge.base.mcp.tool.McpToolException;
import com.knowledge.base.mcp.tool.McpToolRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * MCP JSON-RPC 子集分发：initialize / tools/list / tools/call
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class McpJsonRpcService {

    private final McpServerGate mcpServerGate;
    private final McpToolRegistry toolRegistry;
    private final McpRateLimiter rateLimiter;
    private final ObjectMapper objectMapper;

    /**
     * 处理单条 JSON-RPC 请求
     *
     * @param request 请求 Map（jsonrpc/id/method/params）
     * @return 响应 Map
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> handle(Map<String, Object> request) {
        mcpServerGate.requireEnabled();
        Object id = request != null ? request.get("id") : null;
        String method = request != null ? asString(request.get("method")) : null;
        if (!StringUtils.hasText(method)) {
            return error(id, -32600, "Invalid Request", "method 必填");
        }
        try {
            rateLimiter.acquire(UserContextUtil.getUserId());
            Object result = switch (method) {
                case "initialize" -> initialize();
                case "notifications/initialized" -> null;
                case "tools/list" -> toolsList();
                case "tools/call" -> toolsCall(asMap(request.get("params")));
                case "ping" -> Map.of("ok", true);
                default -> throw new McpToolException("UNKNOWN_METHOD", method, "不支持的方法: " + method);
            };
            if ("notifications/initialized".equals(method)) {
                // 通知无响应体；仍返回空 result 便于 HTTP 客户端
                return success(id, Map.of("ok", true));
            }
            return success(id, result);
        } catch (McpToolException e) {
            log.warn("mcp_rpc tool_error code={} tool={} msg={}", e.getCode(), e.getTool(), e.getMessage());
            return error(id, -32000, e.getCode(), e.getMessage());
        }
    }

    /**
     * initialize 握手结果
     *
     * @return 能力声明
     */
    private Map<String, Object> initialize() {
        Map<String, Object> caps = new LinkedHashMap<>();
        caps.put("tools", Map.of("listChanged", false));
        Map<String, Object> serverInfo = new LinkedHashMap<>();
        serverInfo.put("name", "kb-mcp");
        serverInfo.put("version", "1.0.0");
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("protocolVersion", "2024-11-05");
        out.put("capabilities", caps);
        out.put("serverInfo", serverInfo);
        return out;
    }

    /**
     * tools/list
     *
     * @return { tools: [...] }
     */
    private Map<String, Object> toolsList() {
        List<Map<String, Object>> tools = new ArrayList<>();
        for (McpTool tool : toolRegistry.all()) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("name", tool.name());
            item.put("description", tool.description());
            item.put("inputSchema", tool.inputSchema());
            tools.add(item);
        }
        return Map.of("tools", tools);
    }

    /**
     * tools/call
     *
     * @param params name + arguments
     * @return MCP tool result 结构
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> toolsCall(Map<String, Object> params) {
        if (params == null || !StringUtils.hasText(asString(params.get("name")))) {
            throw new McpToolException("INVALID_ARGUMENT", "", "tools/call 需要 name");
        }
        String name = asString(params.get("name"));
        Map<String, Object> arguments = asMap(params.get("arguments"));
        if (arguments == null) {
            arguments = Map.of();
        }
        McpTool tool = toolRegistry.require(name);
        String token = UserContextUtil.getToken();
        McpToolContext context = new McpToolContext(UserContextUtil.getUserId(), token);
        long start = System.currentTimeMillis();
        Map<String, Object> data = tool.execute(arguments, context);
        long cost = System.currentTimeMillis() - start;
        Object docId = data.get("documentId");
        Object hitCount = data.get("hitCount");
        log.info("mcp_tool_audit tool={} userId={} status=OK durationMs={} documentId={} hitCount={}",
                name, UserContextUtil.getUserId(), cost, docId, hitCount);

        String text;
        try {
            text = objectMapper.writeValueAsString(data);
        } catch (Exception e) {
            text = String.valueOf(data);
        }
        Map<String, Object> contentItem = new LinkedHashMap<>();
        contentItem.put("type", "text");
        contentItem.put("text", text);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("content", List.of(contentItem));
        result.put("structuredContent", data);
        result.put("isError", false);
        return result;
    }

    /**
     * 成功响应
     *
     * @param id     请求 id
     * @param result 结果
     * @return JSON-RPC
     */
    private Map<String, Object> success(Object id, Object result) {
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("jsonrpc", "2.0");
        resp.put("id", id);
        resp.put("result", result);
        return resp;
    }

    /**
     * 错误响应
     *
     * @param id      请求 id
     * @param code    JSON-RPC 错误码
     * @param message 简短消息
     * @param data    附加
     * @return JSON-RPC
     */
    private Map<String, Object> error(Object id, int code, String message, String data) {
        Map<String, Object> err = new LinkedHashMap<>();
        err.put("code", code);
        err.put("message", message);
        if (data != null) {
            err.put("data", data);
        }
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("jsonrpc", "2.0");
        resp.put("id", id);
        resp.put("error", err);
        return resp;
    }

    /**
     * 转字符串
     *
     * @param v 值
     * @return 文本
     */
    private String asString(Object v) {
        return v == null ? null : String.valueOf(v).trim();
    }

    /**
     * 转 Map
     *
     * @param v 值
     * @return Map 或 null
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> asMap(Object v) {
        if (v instanceof Map<?, ?> m) {
            return (Map<String, Object>) m;
        }
        return null;
    }
}
