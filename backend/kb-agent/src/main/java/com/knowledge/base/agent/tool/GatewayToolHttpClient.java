package com.knowledge.base.agent.tool;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.knowledge.base.agent.config.AgentProperties;
import com.knowledge.base.agent.config.AgentTimeoutResolver;
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
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Duration;
import java.util.Map;

/**
 * 仅经 Gateway 出站的 HTTP 客户端（禁止直连 Core/Intelligence）
 *
 * <p>工具读超时优先 {@link AgentTimeoutResolver} 热读，秒数变化时重建 RestTemplate。</p>
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Slf4j
@Component
public class GatewayToolHttpClient {

    private final AgentProperties agentProperties;
    private final AgentTimeoutResolver timeoutResolver;
    private final RestTemplateBuilder restTemplateBuilder;
    private final ObjectMapper objectMapper;

    private final Object restTemplateLock = new Object();
    private volatile RestTemplate restTemplate;
    private volatile int appliedToolSeconds = -1;

    /**
     * 构造 Gateway 工具客户端。
     *
     * @param agentProperties     Agent 配置（Gateway 基址等）
     * @param timeoutResolver     超时热读
     * @param restTemplateBuilder RestTemplate 构建器
     * @param objectMapper        JSON
     */
    @Autowired
    public GatewayToolHttpClient(AgentProperties agentProperties,
                                 AgentTimeoutResolver timeoutResolver,
                                 RestTemplateBuilder restTemplateBuilder,
                                 ObjectMapper objectMapper) {
        this.agentProperties = agentProperties;
        this.timeoutResolver = timeoutResolver;
        this.restTemplateBuilder = restTemplateBuilder;
        this.objectMapper = objectMapper;
    }

    /**
     * 供单测注入自定义 RestTemplate（无热读缓存，回退属性默认超时）。
     *
     * @param agentProperties 配置
     * @param restTemplate    客户端
     * @param objectMapper    JSON
     */
    GatewayToolHttpClient(AgentProperties agentProperties, RestTemplate restTemplate, ObjectMapper objectMapper) {
        this(agentProperties,
                AgentTimeoutResolver.forTest(agentProperties, null),
                restTemplate,
                objectMapper);
    }

    /**
     * 供单测注入自定义 RestTemplate 与超时解析器。
     *
     * @param agentProperties 配置
     * @param timeoutResolver 超时解析
     * @param restTemplate    客户端
     * @param objectMapper    JSON
     */
    GatewayToolHttpClient(AgentProperties agentProperties,
                          AgentTimeoutResolver timeoutResolver,
                          RestTemplate restTemplate,
                          ObjectMapper objectMapper) {
        this.agentProperties = agentProperties;
        this.timeoutResolver = timeoutResolver;
        this.restTemplateBuilder = null;
        this.objectMapper = objectMapper;
        this.restTemplate = restTemplate;
        this.appliedToolSeconds = timeoutResolver.resolveToolSeconds();
    }

    /**
     * GET 经 Gateway。
     *
     * @param path    以 /api 开头的路径
     * @param context 工具上下文
     * @param tool    工具名
     * @return 响应 JSON
     */
    public JsonNode get(String path, ToolContext context, String tool) {
        return exchange(HttpMethod.GET, path, null, context, tool);
    }

    /**
     * GET 经 Gateway，并安全编码查询参数。
     *
     * @param path    固定 Gateway 路径
     * @param query   查询参数
     * @param context 工具上下文
     * @param tool    工具名
     * @return 响应 JSON
     */
    public JsonNode get(String path, Map<String, ?> query, ToolContext context, String tool) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromPath(path);
        if (query != null) {
            query.forEach((key, value) -> {
                if (value != null) {
                    builder.queryParam(key, value);
                }
            });
        }
        return get(builder.build().encode().toUriString(), context, tool);
    }

    /**
     * POST JSON 经 Gateway。
     *
     * @param path    路径
     * @param body    请求体
     * @param context 上下文
     * @param tool    工具名
     * @return 响应 JSON
     */
    public JsonNode postJson(String path, Object body, ToolContext context, String tool) {
        return exchange(HttpMethod.POST, path, body, context, tool);
    }

    /**
     * 按当前热读秒数获取（或重建）RestTemplate。
     *
     * @return HTTP 客户端
     */
    private RestTemplate client() {
        int seconds = timeoutResolver.resolveToolSeconds();
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
     * 执行 HTTP 并统一错误码。
     */
    private JsonNode exchange(HttpMethod method, String path, Object body, ToolContext context, String tool) {
        String bearer = context.bearerHeader();
        if (bearer == null) {
            throw new ToolException("UNAUTHORIZED", tool, "缺少终端用户 Authorization");
        }
        String base = trimSlash(agentProperties.getGatewayBaseUrl());
        if (!path.startsWith("/api/")) {
            throw new ToolException("INVALID_PATH", tool, "工具只允许调用 Gateway /api/** 路径");
        }
        String url = base + path;
        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.AUTHORIZATION, bearer);
        headers.setAccept(java.util.List.of(MediaType.APPLICATION_JSON));
        if (body != null) {
            headers.setContentType(MediaType.APPLICATION_JSON);
        }
        int toolSeconds = timeoutResolver.resolveToolSeconds();
        long start = System.currentTimeMillis();
        try {
            ResponseEntity<String> resp = client().exchange(
                    url, method, new HttpEntity<>(body, headers), String.class);
            long cost = System.currentTimeMillis() - start;
            log.info("tool_audit tool={} runId={} stepId={} status={} durationMs={}",
                    tool, context.runId(), context.stepId(), resp.getStatusCode().value(), cost);
            if (!resp.getStatusCode().is2xxSuccessful()) {
                throw new ToolException("HTTP_" + resp.getStatusCode().value(), tool,
                        "Gateway 返回非 2xx: " + resp.getStatusCode().value());
            }
            if (resp.getBody() == null || resp.getBody().isBlank()) {
                return objectMapper.createObjectNode();
            }
            return objectMapper.readTree(resp.getBody());
        } catch (ToolException e) {
            throw e;
        } catch (ResourceAccessException e) {
            long cost = System.currentTimeMillis() - start;
            log.warn("tool_audit tool={} runId={} stepId={} status=TIMEOUT durationMs={}",
                    tool, context.runId(), context.stepId(), cost);
            throw new ToolException("TIMEOUT", tool, "工具调用超时（默认 " + toolSeconds + "s）");
        } catch (HttpStatusCodeException e) {
            long cost = System.currentTimeMillis() - start;
            log.warn("tool_audit tool={} runId={} stepId={} status={} durationMs={}",
                    tool, context.runId(), context.stepId(), e.getStatusCode().value(), cost);
            throw new ToolException("HTTP_" + e.getStatusCode().value(), tool,
                    "Gateway HTTP " + e.getStatusCode().value());
        } catch (Exception e) {
            long cost = System.currentTimeMillis() - start;
            log.warn("tool_audit tool={} runId={} stepId={} status=ERROR durationMs={} msg={}",
                    tool, context.runId(), context.stepId(), cost, e.getMessage());
            throw new ToolException("HTTP_ERROR", tool, "工具调用失败: " + e.getMessage());
        }
    }

    /**
     * 去掉 URL 末尾斜杠。
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
