package com.knowledge.base.ai.rag.retriever.es;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch._types.query_dsl.Query;
import co.elastic.clients.elasticsearch.core.SearchRequest;
import co.elastic.clients.elasticsearch.core.SearchResponse;
import co.elastic.clients.elasticsearch.core.search.Hit;
import co.elastic.clients.json.JsonData;
import com.knowledge.base.ai.rag.retriever.DenseRetriever;
import com.knowledge.base.ai.rag.support.HybridSearchFusion;
import com.knowledge.base.ai.rag.support.RagAclContextResolver;
import com.knowledge.base.ai.rag.support.RagAclQuerySupport;
import com.knowledge.base.common.config.IntelligenceIndexingProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Elasticsearch 稠密向量检索器（script_score cosine）
 *
 * <p>开启 Qdrant 旁路时由 {@code QdrantDenseRetriever} 接管 dense 通道。</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnExpression("'${rag.vector-store:elasticsearch}'.equalsIgnoreCase('elasticsearch') && !${rag.qdrant.enabled:false}")
public class ElasticsearchDenseRetriever implements DenseRetriever {

    private final ElasticsearchClient esClient;
    private final IntelligenceIndexingProperties indexingProperties;
    private final RagAclContextResolver aclContextResolver;

    /** {@inheritDoc} */
    @Override
    public List<HybridSearchFusion.FusionCandidate> retrieve(float[] queryEmbedding, int topK) {
        if (queryEmbedding == null || topK <= 0) {
            return List.of();
        }
        try {
            Query scriptScoreQuery = Query.of(q -> q
                    .scriptScore(ss -> ss
                            .query(sq -> sq.bool(b -> {
                                b.must(m -> m.matchAll(ma -> ma));
                                RagAclQuerySupport.appendChunkAclFilter(b, aclContextResolver.resolve());
                                return b;
                            }))
                            .script(s -> s.inline(i -> i
                                    .source("cosineSimilarity(params.query_vector, 'embedding') + 1.0")
                                    .params("query_vector", JsonData.of(toFloatList(queryEmbedding)))))));

            SearchRequest request = SearchRequest.of(s -> s
                    .index(chunkIndexName())
                    .query(scriptScoreQuery)
                    .size(topK));

            SearchResponse<Map> response = esClient.search(request, Map.class);

            List<HybridSearchFusion.FusionCandidate> results = new ArrayList<>();
            for (Hit<Map> hit : response.hits().hits()) {
                Map<String, Object> source = hit.source();
                if (source == null) {
                    continue;
                }
                results.add(HybridSearchFusion.FusionCandidate.of(
                        (String) source.get("chunk_id"),
                        toLong(source.get("document_id")),
                        (String) source.get("document_title"),
                        (String) source.get("content"),
                        (String) source.get("heading"),
                        (String) source.get("publish_time"),
                        hit.score() != null ? hit.score().doubleValue() : 0.0,
                        toBoolean(source.get("is_public")),
                        toLong(source.get("author_id")),
                        toLong(source.get("team_id"))));
            }
            return results;
        } catch (Exception e) {
            log.warn("kNN搜索失败：{}", e.getMessage());
            return List.of();
        }
    }

    private static List<Float> toFloatList(float[] array) {
        List<Float> list = new ArrayList<>(array.length);
        for (float v : array) {
            list.add(v);
        }
        return list;
    }

    private Long toLong(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number) {
            return ((Number) value).longValue();
        }
        try {
            return Long.parseLong(value.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Boolean toBoolean(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Boolean b) {
            return b;
        }
        if (value instanceof Number n) {
            return n.intValue() == 1;
        }
        String s = value.toString().trim();
        if ("true".equalsIgnoreCase(s) || "1".equals(s)) {
            return true;
        }
        if ("false".equalsIgnoreCase(s) || "0".equals(s)) {
            return false;
        }
        return null;
    }

    private String chunkIndexName() {
        return indexingProperties.getChunkIndex();
    }
}
