package com.knowledge.base.mcp.controller;

import com.knowledge.base.common.result.Result;
import com.knowledge.base.mcp.service.McpJsonRpcService;
import com.knowledge.base.mcp.support.McpDisabledException;
import com.knowledge.base.mcp.support.McpRateLimitedException;
import com.knowledge.base.mcp.tool.McpToolException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * MCP JSON-RPC HTTP 入口（Gateway：POST /api/mcp → POST /mcp）
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@RestController
@RequiredArgsConstructor
public class McpJsonRpcController {

    private final McpJsonRpcService mcpJsonRpcService;

    /**
     * JSON-RPC 入口
     *
     * @param body 请求体
     * @return JSON-RPC 响应（不包 Result，便于 MCP 客户端）
     */
    @PostMapping({"/mcp", "/mcp/"})
    public Map<String, Object> handle(@RequestBody(required = false) Map<String, Object> body) {
        return mcpJsonRpcService.handle(body != null ? body : Map.of());
    }

    /**
     * 开关关闭 → HTTP 503
     *
     * @param ex 关闭异常
     * @return 统一错误体
     */
    @ExceptionHandler(McpDisabledException.class)
    public ResponseEntity<Result<Void>> handleDisabled(McpDisabledException ex) {
        Result<Void> result = Result.error(HttpStatus.SERVICE_UNAVAILABLE.value(), "MCP_DISABLED: " + ex.getMessage());
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(result);
    }

    /**
     * 限流 → HTTP 429
     *
     * @param ex 限流异常
     * @return 错误体
     */
    @ExceptionHandler(McpRateLimitedException.class)
    public ResponseEntity<Result<Void>> handleRateLimited(McpRateLimitedException ex) {
        Result<Void> result = Result.error(429, "RATE_LIMITED: " + ex.getMessage());
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(result);
    }

    /**
     * 工具层未捕获异常兜底（一般已在 JSON-RPC error 内）
     *
     * @param ex 工具异常
     * @return 400
     */
    @ExceptionHandler(McpToolException.class)
    public ResponseEntity<Result<Void>> handleTool(McpToolException ex) {
        Result<Void> result = Result.error(400, ex.getCode() + ": " + ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(result);
    }
}
