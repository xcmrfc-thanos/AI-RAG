package com.knowledge.base.mcp.controller;

import com.knowledge.base.common.result.Result;
import com.knowledge.base.mcp.support.McpDisabledException;
import com.knowledge.base.mcp.support.McpServerGate;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * MCP JSON-RPC 入口占位（Task 1：开关门闩；完整协议见 Task 3）
 *
 * <p>Gateway StripPrefix=2 后路径为 {@code POST /mcp}。</p>
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@RestController
@RequiredArgsConstructor
public class McpJsonRpcController {

    private final McpServerGate mcpServerGate;

    /**
     * JSON-RPC 入口：未启用时返回 503；启用后 Task 3 再实现方法分发
     *
     * @param body 请求体（Task 1 不解析）
     * @return 占位成功或由异常处理器返回关闭态
     */
    @PostMapping("/mcp")
    public Result<Map<String, Object>> handle(@RequestBody(required = false) Map<String, Object> body) {
        mcpServerGate.requireEnabled();
        Map<String, Object> stub = new LinkedHashMap<>();
        stub.put("protocol", "mcp-jsonrpc-subset");
        stub.put("ready", false);
        stub.put("message", "协议分发尚未启用（Task 3）");
        return Result.success(stub);
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
}
