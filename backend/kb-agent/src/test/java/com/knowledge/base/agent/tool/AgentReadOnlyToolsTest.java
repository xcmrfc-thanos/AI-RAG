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
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/**
 * Agent 第一批只读工具契约测试
 */
class AgentReadOnlyToolsTest {

    private MockRestServiceServer server;
    private GatewayToolHttpClient httpClient;
    private final ToolContext context = new ToolContext("Bearer token", 1L, 2L);

    @BeforeEach
    void setUp() {
        AgentProperties properties = new AgentProperties();
        properties.setGatewayBaseUrl("http://gateway.test:8080");
        RestTemplate restTemplate = new RestTemplate();
        server = MockRestServiceServer.createServer(restTemplate);
        httpClient = new GatewayToolHttpClient(properties, restTemplate, new ObjectMapper());
    }

    @Test
    void listDocumentsUsesBoundedGatewayQueryAndNormalizesOutput() {
        server.expect(requestTo("http://gateway.test:8080/api/document/documents/page"
                        + "?current=1&size=2&keyword=agent&sortBy=publishTime&sortOrder=desc"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess("""
                        {"code":0,"data":{"total":3,"records":[
                          {"id":11,"title":"T1","summary":"S1","authorName":"A1"},
                          {"id":12,"title":"T2","summary":"S2","authorName":"A2"}
                        ]}}
                        """, MediaType.APPLICATION_JSON));

        Map<String, Object> out = new ListDocumentsTool(httpClient).execute(
                Map.of("size", 2, "keyword", "agent", "sortBy", "publishTime", "sortOrder", "desc"),
                context);

        assertEquals(3L, out.get("total"));
        assertEquals(2, out.get("count"));
        assertTrue(String.valueOf(out.get("untrustedCorpus")).contains("<<<UNTRUSTED_DATA"));
        server.verify();
    }

    @Test
    void listCategoriesReturnsTreeAndFlatItems() {
        server.expect(requestTo("http://gateway.test:8080/api/document/categories/tree"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess("""
                        {"code":0,"data":[{"id":1,"name":"根","children":[
                          {"id":2,"name":"子","children":[]}
                        ]}]}
                        """, MediaType.APPLICATION_JSON));

        Map<String, Object> out = new ListCategoriesTool(httpClient).execute(Map.of(), context);

        assertEquals(2, out.get("count"));
        assertEquals(1, ((java.util.List<?>) out.get("categories")).size());
        assertEquals(2, ((java.util.List<?>) out.get("flatCategories")).size());
        server.verify();
    }

    @Test
    void listTagsSwitchesBetweenHotAndCategoryRoutes() {
        server.expect(requestTo("http://gateway.test:8080/api/document/api/tags/hot?limit=3"))
                .andRespond(withSuccess("""
                        {"code":0,"data":[{"id":1,"tagName":"Java","docCount":8}]}
                        """, MediaType.APPLICATION_JSON));
        server.expect(requestTo("http://gateway.test:8080/api/document/api/tags/category/9"))
                .andRespond(withSuccess("""
                        {"code":0,"data":[{"id":2,"tagName":"Agent","categoryId":9}]}
                        """, MediaType.APPLICATION_JSON));

        Map<String, Object> hot = new ListTagsTool(httpClient).execute(Map.of("limit", 3), context);
        assertEquals(1, hot.get("count"));
        Map<String, Object> category = new ListTagsTool(httpClient).execute(
                Map.of("categoryId", 9), context);
        assertEquals(1, category.get("count"));
        server.verify();
    }

    @Test
    void rejectsOversizedListArguments() {
        assertEquals("INVALID_ARGUMENT", assertThrows(ToolException.class,
                () -> new ListDocumentsTool(httpClient).execute(Map.of("size", 21), context)).getCode());
        assertEquals("INVALID_ARGUMENT", assertThrows(ToolException.class,
                () -> new ListTagsTool(httpClient).execute(Map.of("limit", 51), context)).getCode());
    }

    @Test
    void hotDocumentsFiltersByDocumentAclProbe() {
        server.expect(requestTo("http://gateway.test:8080/api/statistics/hot/document?type=composite&size=18"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess("""
                        {"code":0,"data":[
                          {"documentId":11,"title":"Visible","summary":"S1","viewCount":9},
                          {"documentId":22,"title":"Hidden","summary":"S2","viewCount":8}
                        ]}
                        """, MediaType.APPLICATION_JSON));
        server.expect(requestTo("http://gateway.test:8080/api/document/documents/11"))
                .andRespond(withSuccess("{\"code\":200,\"data\":{\"id\":11,\"title\":\"Visible\"}}",
                        MediaType.APPLICATION_JSON));
        server.expect(requestTo("http://gateway.test:8080/api/document/documents/22"))
                .andRespond(withSuccess("{\"code\":403,\"message\":\"forbidden\",\"data\":null}",
                        MediaType.APPLICATION_JSON));

        Map<String, Object> out = new HotDocumentsTool(httpClient).execute(Map.of("size", 6), context);
        assertEquals(1, out.get("count"));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> docs = (List<Map<String, Object>>) out.get("documents");
        assertEquals(11L, docs.get(0).get("documentId"));
        server.verify();
    }

    @Test
    void graphSearchKeepsOnlyAclVisibleDocumentNodes() {
        server.expect(requestTo("http://gateway.test:8080/api/graph/search?keyword=React"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess("""
                        {"code":0,"data":[
                          {"id":"n1","name":"DocA","type":"KnowledgeDocument","documentId":"101"},
                          {"id":"n2","name":"DocB","type":"KnowledgeDocument","documentId":"102"}
                        ]}
                        """, MediaType.APPLICATION_JSON));
        server.expect(requestTo("http://gateway.test:8080/api/document/documents/101"))
                .andRespond(withSuccess("{\"code\":200,\"data\":{\"id\":101,\"title\":\"DocA\"}}",
                        MediaType.APPLICATION_JSON));
        server.expect(requestTo("http://gateway.test:8080/api/document/documents/102"))
                .andRespond(withSuccess("{\"code\":403,\"data\":null}", MediaType.APPLICATION_JSON));

        Map<String, Object> out = new GraphSearchTool(httpClient).execute(
                Map.of("keyword", "React", "limit", 10), context);
        assertEquals(1, out.get("count"));
        server.verify();
    }
}
