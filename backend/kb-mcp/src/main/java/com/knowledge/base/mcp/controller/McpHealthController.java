package com.knowledge.base.mcp.controller;

import com.knowledge.base.common.result.Result;
import com.knowledge.base.mcp.config.McpProperties;
import com.knowledge.base.mcp.support.McpServerGate;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 健康与状态探测（/ping 匿名；/mcp/status 需登录）
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@RestController
@RequiredArgsConstructor
public class McpHealthController {

    private final McpServerGate mcpServerGate;
    private final McpProperties mcpProperties;

    /**
     * 进程存活探测
     *
     * @return pong
     */
    @GetMapping("/ping")
    public Result<String> ping() {
        return Result.success("pong");
    }

    /**
     * MCP 开关状态（需 JWT；不泄露密钥）
     *
     * @return 状态摘要
     */
    @GetMapping("/mcp/status")
    public Result<Map<String, Object>> status() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("enabled", mcpServerGate.isEnabled());
        body.put("gatewayBaseUrl", mcpProperties.getGatewayBaseUrl());
        body.put("toolTimeoutSeconds", mcpProperties.getTimeouts().getToolSeconds());
        body.put("perUserQps", mcpProperties.getRateLimit().getPerUserQps());
        return Result.success(body);
    }
}
