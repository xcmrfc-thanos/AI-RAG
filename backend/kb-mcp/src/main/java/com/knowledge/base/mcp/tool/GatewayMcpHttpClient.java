package com.knowledge.base.mcp.tool;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.knowledge.base.mcp.config.McpProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

/**
 * 仅经 Gateway 出站的 HTTP 客户端（禁止直连 Core/Intelligence）
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Slf4j
@Component
public class GatewayMcpHttpClient {

    private final McpProperties mcpProperties;
    private final RestTemplateBuilder restTemplateBuilder;
    private final ObjectMapper objectMapper;

    private final Object restTemplateLock = new Object();
    private volatile RestTemplate restTemplate;
    private volatile int appliedToolSeconds = -1;

    /**
     * 构造 Gateway MCP 客户端
     *
     * @param mcpProperties       配置
     * @param restTemplateBuilder RestTemplate 构建器
     * @param objectMapper        JSON
     */
    @Autowired
    public GatewayMcpHttpClient(McpProperties mcpProperties,
                                RestTemplateBuilder restTemplateBuilder,
                                ObjectMapper objectMapper) {
        this.mcpProperties = mcpProperties;
        this.restTemplateBuilder = restTemplateBuilder;
        this.objectMapper = objectMapper;
    }

    /**
     * 供单测注入自定义 RestTemplate
     *
     * @param mcpProperties 配置
     * @param restTemplate  客户端
     * @param objectMapper  JSON
     */
    public GatewayMcpHttpClient(McpProperties mcpProperties, RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.mcpProperties = mcpProperties;
        this.restTemplateBuilder = null;
        this.objectMapper = objectMapper;
        this.restTemplate = restTemplate;
        this.appliedToolSeconds = mcpProperties.getTimeouts().getToolSeconds();
    }

    /**
     * GET 经 Gateway
     *
     * @param path    以 /api/ 开头
     * @param context 上下文
     * @param tool    工具名
     * @return JSON
     */
    public JsonNode get(String path, McpToolContext context, String tool) {
        return exchange(HttpMethod.GET, path, null, context, tool);
    }

    /**
     * POST JSON 经 Gateway
     *
     * @param path    路径
     * @param body    请求体
     * @param context 上下文
     * @param tool    工具名
     * @return JSON
     */
    public JsonNode postJson(String path, Object body, McpToolContext context, String tool) {
        return exchange(HttpMethod.POST, path, body, context, tool);
    }

    /**
     * 按配置超时获取 RestTemplate
     *
     * @return HTTP 客户端
     */
    private RestTemplate client() {
        int seconds = Math.max(1, mcpProperties.getTimeouts().getToolSeconds());
        RestTemplate current = restTemplate;
        if (current != null && appliedToolSeconds == seconds) {
            return current;
        }
        synchronized (restTemplateLock) {
            if (restTemplate != null && appliedToolSeconds == seconds) {
                return restTemplate;
            }
            if (restTemplateBuilder == null) {
                return restTemplate;
            }
            restTemplate = restTemplateBuilder
                    .setConnectTimeout(Duration.ofSeconds(Math.min(3, seconds)))
                    .setReadTimeout(Duration.ofSeconds(seconds))
                    .build();
            appliedToolSeconds = seconds;
            return restTemplate;
        }
    }

    /**
     * 执行 HTTP 并统一错误码
     *
     * @param method  方法
     * @param path    路径
     * @param body    体
     * @param context 上下文
     * @param tool    工具
     * @return JSON
     */
    private JsonNode exchange(HttpMethod method, String path, Object body, McpToolContext context, String tool) {
        String bearer = context != null ? context.bearerHeader() : null;
        if (bearer == null) {
            throw new McpToolException("UNAUTHORIZED", tool, "缺少终端用户 Authorization");
        }
        String base = trimSlash(mcpProperties.getGatewayBaseUrl());
        if (path == null || !path.startsWith("/api/")) {
            throw new McpToolException("INVALID_PATH", tool, "工具只允许调用 Gateway /api/** 路径");
        }
        String url = base + path;
        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.AUTHORIZATION, bearer);
        headers.setAccept(java.util.List.of(MediaType.APPLICATION_JSON));
        if (body != null) {
            headers.setContentType(MediaType.APPLICATION_JSON);
        }
        int toolSeconds = Math.max(1, mcpProperties.getTimeouts().getToolSeconds());
        Long userId = context.userId();
        long start = System.currentTimeMillis();
        try {
            ResponseEntity<String> resp = client().exchange(
                    url, method, new HttpEntity<>(body, headers), String.class);
            long cost = System.currentTimeMillis() - start;
            log.info("mcp_tool_audit tool={} userId={} status={} durationMs={}",
                    tool, userId, resp.getStatusCode().value(), cost);
            if (!resp.getStatusCode().is2xxSuccessful()) {
                throw mapHttp(tool, resp.getStatusCode().value());
            }
            if (resp.getBody() == null || resp.getBody().isBlank()) {
                return objectMapper.createObjectNode();
            }
            return objectMapper.readTree(resp.getBody());
        } catch (McpToolException e) {
            throw e;
        } catch (ResourceAccessException e) {
            long cost = System.currentTimeMillis() - start;
            log.warn("mcp_tool_audit tool={} userId={} status=TIMEOUT durationMs={}", tool, userId, cost);
            throw new McpToolException("TIMEOUT", tool, "工具调用超时（默认 " + toolSeconds + "s）");
        } catch (HttpStatusCodeException e) {
            long cost = System.currentTimeMillis() - start;
            int code = e.getStatusCode().value();
            log.warn("mcp_tool_audit tool={} userId={} status={} durationMs={}", tool, userId, code, cost);
            throw mapHttp(tool, code);
        } catch (Exception e) {
            long cost = System.currentTimeMillis() - start;
            log.warn("mcp_tool_audit tool={} userId={} status=ERROR durationMs={} msg={}",
                    tool, userId, cost, e.getMessage());
            throw new McpToolException("HTTP_ERROR", tool, "工具调用失败: " + e.getMessage());
        }
    }

    /**
     * 将 HTTP 状态映射为工具错误（403→FORBIDDEN）
     *
     * @param tool       工具名
     * @param statusCode HTTP 状态
     * @return 异常
     */
    private McpToolException mapHttp(String tool, int statusCode) {
        if (statusCode == 401) {
            return new McpToolException("UNAUTHORIZED", tool, "Gateway 未授权");
        }
        if (statusCode == 403) {
            return new McpToolException("FORBIDDEN", tool, "无权限或文档不可见");
        }
        if (statusCode == 404) {
            return new McpToolException("NOT_FOUND", tool, "资源不存在或不可见");
        }
        return new McpToolException("HTTP_" + statusCode, tool, "Gateway HTTP " + statusCode);
    }

    /**
     * 去掉 URL 末尾斜杠
     *
     * @param url 原始 URL
     * @return 规范化基址
     */
    private String trimSlash(String url) {
        if (url == null) {
            return "";
        }
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}
