package com.knowledge.base.mcp.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.knowledge.base.mcp.config.McpProperties;
import com.knowledge.base.mcp.support.McpDisabledException;
import com.knowledge.base.mcp.support.McpRateLimiter;
import com.knowledge.base.mcp.support.McpServerGate;
import com.knowledge.base.mcp.tool.HybridSearchMcpTool;
import com.knowledge.base.mcp.tool.McpToolRegistry;
import com.knowledge.base.mcp.tool.GatewayMcpHttpClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * {@link McpJsonRpcService} 协议子集单测
 *
 * @author AI-RAG
 * @since 1.0.0
 */
class McpJsonRpcServiceTest {

    private McpJsonRpcService service;
    private McpProperties props;

    /**
     * 启用开关并注入假工具注册表
     */
    @BeforeEach
    void setUp() {
        props = new McpProperties();
        props.getServer().setEnabled(true);
        props.getRateLimit().setPerUserQps(100);
        GatewayMcpHttpClient client = new GatewayMcpHttpClient(props, new RestTemplate(), new ObjectMapper());
        McpToolRegistry registry = new McpToolRegistry(List.of(new HybridSearchMcpTool(client)));
        service = new McpJsonRpcService(
                new McpServerGate(props),
                registry,
                new McpRateLimiter(props),
                new ObjectMapper());
    }

    /**
     * 关闭态抛 MCP_DISABLED
     */
    @Test
    void disabledThrows() {
        props.getServer().setEnabled(false);
        assertThrows(McpDisabledException.class,
                () -> service.handle(Map.of("jsonrpc", "2.0", "id", 1, "method", "tools/list")));
    }

    /**
     * tools/list 返回白名单
     */
    @Test
    void toolsList() {
        Map<String, Object> resp = service.handle(Map.of(
                "jsonrpc", "2.0", "id", 1, "method", "tools/list"));
        assertNotNull(resp.get("result"));
        @SuppressWarnings("unchecked")
        Map<String, Object> result = (Map<String, Object>) resp.get("result");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> tools = (List<Map<String, Object>>) result.get("tools");
        assertEquals(1, tools.size());
        assertEquals("hybrid_search", tools.get(0).get("name"));
    }

    /**
     * 未知方法返回 JSON-RPC error
     */
    @Test
    void unknownMethod() {
        Map<String, Object> resp = service.handle(Map.of(
                "jsonrpc", "2.0", "id", 2, "method", "foo/bar"));
        assertTrue(resp.containsKey("error"));
    }
}
