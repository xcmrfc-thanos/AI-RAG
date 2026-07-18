package com.knowledge.base.agent.tool;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.knowledge.base.agent.config.AgentProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/**
 * 任务 66：双工具 Registry 与 Gateway 出站单测
 *
 * @author AI-RAG
 * @since 1.0.0
 */
class AgentToolRegistryTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private AgentProperties properties;
    private RestTemplate restTemplate;
    private MockRestServiceServer server;
    private GatewayToolHttpClient httpClient;
    private AgentToolRegistry registry;

    @BeforeEach
    void setUp() {
        properties = new AgentProperties();
        properties.setGatewayBaseUrl("http://gateway.test:8080");
        restTemplate = new RestTemplate();
        server = MockRestServiceServer.createServer(restTemplate);
        httpClient = new GatewayToolHttpClient(properties, restTemplate, objectMapper);
        registry = new AgentToolRegistry(List.of(
                new HybridSearchTool(httpClient),
                new GetDocumentTool(httpClient),
                new ListDocumentsTool(httpClient),
                new ListCategoriesTool(httpClient),
                new ListTagsTool(httpClient),
                new HotDocumentsTool(httpClient),
                new LatestDocumentsTool(httpClient),
                new GraphSearchTool(httpClient),
                new TextTemplateTool()
        ));
    }

    /**
     * 注册表含已批准只读工具
     */
    @Test
    void registryContainsApprovedToolsOnly() {
        assertTrue(registry.has("hybrid_search"));
        assertTrue(registry.has("get_document"));
        assertTrue(registry.has("list_documents"));
        assertTrue(registry.has("list_categories"));
        assertTrue(registry.has("list_tags"));
        assertTrue(registry.has("hot_documents"));
        assertTrue(registry.has("latest_documents"));
        assertTrue(registry.has("graph_search"));
        assertTrue(registry.has("text_template"));
        assertEquals(9, registry.names().size());
        ToolException ex = assertThrows(ToolException.class, () -> registry.require("web_fetch"));
        assertEquals("UNKNOWN_TOOL", ex.getCode());
    }

    /**
     * hybrid_search 透传 Authorization 且仅打 Gateway
     */
    @Test
    void hybridSearchPassesBearerViaGateway() {
        server.expect(requestTo("http://gateway.test:8080/api/search"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer user-token"))
                .andRespond(withSuccess("""
                        {"code":0,"data":{"records":[{"id":11,"title":"T1","summary":"S1"}]}}
                        """, MediaType.APPLICATION_JSON));

        Map<String, Object> out = registry.require("hybrid_search").execute(
                Map.of("query", "hello", "topK", 5),
                new ToolContext("user-token", 1L, 2L));

        assertEquals(1, out.get("hitCount"));
        assertTrue(String.valueOf(out.get("untrustedCorpus")).contains("<<<UNTRUSTED_DATA"));
        server.verify();
    }

    /**
     * get_document 截断过长正文
     */
    @Test
    void getDocumentTruncatesLongContent() {
        String longBody = "X".repeat(6000);
        server.expect(requestTo("http://gateway.test:8080/api/document/documents/99"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("Authorization", "Bearer tok"))
                .andRespond(withSuccess("""
                        {"code":0,"data":{"title":"Doc","content":"%s"}}
                        """.formatted(longBody), MediaType.APPLICATION_JSON));

        Map<String, Object> out = registry.require("get_document").execute(
                Map.of("documentId", 99, "maxChars", 500),
                new ToolContext("Bearer tok", 3L, 4L));

        assertEquals(500, String.valueOf(out.get("content")).length());
        assertEquals(true, out.get("truncated"));
        server.verify();
    }

    /**
     * 非法参数负向
     */
    @Test
    void invalidArgumentsRejected() {
        ToolException emptyQuery = assertThrows(ToolException.class,
                () -> registry.require("hybrid_search").execute(
                        Map.of("query", ""), new ToolContext("t", 1L, 1L)));
        assertEquals("INVALID_ARGUMENT", emptyQuery.getCode());

        ToolException badTopK = assertThrows(ToolException.class,
                () -> registry.require("hybrid_search").execute(
                        Map.of("query", "q", "topK", 99), new ToolContext("t", 1L, 1L)));
        assertEquals("INVALID_ARGUMENT", badTopK.getCode());

        ToolException noDocId = assertThrows(ToolException.class,
                () -> registry.require("get_document").execute(
                        Map.of(), new ToolContext("t", 1L, 1L)));
        assertEquals("INVALID_ARGUMENT", noDocId.getCode());
    }

    /**
     * 非 2xx 转为结构化 ToolError
     */
    @Test
    void httpErrorMappedToToolException() {
        server.expect(requestTo("http://gateway.test:8080/api/search"))
                .andRespond(withServerError());

        ToolException ex = assertThrows(ToolException.class,
                () -> registry.require("hybrid_search").execute(
                        Map.of("query", "q"), new ToolContext("Bearer t", 1L, 1L)));
        assertTrue(ex.getCode().startsWith("HTTP_"));
        server.verify();
    }

    /**
     * 缺少用户 Token 拒绝
     */
    @Test
    void missingAuthRejected() {
        ToolException ex = assertThrows(ToolException.class,
                () -> httpClient.get("/api/document/documents/1",
                        new ToolContext(null, 1L, 1L), "get_document"));
        assertEquals("UNAUTHORIZED", ex.getCode());
    }

    /**
     * 禁止非 /api 路径
     */
    @Test
    void nonApiPathRejected() {
        ToolException ex = assertThrows(ToolException.class,
                () -> httpClient.get("http://127.0.0.1:8081/documents/1",
                        new ToolContext("Bearer t", 1L, 1L), "get_document"));
        assertEquals("INVALID_PATH", ex.getCode());
    }
}
