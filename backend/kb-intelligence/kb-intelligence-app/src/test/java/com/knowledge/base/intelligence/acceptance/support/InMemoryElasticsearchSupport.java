package com.knowledge.base.intelligence.acceptance.support;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch.core.DeleteByQueryRequest;
import co.elastic.clients.elasticsearch.core.DeleteByQueryResponse;
import co.elastic.clients.elasticsearch.core.BulkRequest;
import co.elastic.clients.elasticsearch.core.BulkResponse;
import co.elastic.clients.elasticsearch.core.SearchRequest;
import co.elastic.clients.elasticsearch.core.SearchResponse;
import co.elastic.clients.elasticsearch.core.search.Hit;
import co.elastic.clients.elasticsearch.core.search.HitsMetadata;
import co.elastic.clients.elasticsearch.core.search.TotalHits;
import co.elastic.clients.elasticsearch.core.search.TotalHitsRelation;
import co.elastic.clients.json.JsonData;
import com.knowledge.base.search.entity.DocumentIndex;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHit;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.data.elasticsearch.core.query.Query;

import co.elastic.clients.util.ObjectBuilder;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * 进程内内存 ES 替身：供无 Docker 环境的 @SpringBootTest E2E 使用。
 */
public final class InMemoryElasticsearchSupport {

    private final Map<String, Map<String, Object>> documents = new ConcurrentHashMap<>();
    private final Map<String, Map<String, Object>> chunks = new ConcurrentHashMap<>();

    /**
     * 清空索引数据。
     */
    public void reset() {
        documents.clear();
        chunks.clear();
    }

    /**
     * 注册 Spring Data ES 写入行为。
     *
     * @param operations ElasticsearchOperations mock
     */
    public void wireElasticsearchOperations(ElasticsearchOperations operations) {
        doAnswer(invocation -> {
            Object entity = invocation.getArgument(0);
            if (entity instanceof DocumentIndex docIndex) {
                Map<String, Object> stored = new HashMap<>();
                stored.put("title", docIndex.getTitle());
                stored.put("summary", docIndex.getSummary());
                stored.put("docStatus", docIndex.getDocStatus());
                stored.put("categoryId", docIndex.getCategoryId());
                stored.put("isPublic", docIndex.getIsPublic());
                stored.put("creatorId", docIndex.getCreatorId());
                stored.put("teamId", docIndex.getTeamId());
                documents.put(docIndex.getId(), stored);
            }
            return entity;
        }).when(operations).save(any(DocumentIndex.class));

        when(operations.search(any(Query.class), eq(DocumentIndex.class)))
                .thenAnswer(invocation -> documentSearchHits());
    }

    @SuppressWarnings("unchecked")
    private SearchHits<DocumentIndex> documentSearchHits() {
        List<SearchHit<DocumentIndex>> hits = new ArrayList<>();
        for (Map.Entry<String, Map<String, Object>> entry : documents.entrySet()) {
            Map<String, Object> source = entry.getValue();
            DocumentIndex document = DocumentIndex.builder()
                    .id(entry.getKey())
                    .title((String) source.get("title"))
                    .summary((String) source.get("summary"))
                    .docStatus((Integer) source.get("docStatus"))
                    .categoryId((Long) source.get("categoryId"))
                    .isPublic((Boolean) source.get("isPublic"))
                    .creatorId((Long) source.get("creatorId"))
                    .teamId((Long) source.get("teamId"))
                    .build();
            SearchHit<DocumentIndex> hit = mock(SearchHit.class);
            when(hit.getContent()).thenReturn(document);
            hits.add(hit);
        }
        SearchHits<DocumentIndex> searchHits = mock(SearchHits.class);
        when(searchHits.getSearchHits()).thenReturn(hits);
        return searchHits;
    }

    /**
     * 注册 low-level ES Client 的 bulk / search / refresh 行为。
     *
     * @param esClient ElasticsearchClient mock
     */
    public void wireElasticsearchClient(ElasticsearchClient esClient) throws Exception {
        when(esClient.bulk(any(BulkRequest.class))).thenAnswer(invocation -> {
            BulkRequest request = invocation.getArgument(0);
            request.operations().forEach(op -> {
                if (op.isIndex()) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> doc = new HashMap<>((Map<? extends String, ? extends Object>) op.index().document());
                    String id = op.index().id();
                    if (id == null && doc.get("chunk_id") != null) {
                        id = doc.get("chunk_id").toString();
                    }
                    if (id != null) {
                        chunks.put(id, doc);
                    }
                }
            });
            return BulkResponse.of(b -> b.errors(false).items(List.of()).took(1L));
        });

        when(esClient.search(any(SearchRequest.class), eq(Map.class)))
                .thenAnswer(invocation -> searchInternal(resolveSearchRequest(invocation.getArgument(0))));

        when(esClient.search(any(Function.class), eq(Map.class)))
                .thenAnswer(invocation -> searchInternal(resolveSearchRequest(invocation.getArgument(0))));

        when(esClient.deleteByQuery(any(DeleteByQueryRequest.class)))
                .thenReturn(DeleteByQueryResponse.of(r -> r.deleted(0L).took(1L)));
    }

    /**
     * 解析 ES Client search 两种重载入参，统一为 SearchRequest。
     */
    @SuppressWarnings("unchecked")
    private SearchRequest resolveSearchRequest(Object requestArg) {
        if (requestArg instanceof SearchRequest request) {
            return request;
        }
        Function<SearchRequest.Builder, ObjectBuilder<SearchRequest>> builderFn =
                (Function<SearchRequest.Builder, ObjectBuilder<SearchRequest>>) requestArg;
        SearchRequest.Builder builder = new SearchRequest.Builder();
        builderFn.apply(builder);
        return builder.build();
    }

    /**
     * 在内存索引上执行 search 并返回 ES 响应结构。
     */
    private SearchResponse<Map> searchInternal(SearchRequest request) {
        List<String> indexes = request.index();
        String keyword = extractKeyword(request);
        int from = request.from() != null ? request.from() : 0;
        int size = request.size() != null ? request.size() : 10;
        List<Hit<Map>> hits;
        long total;
        if (indexes != null && indexes.stream().anyMatch(i -> i.contains("chunk"))) {
            hits = searchChunks(keyword, from, size);
            total = hits.size();
        } else {
            hits = searchDocuments(keyword, from, size);
            total = hits.size();
        }
        return buildSearchResponse(hits, total);
    }

    private List<Hit<Map>> searchDocuments(String keyword, int from, int size) {
        List<Hit<Map>> hits = new ArrayList<>();
        for (Map.Entry<String, Map<String, Object>> entry : documents.entrySet()) {
            Map<String, Object> source = entry.getValue();
            if (!matchesPublished(source)) {
                continue;
            }
            if (containsKeyword(source, keyword, "title", "summary")) {
                hits.add(Hit.of(h -> h.index("kb_document").id(entry.getKey()).source(source)));
            }
        }
        return paginate(hits, from, size);
    }

    private List<Hit<Map>> searchChunks(String keyword, int from, int size) {
        List<Hit<Map>> hits = new ArrayList<>();
        for (Map.Entry<String, Map<String, Object>> entry : chunks.entrySet()) {
            Map<String, Object> source = entry.getValue();
            if (!matchesPublished(source)) {
                continue;
            }
            if (containsKeyword(source, keyword, "content", "document_title")) {
                hits.add(Hit.of(h -> h.index("kb_chunk").id(entry.getKey()).source(source)));
            }
        }
        return paginate(hits, from, size);
    }

    private boolean matchesPublished(Map<String, Object> source) {
        Object status = source.get("docStatus");
        if (status == null) {
            status = source.get("doc_status");
        }
        return status == null || Integer.valueOf(1).equals(status);
    }

    private boolean containsKeyword(Map<String, Object> source, String keyword, String... fields) {
        if (keyword == null || keyword.isBlank()) {
            return true;
        }
        String lower = keyword.toLowerCase(Locale.ROOT);
        for (String field : fields) {
            Object value = source.get(field);
            if (value != null && value.toString().toLowerCase(Locale.ROOT).contains(lower)) {
                return true;
            }
        }
        return false;
    }

    private List<Hit<Map>> paginate(List<Hit<Map>> hits, int from, int size) {
        int end = Math.min(from + Math.max(size, 1), hits.size());
        if (from >= hits.size()) {
            return List.of();
        }
        return hits.subList(from, end);
    }

    private SearchResponse<Map> buildSearchResponse(List<Hit<Map>> hits, long total) {
        HitsMetadata<Map> metadata = HitsMetadata.of(h -> h
                .hits(hits)
                .total(TotalHits.of(t -> t.value(total).relation(TotalHitsRelation.Eq))));
        return SearchResponse.of(r -> r.hits(metadata).took(1L).timedOut(false).shards(s -> s
                .total(1).successful(1).failed(0)));
    }

    private String extractKeyword(SearchRequest request) {
        try {
            JsonData queryJson = JsonData.of(request.query());
            Map<?, ?> queryMap = queryJson.to(Map.class);
            return deepFindQueryText(queryMap);
        } catch (Exception e) {
            return "";
        }
    }

    @SuppressWarnings("unchecked")
    private String deepFindQueryText(Object node) {
        if (node instanceof Map<?, ?> map) {
            if (map.containsKey("query") && map.get("query") instanceof String text) {
                return text;
            }
            for (Object value : map.values()) {
                String found = deepFindQueryText(value);
                if (found != null && !found.isBlank()) {
                    return found;
                }
            }
        } else if (node instanceof List<?> list) {
            for (Object item : list) {
                String found = deepFindQueryText(item);
                if (found != null && !found.isBlank()) {
                    return found;
                }
            }
        }
        return "";
    }
}
