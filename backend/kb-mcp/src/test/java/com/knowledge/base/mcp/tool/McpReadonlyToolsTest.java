package com.knowledge.base.mcp.tool;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.knowledge.base.mcp.config.McpProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import org.springframework.http.HttpStatus;

/**
 * hybrid_search / get_document 入参与出站契约单测
 *
 * @author AI-RAG
 * @since 1.0.0
 */
class McpReadonlyToolsTest {

    private HybridSearchMcpTool searchTool;
    private GetDocumentMcpTool documentTool;
    private MockRestServiceServer server;
    private McpToolContext ctx;

    /**
     * 初始化 Mock Gateway
     */
    @BeforeEach
    void setUp() {
        McpProperties props = new McpProperties();
        props.setGatewayBaseUrl("http://gateway.test");
        RestTemplate restTemplate = new RestTemplate();
        server = MockRestServiceServer.createServer(restTemplate);
        GatewayMcpHttpClient client = new GatewayMcpHttpClient(props, restTemplate, new ObjectMapper());
        searchTool = new HybridSearchMcpTool(client);
        documentTool = new GetDocumentMcpTool(client);
        ctx = new McpToolContext(1L, "Bearer tok-user");
    }

    /**
     * query 非法时抛 INVALID_ARGUMENT
     */
    @Test
    void searchRejectsBlankQuery() {
        McpToolException ex = assertThrows(McpToolException.class,
                () -> searchTool.execute(Map.of("query", "  "), ctx));
        assertEquals("INVALID_ARGUMENT", ex.getCode());
    }

    /**
     * 成功检索裁剪 hits
     */
    @Test
    void searchHappyPath() {
        server.expect(requestTo("http://gateway.test/api/search"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer tok-user"))
                .andRespond(withSuccess(
                        "{\"data\":{\"records\":[{\"id\":9,\"title\":\"T\",\"summary\":\"S\"}]}}",
                        MediaType.APPLICATION_JSON));
        Map<String, Object> out = searchTool.execute(Map.of("query", "hello", "topK", 3), ctx);
        assertEquals(1, out.get("hitCount"));
        server.verify();
    }

    /**
     * 禁止非 /api 路径
     */
    @Test
    void clientRejectsNonApiPath() {
        McpProperties props = new McpProperties();
        props.setGatewayBaseUrl("http://gateway.test");
        GatewayMcpHttpClient client = new GatewayMcpHttpClient(props, new RestTemplate(), new ObjectMapper());
        McpToolException ex = assertThrows(McpToolException.class,
                () -> client.get("/internal/x", ctx, "t"));
        assertEquals("INVALID_PATH", ex.getCode());
    }

    /**
     * 下游 403 映射 FORBIDDEN
     */
    @Test
    void documentMapsForbidden() {
        server.expect(requestTo("http://gateway.test/api/document/documents/42"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withStatus(HttpStatus.FORBIDDEN));
        McpToolException ex = assertThrows(McpToolException.class,
                () -> documentTool.execute(Map.of("documentId", "42"), ctx));
        assertEquals("FORBIDDEN", ex.getCode());
        server.verify();
    }

    /**
     * 正文超长截断
     */
    @Test
    void documentTruncates() {
        String longContent = "x".repeat(600);
        server.expect(requestTo("http://gateway.test/api/document/documents/7"))
                .andRespond(withSuccess(
                        "{\"data\":{\"id\":7,\"title\":\"Doc\",\"content\":\"" + longContent + "\"}}",
                        MediaType.APPLICATION_JSON));
        Map<String, Object> out = documentTool.execute(Map.of("documentId", 7, "maxChars", 500), ctx);
        assertTrue((Boolean) out.get("truncated"));
        assertEquals(500, ((String) out.get("contentTruncated")).length());
        server.verify();
    }

    /**
     * 注册表白名单仅两工具
     */
    @Test
    void registryWhitelist() {
        McpToolRegistry registry = new McpToolRegistry(java.util.List.of(searchTool, documentTool));
        assertEquals(2, registry.all().size());
        assertThrows(McpToolException.class, () -> registry.require("write_doc"));
    }
}
