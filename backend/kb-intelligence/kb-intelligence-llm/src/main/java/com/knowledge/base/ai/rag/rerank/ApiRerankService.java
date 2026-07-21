package com.knowledge.base.ai.rag.rerank;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.knowledge.base.ai.config.RagProperties;
import com.knowledge.base.ai.vo.RagSearchResultVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * 专用 Rerank HTTP 客户端（硅基 /v1/rerank、通义 /reranks、custom）。
 *
 * @author knowledge-base-team
 * @since 1.0.0
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ApiRerankService {

    private final RerankProviderResolver resolver;
    private final RagProperties ragProperties;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    /**
     * 对候选重排并截断到 topK。
     *
     * @param query      用户查询
     * @param candidates 候选列表
     * @param topK       返回条数
     * @return 重排后的结果
     */
    public List<RagSearchResultVO> rerank(String query, List<RagSearchResultVO> candidates, int topK) {
        if (candidates == null || candidates.isEmpty()) {
            return List.of();
        }
        ResolvedRerank cfg = resolver.resolve();
        if (!cfg.usable()) {
            throw new IllegalStateException("API rerank not usable: provider/credentials missing");
        }
        int effectiveTopK = Math.max(1, topK);
        int configuredTopN = ragProperties.getRerank().getTopN();
        int topN = configuredTopN > 0 ? Math.min(configuredTopN, effectiveTopK) : effectiveTopK;

        try {
            String body = buildRequestBody(cfg.model(), query, candidates, topN);
            String url = cfg.baseUrl() + cfg.endpointPath();
            HttpRequest.Builder req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofMillis(Math.max(1000, ragProperties.getRerank().getTimeoutMs())))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body));
            if (StringUtils.hasText(cfg.apiKey())) {
                req.header("Authorization", "Bearer " + cfg.apiKey());
            }
            HttpResponse<String> response = httpClient.send(req.build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new IllegalStateException("rerank HTTP " + response.statusCode() + ": "
                        + truncate(response.body(), 200));
            }
            return applyScores(candidates, parseResults(response.body()), topN);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("rerank interrupted", e);
        } catch (Exception e) {
            if (e instanceof IllegalStateException ise) {
                throw ise;
            }
            throw new IllegalStateException("rerank failed: " + e.getMessage(), e);
        }
    }

    /**
     * 解析厂商 JSON 为 (index, score) 列表。
     *
     * @param json 响应体
     * @return 结果项
     */
    static List<ScoredIndex> parseResults(String json) throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        JsonNode root = mapper.readTree(json);
        JsonNode results = root.get("results");
        if (results == null || !results.isArray()) {
            JsonNode output = root.get("output");
            if (output != null) {
                results = output.get("results");
            }
        }
        if (results == null || !results.isArray()) {
            throw new IllegalStateException("rerank response missing results");
        }
        List<ScoredIndex> list = new ArrayList<>();
        for (JsonNode item : results) {
            int index = item.path("index").asInt(-1);
            double score = item.path("relevance_score").asDouble(
                    item.path("relevanceScore").asDouble(0));
            if (index >= 0) {
                list.add(new ScoredIndex(index, score));
            }
        }
        list.sort(Comparator.comparingDouble(ScoredIndex::score).reversed());
        return list;
    }

    /**
     * 按解析结果重排候选。
     *
     * @param candidates 原列表
     * @param scored     解析分
     * @param topN       截断
     * @return VO 列表
     */
    static List<RagSearchResultVO> applyScores(List<RagSearchResultVO> candidates,
                                               List<ScoredIndex> scored,
                                               int topN) {
        List<RagSearchResultVO> out = new ArrayList<>();
        for (ScoredIndex s : scored) {
            if (s.index() >= candidates.size()) {
                continue;
            }
            RagSearchResultVO vo = candidates.get(s.index());
            vo.setRerankScore(s.score());
            vo.setScore(s.score());
            out.add(vo);
            if (out.size() >= topN) {
                break;
            }
        }
        if (out.isEmpty()) {
            return candidates.stream().limit(topN).toList();
        }
        return out;
    }

    private String buildRequestBody(String model, String query,
                                    List<RagSearchResultVO> candidates, int topN) throws Exception {
        ObjectNode root = objectMapper.createObjectNode();
        root.put("model", model);
        root.put("query", query != null ? query : "");
        ArrayNode docs = root.putArray("documents");
        for (RagSearchResultVO c : candidates) {
            // 标题+正文，避免标题全匹配文档因正文是代码片段而被重排压低
            docs.add(RerankDocumentText.compose(c));
        }
        root.put("top_n", topN);
        root.put("return_documents", false);
        return objectMapper.writeValueAsString(root);
    }

    private static String truncate(String s, int max) {
        if (s == null) {
            return "";
        }
        return s.length() <= max ? s : s.substring(0, max);
    }

    /**
     * 解析项。
     *
     * @param index 原 documents 下标
     * @param score 相关分
     */
    record ScoredIndex(int index, double score) {
    }
}
