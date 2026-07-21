package com.knowledge.base.ai.rag.retriever.es;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch._types.FieldValue;
import co.elastic.clients.elasticsearch._types.query_dsl.BoolQuery;
import co.elastic.clients.elasticsearch._types.query_dsl.TextQueryType;
import co.elastic.clients.elasticsearch.core.SearchResponse;
import co.elastic.clients.elasticsearch.core.search.Hit;
import co.elastic.clients.elasticsearch.core.search.InnerHitsResult;
import co.elastic.clients.json.JsonData;
import com.knowledge.base.ai.rag.entity.KbChunkDoc;
import com.knowledge.base.ai.rag.retriever.KeywordRetriever;
import com.knowledge.base.ai.rag.support.HybridSearchFusion;
import com.knowledge.base.ai.rag.support.RagAclContext;
import com.knowledge.base.ai.rag.support.RagAclContextResolver;
import com.knowledge.base.ai.rag.support.RagAclQuerySupport;
import com.knowledge.base.ai.vo.Bm25CollapsePageVO;
import com.knowledge.base.ai.vo.Bm25CollapsedDocumentVO;
import com.knowledge.base.ai.vo.RagSearchResultVO;
import com.knowledge.base.common.config.IntelligenceIndexingProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHit;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.data.elasticsearch.core.query.Criteria;
import org.springframework.data.elasticsearch.core.query.CriteriaQuery;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Elasticsearch BM25 关键词检索器
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "rag.vector-store", havingValue = "elasticsearch", matchIfMissing = true)
public class ElasticsearchKeywordRetriever implements KeywordRetriever {

    private static final String MINIMUM_TERM_COVERAGE = "50%";

    /**
     * 多字段 BM25：标题权重高于正文（市面常见 3～10 倍档）。
     */
    private static final List<String> BM25_MULTI_MATCH_FIELDS = List.of(
            "document_title^5",
            "document_title.standard^6",
            "content^1.5",
            "content.standard^2"
    );

    /** 标题短语匹配加分（接近整句标题命中时显著抬升） */
    private static final float TITLE_PHRASE_BOOST = 10f;

    /**
     * 正文 keyword 通配仅用于短标识符兜底；超过此长度或含空白则不加（避免整句 *...*）。
     */
    private static final int CONTENT_WILDCARD_MAX_LEN = 16;

    /** 通配兜底极低权重，不当主通路 */
    private static final float CONTENT_WILDCARD_BOOST = 0.2f;

    private final ElasticsearchClient esClient;
    private final ElasticsearchOperations esOperations;
    private final IntelligenceIndexingProperties indexingProperties;
    private final RagAclContextResolver aclContextResolver;

    /** {@inheritDoc} */
    @Override
    public List<HybridSearchFusion.FusionCandidate> retrieveCandidates(String queryText, int topK) {
        if (queryText != null) {
            queryText = queryText.trim();
        }
        return bm25Search(queryText, topK).stream()
                .map(this::toCandidate)
                .collect(Collectors.toList());
    }

    /** {@inheritDoc} */
    @Override
    public List<RagSearchResultVO> retrieve(String queryText, int topK) {
        if (queryText != null) {
            queryText = queryText.trim();
        }
        if (!StringUtils.hasText(queryText) || topK <= 0) {
            return List.of();
        }
        return bm25Search(queryText, topK).stream()
                .map(this::toRagSearchResult)
                .collect(Collectors.toList());
    }

    /** {@inheritDoc} */
    @Override
    public Bm25CollapsePageVO retrieveCollapsed(String queryText, int from, int size,
                                                int innerHitsPerDoc, List<Long> categoryIds) {
        if (queryText != null) {
            queryText = queryText.trim();
        }
        if (!StringUtils.hasText(queryText) || size <= 0) {
            return Bm25CollapsePageVO.builder().total(0L).documents(List.of()).build();
        }
        try {
            return bm25SearchCollapsed(queryText, from, size, innerHitsPerDoc, categoryIds);
        } catch (Exception e) {
            log.warn("BM25 collapse 搜索失败，降级为内存聚合：{}", e.getMessage());
            return bm25SearchCollapsedFallback(queryText, from, size, innerHitsPerDoc, categoryIds);
        }
    }

    /**
     * BM25 collapse 搜索（ES field collapse + inner_hits + cardinality 总数）
     */
    private Bm25CollapsePageVO bm25SearchCollapsed(String queryText, int from, int size,
                                                   int innerHitsPerDoc, List<Long> categoryIds) throws Exception {
        SearchResponse<Map> response = esClient.search(s -> {
            s.index(chunkIndexName()).from(from).size(size);
            s.trackTotalHits(t -> t.enabled(true));
            s.query(q -> q.bool(b -> {
                appendBm25ShouldClauses(b, queryText);
                b.minimumShouldMatch("1");
                b.filter(f -> f.term(t -> t.field("doc_status").value(1)));
                appendCategoryFilter(b, categoryIds, "category_id");
                RagAclQuerySupport.appendChunkAclFilter(b, currentAcl());
                return b;
            }));
            s.collapse(c -> c
                    .field("document_id")
                    .innerHits(ih -> ih
                            .name("top_chunks")
                            .size(innerHitsPerDoc)
                            .highlight(h -> h
                                    .preTags("<em>").postTags("</em>")
                                    .fields("content", hf -> hf.fragmentSize(150).numberOfFragments(2)))));
            s.highlight(h -> h
                    .preTags("<em>").postTags("</em>")
                    .fields("content", hf -> hf.fragmentSize(150).numberOfFragments(2)));
            s.aggregations("unique_docs", a -> a.cardinality(c -> c.field("document_id")));
            return s;
        }, Map.class);

        long total = 0L;
        if (response.aggregations() != null && response.aggregations().containsKey("unique_docs")) {
            total = (long) response.aggregations().get("unique_docs").cardinality().value();
        } else if (response.hits().total() != null) {
            total = response.hits().total().value();
        }

        List<Bm25CollapsedDocumentVO> documents = new ArrayList<>();
        for (Hit<Map> hit : response.hits().hits()) {
            Bm25CollapsedDocumentVO doc = parseCollapsedDocumentHit(hit, queryText);
            if (doc != null) {
                documents.add(doc);
            }
        }

        return Bm25CollapsePageVO.builder()
                .total(total)
                .documents(documents)
                .build();
    }

    /**
     * 解析 collapse 外层命中及 inner_hits 为文档级结果
     */
    private Bm25CollapsedDocumentVO parseCollapsedDocumentHit(Hit<Map> hit, String queryText) {
        Map<String, Object> source = hit.source();
        if (source == null) {
            return null;
        }

        Long documentId = toLong(source.get("document_id"));
        List<RagSearchResultVO> chunks = new ArrayList<>();
        chunks.add(toCollapsedChunkResult(hit, source, queryText));

        if (hit.innerHits() != null && hit.innerHits().containsKey("top_chunks")) {
            InnerHitsResult innerHits = hit.innerHits().get("top_chunks");
            if (innerHits != null && innerHits.hits() != null) {
                for (Hit<JsonData> innerHit : innerHits.hits().hits()) {
                    Map<String, Object> innerSource = innerHit.source() != null
                            ? innerHit.source().to(Map.class) : null;
                    if (innerSource == null) {
                        continue;
                    }
                    String innerChunkId = (String) innerSource.get("chunk_id");
                    if (innerChunkId != null && chunks.stream().anyMatch(c -> innerChunkId.equals(c.getChunkId()))) {
                        continue;
                    }
                    chunks.add(toCollapsedChunkResultFromMap(innerHit, innerSource, queryText));
                }
            }
        }

        double score = hit.score() != null ? hit.score() : 0.0;
        return Bm25CollapsedDocumentVO.builder()
                .documentId(documentId)
                .documentTitle((String) source.get("document_title"))
                .publishTime((String) source.get("publish_time"))
                .score(score)
                .chunks(chunks)
                .build();
    }

    /**
     * 将 collapse 外层 chunk 命中转为 RAG VO
     */
    private RagSearchResultVO toCollapsedChunkResult(Hit<Map> hit, Map<String, Object> source, String queryText) {
        String content = extractHighlightedContent(hit.highlight(), (String) source.get("content"), queryText);
        return RagSearchResultVO.builder()
                .chunkId((String) source.get("chunk_id"))
                .documentId(toLong(source.get("document_id")))
                .documentTitle((String) source.get("document_title"))
                .content(content)
                .heading((String) source.get("heading"))
                .publishTime((String) source.get("publish_time"))
                .score(hit.score() != null ? hit.score() : 0.0)
                .bm25Score(hit.score() != null ? hit.score() : 0.0)
                .build();
    }

    /**
     * 将 inner_hits chunk 命中转为 RAG VO
     */
    private RagSearchResultVO toCollapsedChunkResultFromMap(Hit<JsonData> hit,
                                                            Map<String, Object> source,
                                                            String queryText) {
        Map<String, List<String>> highlight = hit.highlight();
        String content = extractHighlightedContent(highlight, (String) source.get("content"), queryText);
        double score = hit.score() != null ? hit.score() : 0.0;
        return RagSearchResultVO.builder()
                .chunkId((String) source.get("chunk_id"))
                .documentId(toLong(source.get("document_id")))
                .documentTitle((String) source.get("document_title"))
                .content(content)
                .heading((String) source.get("heading"))
                .publishTime((String) source.get("publish_time"))
                .score(score)
                .bm25Score(score)
                .build();
    }

    /**
     * 优先取 ES 高亮片段，否则回退原文摘要
     */
    private String extractHighlightedContent(Map<String, List<String>> highlight,
                                             String rawContent,
                                             String queryText) {
        if (highlight != null && highlight.containsKey("content")) {
            List<String> fragments = highlight.get("content");
            if (fragments != null && !fragments.isEmpty()) {
                return fragments.get(0);
            }
        }
        if (rawContent != null && rawContent.length() > 200) {
            return rawContent.substring(0, 200) + "...";
        }
        return rawContent;
    }

    /**
     * collapse 降级：拉取有限 chunk 后在内存按 documentId 聚合分页
     */
    private Bm25CollapsePageVO bm25SearchCollapsedFallback(String queryText, int from, int size,
                                                           int innerHitsPerDoc, List<Long> categoryIds) {
        int fetchSize = Math.min((from + size) * innerHitsPerDoc, 500);
        List<ChunkHit> chunks = bm25Search(queryText, fetchSize);
        Map<Long, Bm25CollapsedDocumentVO> docMap = new LinkedHashMap<>();

        for (ChunkHit item : chunks) {
            if (item.documentId == null) {
                continue;
            }
            RagSearchResultVO chunkVo = toRagSearchResult(item);
            Bm25CollapsedDocumentVO existing = docMap.get(item.documentId);
            if (existing == null) {
                docMap.put(item.documentId, Bm25CollapsedDocumentVO.builder()
                        .documentId(item.documentId)
                        .documentTitle(item.documentTitle)
                        .publishTime(item.publishTime)
                        .score(item.score)
                        .chunks(new ArrayList<>(List.of(chunkVo)))
                        .build());
            } else if (existing.getChunks().size() < innerHitsPerDoc) {
                existing.getChunks().add(chunkVo);
                if (item.score > existing.getScore()) {
                    existing.setScore(item.score);
                }
            }
        }

        List<Bm25CollapsedDocumentVO> all = new ArrayList<>(docMap.values());
        int start = Math.min(from, all.size());
        int end = Math.min(from + size, all.size());
        return Bm25CollapsePageVO.builder()
                .total((long) all.size())
                .documents(all.subList(start, end))
                .build();
    }

    /**
     * BM25 关键词搜索（chunk 索引：标题加权 + 标题短语；短词才通配兜底）
     */
    private List<ChunkHit> bm25Search(String queryText, int topK) {
        try {
            SearchResponse<Map> response = esClient.search(s -> {
                s.index(chunkIndexName()).size(topK);
                s.query(q -> q.bool(b -> {
                    appendBm25ShouldClauses(b, queryText);
                    b.minimumShouldMatch("1");
                    b.filter(f -> f.term(t -> t.field("doc_status").value(1)));
                    RagAclQuerySupport.appendChunkAclFilter(b, currentAcl());
                    return b;
                }));
                s.highlight(h -> h
                        .preTags("<em>").postTags("</em>")
                        .fields("content", hf -> hf.fragmentSize(150).numberOfFragments(2)));
                return s;
            }, Map.class);

            List<ChunkHit> results = new ArrayList<>();
            for (Hit<Map> hit : response.hits().hits()) {
                Map<String, Object> source = hit.source();
                if (source == null) {
                    continue;
                }
                ChunkHit sr = ChunkHit.of(
                        (String) source.get("chunk_id"),
                        toLong(source.get("document_id")),
                        (String) source.get("document_title"),
                        (String) source.get("content"),
                        (String) source.get("heading"),
                        hit.score() != null ? hit.score().doubleValue() : 0.0);
                sr.publishTime = (String) source.get("publish_time");
                sr.isPublic = toBoolean(source.get("is_public"));
                sr.authorId = toLong(source.get("author_id"));
                sr.teamId = toLong(source.get("team_id"));
                if (hit.highlight() != null && hit.highlight().containsKey("content")) {
                    List<String> fragments = hit.highlight().get("content");
                    if (fragments != null && !fragments.isEmpty()) {
                        sr.content = fragments.get(0);
                    }
                }
                results.add(sr);
            }
            return results;
        } catch (Exception e) {
            log.warn("BM25搜索失败，尝试降级 match 查询：{}", e.getMessage());
            return bm25SearchFallback(queryText, topK);
        }
    }

    /**
     * BM25 降级查询（兼容旧索引缺少 multi-field 映射的场景）
     */
    private List<ChunkHit> bm25SearchFallback(String queryText, int topK) {
        try {
            Criteria criteria = new Criteria("content").matches(queryText)
                    .or(new Criteria("document_title").matches(queryText));
            CriteriaQuery query = new CriteriaQuery(criteria);
            query.setMaxResults(topK);

            SearchHits<KbChunkDoc> hits = esOperations.search(query, KbChunkDoc.class);

            List<ChunkHit> results = new ArrayList<>();
            for (SearchHit<KbChunkDoc> hit : hits) {
                KbChunkDoc doc = hit.getContent();
                ChunkHit sr = ChunkHit.of(doc.getChunkId(), doc.getDocumentId(),
                        doc.getDocumentTitle(), doc.getContent(), doc.getHeading(),
                        hit.getScore());
                sr.publishTime = doc.getPublishTime();
                sr.isPublic = doc.getIsPublic();
                sr.authorId = doc.getAuthorId();
                sr.teamId = doc.getTeamId();
                results.add(sr);
            }
            return results;
        } catch (Exception e) {
            log.warn("BM25降级搜索失败：{}", e.getMessage());
            return List.of();
        }
    }

    /**
     * 追加 BM25 should：multi_match（主召回）+ 标题 phrase（加分）；
     * 仅短标识符才加正文 keyword 通配（低 boost），避免整句 *...*。
     *
     * @param bool      bool 查询构建器
     * @param queryText 用户查询（调用方已 trim）
     */
    private void appendBm25ShouldClauses(BoolQuery.Builder bool, String queryText) {
        bool.should(sh -> sh.multiMatch(mm -> mm
                .query(queryText)
                .fields(BM25_MULTI_MATCH_FIELDS)
                .type(TextQueryType.BestFields)
                .minimumShouldMatch(MINIMUM_TERM_COVERAGE)));
        bool.should(sh -> sh.matchPhrase(mp -> mp
                .field("document_title")
                .query(queryText)
                .slop(2)
                .boost(TITLE_PHRASE_BOOST)));
        if (allowContentWildcard(queryText)) {
            String pattern = "*" + escapeWildcard(queryText) + "*";
            bool.should(sh -> sh.wildcard(w -> w
                    .field("content.keyword")
                    .value(pattern)
                    .caseInsensitive(true)
                    .boost(CONTENT_WILDCARD_BOOST)));
        }
    }

    /**
     * 是否允许正文 keyword 通配：仅短、无空白查询（如类名/短词），长句不用。
     *
     * @param queryText 查询
     * @return true 时追加低权通配
     */
    private boolean allowContentWildcard(String queryText) {
        if (!StringUtils.hasText(queryText)) {
            return false;
        }
        String q = queryText.trim();
        return q.length() <= CONTENT_WILDCARD_MAX_LEN && !q.contains(" ");
    }

    /**
     * 转义 wildcard 查询中的特殊字符。
     *
     * @param text 原文
     * @return 转义后文本
     */
    private String escapeWildcard(String text) {
        if (text == null) {
            return "";
        }
        return text.replace("\\", "\\\\")
                .replace("*", "\\*")
                .replace("?", "\\?");
    }

    /**
     * 将内部命中转为 RAG VO
     */
    private RagSearchResultVO toRagSearchResult(ChunkHit sr) {
        return RagSearchResultVO.builder()
                .chunkId(sr.chunkId)
                .documentId(sr.documentId)
                .documentTitle(sr.documentTitle)
                .content(sr.content)
                .heading(sr.heading)
                .publishTime(sr.publishTime)
                .score(sr.score)
                .bm25Score(sr.score)
                .isPublic(sr.isPublic)
                .authorId(sr.authorId)
                .teamId(sr.teamId)
                .build();
    }

    /**
     * 将内部命中转为融合候选
     */
    private HybridSearchFusion.FusionCandidate toCandidate(ChunkHit sr) {
        return HybridSearchFusion.FusionCandidate.of(
                sr.chunkId, sr.documentId, sr.documentTitle, sr.content, sr.heading, sr.publishTime, sr.score,
                sr.isPublic, sr.authorId, sr.teamId);
    }

    /**
     * 为 ES bool 查询追加分类 terms 过滤
     */
    private void appendCategoryFilter(BoolQuery.Builder bool, List<Long> categoryIds, String field) {
        if (categoryIds == null || categoryIds.isEmpty()) {
            return;
        }
        List<FieldValue> values = categoryIds.stream()
                .map(FieldValue::of)
                .collect(Collectors.toList());
        bool.filter(f -> f.terms(t -> t.field(field).terms(tv -> tv.value(values))));
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

    /**
     * 解析当前请求 ACL（查询期 filter 用）
     *
     * @return ACL 上下文
     */
    private RagAclContext currentAcl() {
        return aclContextResolver.resolve();
    }

    /**
     * chunk 级命中内部结构
     */
    private static class ChunkHit {
        String chunkId;
        Long documentId;
        String documentTitle;
        String content;
        String heading;
        double score;
        String publishTime;
        Boolean isPublic;
        Long authorId;
        Long teamId;

        static ChunkHit of(String chunkId, Long documentId, String documentTitle,
                           String content, String heading, double score) {
            ChunkHit sr = new ChunkHit();
            sr.chunkId = chunkId;
            sr.documentId = documentId;
            sr.documentTitle = documentTitle;
            sr.content = content;
            sr.heading = heading;
            sr.score = score;
            return sr;
        }
    }
}
