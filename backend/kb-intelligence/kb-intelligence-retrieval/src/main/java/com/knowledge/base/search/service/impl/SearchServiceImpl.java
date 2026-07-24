package com.knowledge.base.search.service.impl;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch._types.FieldValue;
import co.elastic.clients.elasticsearch._types.query_dsl.BoolQuery;
import co.elastic.clients.elasticsearch.core.SearchResponse;
import co.elastic.clients.elasticsearch.core.search.Hit;
import co.elastic.clients.elasticsearch.indices.CreateIndexRequest;
import co.elastic.clients.elasticsearch.indices.DeleteIndexRequest;
import co.elastic.clients.elasticsearch.indices.ExistsRequest;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.knowledge.base.common.config.IntelligenceIndexingProperties;
import com.knowledge.base.common.elasticsearch.ElasticsearchIndexDefinitionLoader;
import com.knowledge.base.common.exception.BusinessException;
import com.knowledge.base.common.result.PageResult;
import com.knowledge.base.common.security.DocumentVisibility;
import com.knowledge.base.common.utils.UserContextUtil;
import com.knowledge.base.ai.config.KbCoreInternalProperties;
import com.knowledge.base.ai.rag.service.RagRetrievalService;
import com.knowledge.base.ai.rag.service.VectorIndexService;
import com.knowledge.base.ai.vo.Bm25CollapsePageVO;
import com.knowledge.base.ai.vo.Bm25CollapsedDocumentVO;
import com.knowledge.base.ai.vo.RagSearchResultVO;
import com.knowledge.base.search.dto.SearchRequestDTO;
import com.knowledge.base.search.entity.DocumentIndex;
import com.knowledge.base.search.service.SearchService;
import com.knowledge.base.search.support.SearchAclContext;
import com.knowledge.base.search.support.SearchAclQuerySupport;
import com.knowledge.base.search.vo.SearchIndexHealthVO;
import com.knowledge.base.search.vo.SearchResultVO;
import com.knowledge.base.search.vo.SearchSuggestVO;
import com.knowledge.base.common.config.IntelligenceExecutorNames;
import jakarta.annotation.Resource;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHit;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.data.elasticsearch.core.query.Query;
import org.springframework.data.elasticsearch.core.query.StringQuery;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import java.util.Comparator;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * 搜索服务实现
 *
 * <p>提供两种搜索模式：</p>
 * <ol>
 *   <li><b>关键词搜索</b>：文档级（title/summary/tags）+ chunk 级 BM25 聚合，支持高亮</li>
 *   <li><b>混合智能搜索</b>：同进程调用 llm 模块的 BM25 + kNN + RRF 融合检索</li>
 * </ol>
 *
 * @author 苏三
 * @since 1.0.0
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SearchServiceImpl implements SearchService {

    private static final String MINIMUM_TERM_COVERAGE = "50%";

    // ==================== 依赖注入 ====================

    /** Intelligence BC 统一 ES 索引配置 */
    private final IntelligenceIndexingProperties indexingProperties;

    /** Spring Data ES 操作模板（查询、索引、删除） */
    private final ElasticsearchOperations elasticsearchOperations;

    /** ES 低级客户端（原生查询、索引管理） */
    private final ElasticsearchClient esClient;

    /** llm 模块 RAG 混合检索服务（同进程） */
    private final RagRetrievalService ragRetrievalService;

    /** chunk 向量索引服务（关键词正文检索） */
    private final VectorIndexService vectorIndexService;

    /** Intelligence → Core 内部 HMAC 配置 */
    private final KbCoreInternalProperties kbCoreInternalProperties;

    @Resource(name = IntelligenceExecutorNames.SEARCH)
    private ThreadPoolTaskExecutor searchTaskExecutor;

    /** JSON 序列化/反序列化 */
    private final ObjectMapper objectMapper = new ObjectMapper();

    /** kb-core 文档 API 基址（直连，不经网关） */
    @Value("${kb-core.url:http://localhost:8090}")
    private String kbCoreUrl;

    // ==================== 搜索入口 ====================

    /** {@inheritDoc} */
    /**
     * 搜索。
     */
    @Override
    public PageResult<SearchResultVO> search(SearchRequestDTO dto) {
        normalizeKeyword(dto);
        SearchAclContext acl = resolveSearchAclContext();
        //混合智能搜索
        if ("hybrid".equals(dto.getSearchMode())) {
            return searchHybrid(dto, acl);
        }
        //关键词搜索
        return searchKeyword(dto, acl);
    }

    /** {@inheritDoc} */
    /**
     * advancedSearch 方法。
     */
    @Override
    public PageResult<SearchResultVO> advancedSearch(SearchRequestDTO dto) {
        log.info("高级搜索：keyword={}", dto.getKeyword());
        return search(dto);
    }

    // ==================== 关键词搜索 ====================

    /**
     * 关键词搜索（文档元数据 BM25 + chunk 正文 BM25 聚合 + 高亮）
     *
     * <p>文档级索引仅检索 title/summary/tags；正文通过 kb_chunk 分块索引检索后按 documentId 聚合。</p>
     *
     * @param dto 搜索请求（含关键词、分页参数）
     * @return 分页搜索结果
     */
    private PageResult<SearchResultVO> searchKeyword(SearchRequestDTO dto, SearchAclContext acl) {
        log.info("关键词搜索：keyword={}, userId={}", dto.getKeyword(), acl.userId());

        try {
            String keyword = dto.getKeyword();

            if (!StringUtils.hasText(keyword)) {
                return searchDocumentMetadataOnly(dto, acl);
            }

            int from = (dto.getCurrent() - 1) * dto.getSize();
            int pageSize = dto.getSize();
            int innerHitsPerDoc = 3;

            CompletableFuture<Bm25CollapsePageVO> chunkFuture = CompletableFuture.supplyAsync(() ->
                    vectorIndexService.searchBm25Collapsed(keyword, from, pageSize, innerHitsPerDoc, dto.getCategoryIds()), searchTaskExecutor);
            CompletableFuture<DocumentMetadataPage> docFuture = CompletableFuture.supplyAsync(() ->
                    searchDocumentMetadataPage(keyword, from, pageSize, dto.getCategoryIds(), acl), searchTaskExecutor);

            Bm25CollapsePageVO chunkPage = chunkFuture.join();
            DocumentMetadataPage docPage = docFuture.join();

            List<SearchResultVO> chunkResults = convertCollapsedChunksToResults(chunkPage, keyword);
            List<SearchResultVO> merged = mergeKeywordResults(docPage.records(), chunkResults, keyword);

            enrichDocumentMetadata(merged);
            merged = filterVisibleRecords(merged, acl);
            merged = sortSearchResults(merged, dto);

            if (merged.size() > pageSize) {
                merged = new ArrayList<>(merged.subList(0, pageSize));
            }

            long total = Math.max(
                    chunkPage.getTotal() != null ? chunkPage.getTotal() : 0L,
                    docPage.total());

            return PageResult.<SearchResultVO>builder()
                    .records(merged)
                    .total(total)
                    .current((long) dto.getCurrent())
                    .size((long) dto.getSize())
                    .build();

        } catch (Exception e) {
            log.error("关键词搜索失败：{}", e.getMessage(), e);
            throw new BusinessException("搜索失败: " + e.getMessage());
        }
    }

    /**
     * 文档元数据检索分页结果（records + ES total）
     */
    private record DocumentMetadataPage(List<SearchResultVO> records, long total) {
    }

    /**
     * 文档级元数据 BM25 分页检索
     */
    private DocumentMetadataPage searchDocumentMetadataPage(String keyword, int from, int size,
                                                            List<Long> categoryIds, SearchAclContext acl) {
        try {
            return searchDocumentMetadataPageWithMultiField(keyword, from, size, categoryIds, acl);
        } catch (Exception e) {
            log.warn("文档元数据分页检索失败，降级为基础 match：{}", e.getMessage());
            try {
                return searchDocumentMetadataPageFallback(keyword, from, size, categoryIds, acl);
            } catch (Exception ex) {
                log.warn("文档元数据分页降级失败：{}", ex.getMessage());
                return new DocumentMetadataPage(new ArrayList<>(), 0L);
            }
        }
    }

    /**
     * 文档级元数据分页检索（含 standard 子字段与标签通配）
     */
    private DocumentMetadataPage searchDocumentMetadataPageWithMultiField(String keyword, int from, int size,
                                                                          List<Long> categoryIds,
                                                                          SearchAclContext acl) throws Exception {
        String wildcardKeyword = "*" + escapeWildcard(keyword) + "*";
        SearchResponse<Map> response = esClient.search(s -> {
            s.index(documentIndexName()).from(from).size(size);
            s.trackTotalHits(t -> t.enabled(true));
            s.query(q -> q.bool(b -> {
                b.should(sh -> sh.multiMatch(mm -> mm
                        .query(keyword)
                        .fields("title^2", "title.standard^2.5",
                                "summary^1.5", "summary.standard^2",
                                "tagNames.text^1")
                        .minimumShouldMatch(MINIMUM_TERM_COVERAGE)));
                b.should(sh -> sh.wildcard(w -> w
                        .field("tagNames")
                        .value(wildcardKeyword)
                        .caseInsensitive(true)));
                b.minimumShouldMatch("1");
                b.filter(f -> f.term(t -> t.field("docStatus").value(1)));
                appendCategoryFilter(b, categoryIds, "categoryId");
                SearchAclQuerySupport.appendDocumentAclFilter(b, acl);
                return b;
            }));
            s.highlight(h -> h
                    .preTags("<em>").postTags("</em>")
                    .fields("title", hf -> hf.numberOfFragments(0))
                    .fields("summary", hf -> hf.numberOfFragments(0)));
            return s;
        }, Map.class);

        long total = response.hits().total() != null ? response.hits().total().value() : 0L;
        return new DocumentMetadataPage(parseDocumentHits(response, keyword), total);
    }

    /**
     * 文档级元数据分页检索降级（兼容旧索引映射）
     */
    private DocumentMetadataPage searchDocumentMetadataPageFallback(String keyword, int from, int size,
                                                                    List<Long> categoryIds,
                                                                    SearchAclContext acl) throws Exception {
        SearchResponse<Map> response = esClient.search(s -> {
            s.index(documentIndexName()).from(from).size(size);
            s.trackTotalHits(t -> t.enabled(true));
            s.query(q -> q.bool(b -> {
                b.must(m -> m.multiMatch(mm -> mm
                        .query(keyword)
                        .fields("title^2", "summary^1.5", "content")
                        .minimumShouldMatch(MINIMUM_TERM_COVERAGE)));
                b.filter(f -> f.term(t -> t.field("docStatus").value(1)));
                appendCategoryFilter(b, categoryIds, "categoryId");
                SearchAclQuerySupport.appendDocumentAclFilter(b, acl);
                return b;
            }));
            s.highlight(h -> h
                    .preTags("<em>").postTags("</em>")
                    .fields("title", hf -> hf.numberOfFragments(0))
                    .fields("summary", hf -> hf.numberOfFragments(0)));
            return s;
        }, Map.class);

        long total = response.hits().total() != null ? response.hits().total().value() : 0L;
        return new DocumentMetadataPage(parseDocumentHits(response, keyword), total);
    }

    /**
     * 将 collapse 分页结果转为搜索 VO 列表
     */
    private List<SearchResultVO> convertCollapsedChunksToResults(Bm25CollapsePageVO chunkPage, String keyword) {
        if (chunkPage == null || chunkPage.getDocuments() == null || chunkPage.getDocuments().isEmpty()) {
            return new ArrayList<>();
        }

        List<SearchResultVO> results = new ArrayList<>();
        for (Bm25CollapsedDocumentVO doc : chunkPage.getDocuments()) {
            if (doc.getDocumentId() == null) {
                continue;
            }

            List<SearchResultVO.ChunkResult> chunkResults = new ArrayList<>();
            if (doc.getChunks() != null) {
                for (RagSearchResultVO item : doc.getChunks()) {
                    chunkResults.add(SearchResultVO.ChunkResult.builder()
                            .chunkId(item.getChunkId())
                            .content(item.getContent())
                            .heading(item.getHeading())
                            .score((float) item.getScore())
                            .bm25Score(item.getBm25Score())
                            .build());
                }
            }

            String summary = null;
            if (!chunkResults.isEmpty() && StringUtils.hasText(chunkResults.get(0).getContent())) {
                summary = chunkResults.get(0).getContent();
            }

            SearchResultVO vo = SearchResultVO.builder()
                    .id(doc.getDocumentId())
                    .title(highlightSimple(doc.getDocumentTitle(), keyword))
                    .summary(StringUtils.hasText(summary) ? summary : "")
                    .publishAt(formatPublishTime(doc.getPublishTime()))
                    .score(doc.getScore() != null ? doc.getScore().floatValue() : 0f)
                    .bm25Score(doc.getScore())
                    .chunks(chunkResults)
                    .highlights(new ArrayList<>())
                    .build();

            for (SearchResultVO.ChunkResult chunk : chunkResults) {
                appendChunkHighlight(vo, chunk.getContent());
            }
            results.add(vo);
        }
        return results;
    }

    /**
     * 无关键词时仅返回已发布文档列表（文档级索引）
     */
    private PageResult<SearchResultVO> searchDocumentMetadataOnly(SearchRequestDTO dto, SearchAclContext acl)
            throws Exception {
        SearchResponse<Map> response = esClient.search(s -> {
            s.index(documentIndexName())
                    .from((dto.getCurrent() - 1) * dto.getSize())
                    .size(dto.getSize());
            s.query(q -> q.bool(b -> {
                b.filter(f -> f.term(t -> t.field("docStatus").value(1)));
                appendCategoryFilter(b, dto.getCategoryIds(), "categoryId");
                SearchAclQuerySupport.appendDocumentAclFilter(b, acl);
                return b;
            }));
            return s;
        }, Map.class);

        return PageResult.<SearchResultVO>builder()
                .records(parseDocumentHits(response, null))
                .total(response.hits().total() != null ? response.hits().total().value() : 0L)
                .current((long) dto.getCurrent())
                .size((long) dto.getSize())
                .build();
    }

    /**
     * 合并文档级与 chunk 级搜索结果（按 documentId 去重，取得分较高者）
     */
    private List<SearchResultVO> mergeKeywordResults(List<SearchResultVO> docResults,
                                                     List<SearchResultVO> chunkResults,
                                                     String keyword) {
        Map<Long, SearchResultVO> merged = new LinkedHashMap<>();

        for (SearchResultVO vo : docResults) {
            if (vo.getId() != null) {
                merged.put(vo.getId(), vo);
            }
        }

        for (SearchResultVO vo : chunkResults) {
            if (vo.getId() == null) {
                continue;
            }
            SearchResultVO existing = merged.get(vo.getId());
            if (existing == null) {
                merged.put(vo.getId(), vo);
                continue;
            }

            if (vo.getScore() != null && (existing.getScore() == null || vo.getScore() > existing.getScore())) {
                existing.setScore(vo.getScore());
                existing.setBm25Score(vo.getBm25Score());
            }
            if ((existing.getSummary() == null || existing.getSummary().isEmpty())
                    && StringUtils.hasText(vo.getSummary())) {
                existing.setSummary(vo.getSummary());
            }
            if (vo.getChunks() != null) {
                if (existing.getChunks() == null) {
                    existing.setChunks(new ArrayList<>());
                }
                existing.getChunks().addAll(vo.getChunks());
            }
            if (vo.getHighlights() != null) {
                if (existing.getHighlights() == null) {
                    existing.setHighlights(new ArrayList<>());
                }
                existing.getHighlights().addAll(vo.getHighlights());
            }
            if (!StringUtils.hasText(existing.getTitle()) && StringUtils.hasText(vo.getTitle())) {
                existing.setTitle(highlightSimple(vo.getTitle(), keyword));
            }
        }

        return new ArrayList<>(merged.values());
    }

    /**
     * 按请求参数对搜索结果排序
     *
     * @param results 待排序列表
     * @param dto     搜索请求（sortField: relevance/time/views）
     * @return 排序后的新列表
     */
    private List<SearchResultVO> sortSearchResults(List<SearchResultVO> results, SearchRequestDTO dto) {
        if (results == null || results.isEmpty()) {
            return results != null ? results : new ArrayList<>();
        }

        String sortField = dto.getSortField();
        if (!StringUtils.hasText(sortField) || "relevance".equalsIgnoreCase(sortField)) {
            return results.stream()
                    .sorted(Comparator.comparing(SearchResultVO::getScore,
                            Comparator.nullsLast(Comparator.reverseOrder())))
                    .collect(Collectors.toList());
        }
        if ("time".equalsIgnoreCase(sortField)) {
            return results.stream()
                    .sorted(Comparator.comparing(SearchResultVO::getPublishAt,
                            Comparator.nullsLast(Comparator.reverseOrder())))
                    .collect(Collectors.toList());
        }
        if ("views".equalsIgnoreCase(sortField)) {
            return results.stream()
                    .sorted(Comparator.comparing(SearchResultVO::getViewCount,
                            Comparator.nullsLast(Comparator.reverseOrder())))
                    .collect(Collectors.toList());
        }
        return results;
    }

    /**
     * 解析文档级 ES 命中结果为 SearchResultVO 列表
     */
    private List<SearchResultVO> parseDocumentHits(SearchResponse<Map> response, String keyword) {
        List<SearchResultVO> results = new ArrayList<>();
        for (Hit<Map> hit : response.hits().hits()) {
            Map<String, Object> source = hit.source();

            List<String> titleHighlights = hit.highlight() != null ? hit.highlight().get("title") : null;
            List<String> summaryHighlights = hit.highlight() != null ? hit.highlight().get("summary") : null;

            String title = (titleHighlights != null && !titleHighlights.isEmpty())
                    ? mergeAdjacentEmTags(titleHighlights.get(0))
                    : getString(source, "title");
            String summary = (summaryHighlights != null && !summaryHighlights.isEmpty())
                    ? mergeAdjacentEmTags(summaryHighlights.get(0))
                    : getString(source, "summary");

            if (titleHighlights == null && summaryHighlights == null && StringUtils.hasText(keyword)) {
                title = highlightSimple(title, keyword);
                summary = highlightSimple(summary, keyword);
            }

            results.add(SearchResultVO.builder()
                    .id(hit.id() != null ? Long.parseLong(hit.id()) : null)
                    .title(title)
                    .summary(summary)
                    .highlights(new ArrayList<>())
                    .categoryName(getString(source, "categoryName"))
                    .categoryId(toLong(source != null ? source.get("categoryId") : null))
                    .tagNames(getStringList(source, "tagNames"))
                    .creatorName(getString(source, "creatorName"))
                    .teamName(getString(source, "teamName"))
                    .viewCount(toInt(source != null ? source.get("viewCount") : null))
                    .likeCount(toInt(source != null ? source.get("likeCount") : null))
                    .commentCount(toInt(source != null ? source.get("commentCount") : null))
                    .publishAt(getString(source, "publishAt"))
                    .score(hit.score() != null ? hit.score().floatValue() : 0f)
                    .build());
        }
        return results;
    }

    /**
     * 将 chunk 高亮片段追加到文档 highlights 列表
     */
    private void appendChunkHighlight(SearchResultVO vo, String chunkContent) {
        if (vo == null || !StringUtils.hasText(chunkContent)) {
            return;
        }
        if (vo.getHighlights() == null) {
            vo.setHighlights(new ArrayList<>());
        }
        vo.getHighlights().add(chunkContent);
    }

    /**
     * 转义 ES wildcard 查询特殊字符
     */
    private String escapeWildcard(String text) {
        if (text == null) {
            return "";
        }
        return text.replace("\\", "\\\\")
                .replace("*", "\\*")
                .replace("?", "\\?");
    }

    // ==================== 混合智能搜索 ====================

    /**
     * 混合智能搜索（BM25 + kNN 向量 + RRF 融合 + LLM 重排序）
     *
     * <p>同进程调用 llm 模块 RAG 检索，获取 chunk 级结果后按 documentId 聚合，
     * 并从文档 ES 索引补充元数据。</p>
     *
     * <p>失败时自动回退到关键词搜索。</p>
     *
     * @param dto 搜索请求
     * @return 分页搜索结果（含 chunk 明细）
     */
    private PageResult<SearchResultVO> searchHybrid(SearchRequestDTO dto, SearchAclContext acl) {
        log.info("混合智能搜索：keyword={}, topK={}, enableRerank={}, userId={}",
                dto.getKeyword(), dto.getTopK(), dto.isEnableRerank(), acl.userId());

        try {
            int topK = dto.getTopK() > 0 ? dto.getTopK() : 10;
            // 是否精排由 RagRuntimeSettings（系统设置 rag.rerank.enabled）决定；
            // 请求 enableRerank 仅表示「允许」；关闭设置时 retrieve 内部不会走重排
            List<RagSearchResultVO> dataList = ragRetrievalService.retrieve(
                    dto.getKeyword(), topK, dto.isEnableRerank());
            log.debug("llm 混合搜索响应：items={}", dataList != null ? dataList.size() : 0);

            if (dataList == null || dataList.isEmpty()) {
                return PageResult.<SearchResultVO>builder()
                        .records(new ArrayList<>())
                        .total(0L)
                        .current((long) dto.getCurrent())
                        .size((long) dto.getSize())
                        .build();
            }

            // 按 documentId 聚合 chunk 为文档级结果
            Map<String, SearchResultVO> docMap = new LinkedHashMap<>();
            List<SearchResultVO> standaloneResults = new ArrayList<>();

            for (RagSearchResultVO item : dataList) {
                Long docId = item.getDocumentId();

                // 构建 chunk 结果
                SearchResultVO.ChunkResult chunk = SearchResultVO.ChunkResult.builder()
                        .chunkId(item.getChunkId())
                        .content(item.getContent())
                        .heading(item.getHeading())
                        .score(item.getScore())
                        .bm25Score(item.getBm25Score())
                        .vectorScore(item.getVectorScore())
                        .rerankScore(item.getRerankScore())
                        .build();

                if (docId == null) {
                    // 无 documentId：每个 chunk 独立展示
                    String title = item.getDocumentTitle();
                    if (title == null || title.isEmpty()) {
                        title = item.getHeading();
                    }
                    SearchResultVO vo = SearchResultVO.builder()
                            .title(title != null ? title : "未命名文档")
                            .summary(chunk.getContent().length() > 200
                                    ? chunk.getContent().substring(0, 200) + "..." : chunk.getContent())
                            .score((float) chunk.getScore())
                            .bm25Score(chunk.getBm25Score())
                            .vectorScore(chunk.getVectorScore())
                            .rerankScore(item.getRerankScore())
                            .chunks(new ArrayList<>(List.of(chunk)))
                            .build();
                    standaloneResults.add(vo);
                    continue;
                }

                // 有 documentId：按 docId 聚合 chunk
                String docIdStr = String.valueOf(docId);
                if (docMap.containsKey(docIdStr)) {
                    SearchResultVO existing = docMap.get(docIdStr);
                    existing.getChunks().add(chunk);
                    // 文档级通道分取各 chunk 最大（首条重排 chunk 可能 vector=0，不能代表整篇）
                    mergeChannelScores(existing, chunk.getBm25Score(), chunk.getVectorScore());
                    if (existing.getRerankScore() == null && item.getRerankScore() != null) {
                        existing.setRerankScore(item.getRerankScore());
                    }
                } else {
                    String publishTime = formatPublishTime(item.getPublishTime());
                    SearchResultVO vo = SearchResultVO.builder()
                            .id(docId.longValue())
                            .title(item.getDocumentTitle())
                            .summary(chunk.getContent().length() > 200
                                    ? chunk.getContent().substring(0, 200) + "..." : chunk.getContent())
                            .publishAt(publishTime)
                            .score((float) chunk.getScore())
                            .bm25Score(chunk.getBm25Score())
                            .vectorScore(chunk.getVectorScore())
                            .rerankScore(item.getRerankScore())
                            .chunks(new ArrayList<>(List.of(chunk)))
                            .build();
                    docMap.put(docIdStr, vo);
                }
            }

            List<SearchResultVO> records = new ArrayList<>(docMap.values());
            records.addAll(standaloneResults);

            // 对混合搜索结果做关键字高亮（RAG 返回的文本无高亮标记）
            if (StringUtils.hasText(dto.getKeyword())) {
                for (SearchResultVO vo : records) {
                    vo.setTitle(highlightSimple(vo.getTitle(), dto.getKeyword()));
                    vo.setSummary(highlightSimple(vo.getSummary(), dto.getKeyword()));
                    if (vo.getChunks() != null) {
                        for (SearchResultVO.ChunkResult chunk : vo.getChunks()) {
                            chunk.setContent(highlightSimple(chunk.getContent(), dto.getKeyword()));
                        }
                    }
                }
            }

            // 从 kb_document ES 索引补充文档元数据（分类、作者、浏览数等）
            enrichDocumentMetadata(records);
            records = filterVisibleRecords(records, acl);
            records = filterByCategoryIds(records, dto.getCategoryIds());
            records = sortSearchResults(records, dto);

            log.info("混合智能搜索完成：{} 个文档（{} 聚合, {} 独立）, {} chunks",
                    records.size(), docMap.size(), standaloneResults.size(), dataList.size());

            return PageResult.<SearchResultVO>builder()
                    .records(records)
                    .total((long) records.size())
                    .current((long) dto.getCurrent())
                    .size((long) dto.getSize())
                    .build();

        } catch (Exception e) {
            log.error("混合智能搜索失败，回退到关键词搜索：{}", e.getMessage(), e);
            return searchKeyword(dto, acl);
        }
    }

    /**
     * 文档级 BM25/向量分取各 chunk 通道分的较大值。
     *
     * @param doc         文档结果
     * @param bm25Score   当前 chunk BM25
     * @param vectorScore 当前 chunk 向量分
     */
    private void mergeChannelScores(SearchResultVO doc, double bm25Score, double vectorScore) {
        if (doc.getBm25Score() == null || bm25Score > doc.getBm25Score()) {
            doc.setBm25Score(bm25Score);
        }
        if (doc.getVectorScore() == null || vectorScore > doc.getVectorScore()) {
            doc.setVectorScore(vectorScore);
        }
    }

    /**
     * 从 kb_document ES 索引批量补充文档元数据
     *
     * <p>混合搜索结果中 RAG 只返回 chunk 级字段，缺少分类、作者等元数据，
     * 通过文档 ID 批量查询 ES 索引补齐。</p>
     *
     * @param records 待补充的搜索结果列表
     */
    private void enrichDocumentMetadata(List<SearchResultVO> records) {
        if (records == null || records.isEmpty()) {
            return;
        }

        // 收集所有有 ID 的文档
        List<String> ids = records.stream()
                .filter(r -> r.getId() != null)
                .map(r -> String.valueOf(r.getId()))
                .distinct()
                .collect(Collectors.toList());

        if (ids.isEmpty()) {
            return;
        }

        try {
            // 用 terms 查询批量获取文档元数据
            Query searchQuery = new StringQuery(buildIdsQueryClause(ids));
            searchQuery.setPageable(PageRequest.of(0, ids.size()));
            SearchHits<DocumentIndex> searchHits = elasticsearchOperations.search(searchQuery, DocumentIndex.class);

            Map<String, DocumentIndex> docIndexMap = searchHits.getSearchHits().stream()
                    .collect(Collectors.toMap(
                            SearchHit::getId,
                            SearchHit::getContent,
                            (a, b) -> a));

            // 逐个填充缺失字段
            for (SearchResultVO vo : records) {
                if (vo.getId() == null) continue;
                DocumentIndex doc = docIndexMap.get(String.valueOf(vo.getId()));
                if (doc == null) continue;

                if (vo.getSummary() == null || vo.getSummary().isEmpty()) {
                    vo.setSummary(doc.getSummary());
                }
                if (vo.getPublishAt() == null && doc.getPublishAt() != null) {
                    vo.setPublishAt(doc.getPublishAt());
                }
                if (vo.getCategoryName() == null) {
                    vo.setCategoryName(doc.getCategoryName());
                }
                if (vo.getCategoryId() == null) {
                    vo.setCategoryId(doc.getCategoryId());
                }
                if (vo.getCreatorName() == null) {
                    vo.setCreatorName(doc.getCreatorName());
                }
                if (vo.getViewCount() == null) {
                    vo.setViewCount(doc.getViewCount());
                }
                if (vo.getLikeCount() == null) {
                    vo.setLikeCount(doc.getLikeCount());
                }
                if (vo.getCommentCount() == null) {
                    vo.setCommentCount(doc.getCommentCount());
                }
                if (vo.getTagNames() == null) {
                    vo.setTagNames(doc.getTagNames());
                }
            }
        } catch (Exception e) {
            log.warn("补充文档元数据失败：{}", e.getMessage());
        }
    }

    // ==================== 搜索建议 ====================

    /** {@inheritDoc} */
    /**
     * suggest 方法。
     */
    @Override
    public List<SearchSuggestVO> suggest(String keyword, Integer size) {
        log.info("搜索建议：keyword={}, size={}", keyword, size);

        if (!StringUtils.hasText(keyword)) {
            return new ArrayList<>();
        }

        if (size == null || size <= 0) {
            size = 10;
        }

        String normalized = keyword.trim();
        LinkedHashMap<String, SearchSuggestVO> merged = new LinkedHashMap<>();

        try {
            int titleLimit = Math.max(size / 2, 1);
            String queryJson = objectMapper.writeValueAsString(
                    Map.of("prefix", Map.of("title.keyword", normalized)));
            Query searchQuery = new StringQuery(queryJson);
            searchQuery.setPageable(PageRequest.of(0, titleLimit));

            SearchHits<DocumentIndex> searchHits = elasticsearchOperations.search(searchQuery, DocumentIndex.class);
            for (SearchHit<DocumentIndex> hit : searchHits.getSearchHits()) {
                String title = hit.getContent().getTitle();
                if (!StringUtils.hasText(title)) {
                    continue;
                }
                merged.putIfAbsent(title, SearchSuggestVO.builder()
                        .text(title)
                        .type("title")
                        .documentId(Long.parseLong(hit.getId()))
                        .build());
            }
        } catch (Exception e) {
            log.warn("标题建议失败：{}", e.getMessage());
        }

        try {
            List<RagSearchResultVO> chunkHits = vectorIndexService.searchBm25(normalized, size);
            for (RagSearchResultVO hit : chunkHits) {
                if (merged.size() >= size) {
                    break;
                }
                String title = hit.getDocumentTitle();
                Long docId = hit.getDocumentId();
                if (StringUtils.hasText(title) && docId != null) {
                    merged.putIfAbsent("doc:" + docId, SearchSuggestVO.builder()
                            .text(title)
                            .type("content")
                            .documentId(docId)
                            .score((float) hit.getScore())
                            .build());
                }
            }
            if (!chunkHits.isEmpty()) {
                merged.putIfAbsent("kw:" + normalized.toLowerCase(), SearchSuggestVO.builder()
                        .text(normalized)
                        .type("keyword")
                        .documentId(chunkHits.get(0).getDocumentId())
                        .build());
            }
        } catch (Exception e) {
            log.warn("正文建议失败：{}", e.getMessage());
        }

        return merged.values().stream().limit(size).collect(Collectors.toList());
    }

    // ==================== 索引管理 ====================

    /** {@inheritDoc} */
    /**
     * indexDocument 方法。
     */
    @Override
    public void indexDocument(Long documentId) {
        if (documentId == null) {
            return;
        }
        log.info("索引文档：documentId={}", documentId);

        try {
            // 通过 REST 调用 kb-core 获取文档详情
            RestTemplate restTemplate = new RestTemplate();
            String path = "/documents/" + documentId;
            HttpHeaders headers = new HttpHeaders();
            applyInternalCoreHeaders(headers, "GET", path);
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            String url = kbCoreUrl + path;
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);

            String body = response.getBody();
            if (body == null) {
                log.warn("kb-core 返回空响应：documentId={}", documentId);
                return;
            }

            Map<String, Object> respMap = objectMapper.readValue(body,
                    new TypeReference<Map<String, Object>>() {});
            @SuppressWarnings("unchecked")
            Map<String, Object> docData = (Map<String, Object>) respMap.get("data");
            if (docData == null) {
                log.warn("文档数据为空：documentId={}", documentId);
                return;
            }

            // 写入 ES
            DocumentIndex docIndex = buildDocumentIndexFromMap(docData);
            elasticsearchOperations.save(docIndex);
            log.info("文档索引成功：documentId={}, title={}", documentId, docIndex.getTitle());

        } catch (Exception e) {
            log.error("索引文档失败：documentId={}, error={}", documentId, e.getMessage(), e);
        }
    }

    /** {@inheritDoc} */
    /**
     * indexDocumentData 方法。
     */
    @Override
    public void indexDocumentData(Map<String, Object> docData) {
        try {
            DocumentIndex docIndex = buildDocumentIndexFromMap(docData);
            elasticsearchOperations.save(docIndex);
            log.info("文档数据索引成功：id={}, title={}", docIndex.getId(), docIndex.getTitle());
        } catch (Exception e) {
            log.error("文档数据索引失败：{}", e.getMessage(), e);
        }
    }

    /** {@inheritDoc} */
    /**
     * 批量IndexDocuments。
     */
    @Override
    public void batchIndexDocuments(List<Long> documentIds) {
        log.info("批量索引文档：documentCount={}", documentIds != null ? documentIds.size() : 0);

        if (documentIds == null || documentIds.isEmpty()) {
            return;
        }

        for (Long documentId : documentIds) {
            try {
                indexDocument(documentId);
            } catch (Exception e) {
                log.error("批量索引文档失败：documentId={}, error={}", documentId, e.getMessage(), e);
            }
        }
    }

    /** {@inheritDoc} */
    /**
     * 删除Document。
     */
    @Override
    public void deleteDocument(Long documentId) {
        log.info("删除文档索引：documentId={}", documentId);

        if (documentId == null) {
            return;
        }

        try {
            elasticsearchOperations.delete(String.valueOf(documentId), DocumentIndex.class);
            log.info("文档索引删除成功：documentId={}", documentId);
        } catch (Exception e) {
            log.error("删除文档索引失败：documentId={}, error={}", documentId, e.getMessage(), e);
        }
    }

    /** {@inheritDoc} */
    /**
     * 批量DeleteDocuments。
     */
    @Override
    public void batchDeleteDocuments(List<Long> documentIds) {
        log.info("批量删除文档索引：documentCount={}", documentIds != null ? documentIds.size() : 0);

        if (documentIds == null || documentIds.isEmpty()) {
            return;
        }

        try {
            for (Long documentId : documentIds) {
                elasticsearchOperations.delete(String.valueOf(documentId), DocumentIndex.class);
            }
            log.info("批量删除文档索引成功：documentCount={}", documentIds.size());
        } catch (Exception e) {
            log.error("批量删除文档索引失败：error={}", e.getMessage(), e);
        }
    }

    /** {@inheritDoc} */
    /**
     * 获取IndexHealth。
     */
    @Override
    public SearchIndexHealthVO getIndexHealth() {
        log.info("索引健康检查开始");

        long mysqlPublished = countPublishedDocumentsFromCore();
        boolean documentIndexExists = indexExists(documentIndexName());
        boolean chunkIndexExists = vectorIndexService.indexExists();
        long esDocumentCount = documentIndexExists ? countEsIndexDocuments(documentIndexName()) : 0L;
        long esChunkCount = chunkIndexExists ? countEsIndexDocuments(chunkIndexName()) : 0L;

        boolean documentCountSynced = mysqlPublished == esDocumentCount;
        boolean chunkIndexPopulated = mysqlPublished == 0 || esChunkCount > 0;

        String status;
        String message;
        if (!documentIndexExists || !chunkIndexExists) {
            status = "CRITICAL";
            message = "ES 索引缺失，请执行 rebuild-es-indices 或发布文档触发索引";
        } else if (!documentCountSynced || !chunkIndexPopulated) {
            status = "WARNING";
            message = String.format(
                    "索引未完全同步：MySQL 已发布 %d，ES 文档 %d，ES chunk %d",
                    mysqlPublished, esDocumentCount, esChunkCount);
        } else {
            status = "HEALTHY";
            message = "双索引与 MySQL 已发布文档数一致";
        }

        SearchIndexHealthVO health = SearchIndexHealthVO.builder()
                .status(status)
                .message(message)
                .mysqlPublishedCount(mysqlPublished)
                .esDocumentCount(esDocumentCount)
                .esChunkCount(esChunkCount)
                .documentIndexExists(documentIndexExists)
                .chunkIndexExists(chunkIndexExists)
                .documentCountSynced(documentCountSynced)
                .chunkIndexPopulated(chunkIndexPopulated)
                .build();

        log.info("索引健康检查完成：status={}, mysql={}, esDoc={}, esChunk={}",
                status, mysqlPublished, esDocumentCount, esChunkCount);
        return health;
    }

    /** {@inheritDoc} */
    /**
     * rebuildIndex 方法。
     */
    @Override
    public void rebuildIndex() {
        log.info("重建索引开始：从 kb-core 同步所有已发布文档");

        try {
            // 删除旧索引
            if (esClient.indices().exists(ExistsRequest.of(e -> e.index(documentIndexName()))).value()) {
                esClient.indices().delete(DeleteIndexRequest.of(d -> d.index(documentIndexName())));
                log.info("旧索引删除成功");
            }

            // 创建新索引（P1-5c：从 classpath JSON 单源加载）
            String indexBody = ElasticsearchIndexDefinitionLoader.loadDocumentIndexBody(
                    indexingProperties.isUseIkAnalyzer());
            CreateIndexRequest createRequest = CreateIndexRequest.of(c -> c
                    .index(documentIndexName())
                    .withJson(ElasticsearchIndexDefinitionLoader.toReader(indexBody)));
            esClient.indices().create(createRequest);
            log.info("新索引创建成功：index={}", documentIndexName());

            // 分页获取 kb-core 已发布文档并索引
            RestTemplate restTemplate = new RestTemplate();
            String path = "/documents/page";

            long current = 1;
            long pageSize = 50;
            long totalIndexed = 0;
            boolean hasMore = true;

            while (hasMore) {
                // status=1 表示已发布；签名路径不含 query，每页重新签名以防超时
                HttpHeaders headers = new HttpHeaders();
                applyInternalCoreHeaders(headers, "GET", path);
                HttpEntity<Void> entity = new HttpEntity<>(headers);
                String pageUrl = kbCoreUrl + path + "?current=" + current
                        + "&size=" + pageSize + "&status=1";
                ResponseEntity<String> response = restTemplate.exchange(pageUrl, HttpMethod.GET, entity, String.class);

                String body = response.getBody();
                if (body == null) break;

                Map<String, Object> respMap = objectMapper.readValue(body,
                        new TypeReference<Map<String, Object>>() {});
                @SuppressWarnings("unchecked")
                Map<String, Object> pageData = (Map<String, Object>) respMap.get("data");
                if (pageData == null) break;

                @SuppressWarnings("unchecked")
                List<Map<String, Object>> records = (List<Map<String, Object>>) pageData.get("records");
                Long total = toLong(pageData.get("total"));

                if (records == null || records.isEmpty()) break;

                for (Map<String, Object> docData : records) {
                    try {
                        DocumentIndex docIndex = buildDocumentIndexFromMap(docData);
                        elasticsearchOperations.save(docIndex);
                        totalIndexed++;
                    } catch (Exception e) {
                        Long failedId = toLong(docData.get("id"));
                        log.error("索引文档失败：documentId={}, error={}", failedId, e.getMessage());
                    }
                }

                log.info("重建索引进度：已索引 {} 条，总 {} 条", totalIndexed, total);
                hasMore = records.size() >= pageSize;
                current++;
            }

            log.info("索引重建完成：共计 {} 条文档", totalIndexed);

        } catch (Exception e) {
            log.error("重建索引失败：{}", e.getMessage(), e);
            throw new BusinessException("重建索引失败: " + e.getMessage());
        }
    }

    // ==================== 文档索引对象构建 ====================

    /**
     * 从 kb-core 文档 API 响应构建 ES 索引对象
     *
     * @param docData API 返回的文档数据 Map
     * @return ES 索引实体
     */
    private DocumentIndex buildDocumentIndexFromMap(Map<String, Object> docData) {
        Long docId = toLong(docData.get("id"));

        return DocumentIndex.builder()
                .id(docId != null ? String.valueOf(docId) : null)
                .title((String) docData.get("title"))
                .summary((String) docData.get("summary"))
                .categoryId(toLong(docData.get("categoryId")))
                .categoryName((String) docData.get("categoryName"))
                .tagIds(null)
                .tagNames(parseTagNames(docData))
                .creatorId(toCreatorId(docData))
                .creatorName(toCreatorName(docData))
                .teamId(toLong(docData.get("teamId")))
                .teamName(null)
                .docStatus(toInt(docData.get("status")))
                .viewCount(toInt(docData.get("viewCount")))
                .likeCount(toInt(docData.get("likeCount")))
                .commentCount(toInt(docData.get("commentCount")))
                .isPublic(toInt(docData.get("isPublic")) == 1)
                .publishAt(formatPublishTime(getString(docData, "publishTime")))
                .createdAt(formatPublishTime(getString(docData, "createdAt")))
                .updatedAt(formatPublishTime(getString(docData, "updatedAt")))
                .build();
    }

    /**
     * 解析标签名称列表（支持逗号分隔字符串或 JSON 数组）
     */
    @SuppressWarnings("unchecked")
    private List<String> parseTagNames(Map<String, Object> docData) {
        Object tags = docData.get("tags");
        if (tags instanceof String tagStr && StringUtils.hasText(tagStr)) {
            return List.of(tagStr.split(","));
        }
        if (tags instanceof List) {
            return (List<String>) tags;
        }
        return List.of();
    }

    /**
     * 获取创建者 ID（优先从 author.id 获取）
     */
    private Long toCreatorId(Map<String, Object> docData) {
        Object author = docData.get("author");
        if (author instanceof Map) {
            return toLong(((Map<?, ?>) author).get("id"));
        }
        return toLong(docData.get("authorId"));
    }

    /**
     * 获取创建者名称（优先从 author.username 获取）
     */
    private String toCreatorName(Map<String, Object> docData) {
        Object author = docData.get("author");
        if (author instanceof Map) {
            Object username = ((Map<?, ?>) author).get("username");
            return username != null ? username.toString() : null;
        }
        return (String) docData.get("authorName");
    }

    // ==================== 高亮处理 ====================

    /**
     * 去掉搜索词前后空白，避免空格导致 BM25/向量/缓存 miss。
     *
     * @param dto 搜索请求
     */
    private void normalizeKeyword(SearchRequestDTO dto) {
        if (dto == null || dto.getKeyword() == null) {
            return;
        }
        dto.setKeyword(dto.getKeyword().trim());
    }

    /**
     * 简单关键字高亮：用 {@code <em>} 标签包裹匹配文本（大小写不敏感）
     *
     * @param text    原始文本
     * @param keyword 搜索关键字
     * @return 高亮后的 HTML 文本
     */
    private String highlightSimple(String text, String keyword) {
        if (text == null || keyword == null || keyword.isEmpty()) {
            return text;
        }
        String escaped = Pattern.quote(keyword);
        return text.replaceAll("(?i)" + escaped, "<em>$0</em>");
    }

    /**
     * 合并相邻的 em 标签，解决 IK 分词器 token 碎片问题
     *
     * <p>例如：{@code <em>索</em><em>引</em>} → {@code <em>索引</em>}</p>
     */
    private String mergeAdjacentEmTags(String text) {
        if (text == null) return null;
        return text.replace("</em><em>", "");
    }

    // ==================== 时间格式化 ====================

    /**
     * 格式化发布时间：{@code "2026-05-28T15:49:51"} → {@code "2026-05-28 15:49:51"}
     */
    private String formatPublishTime(String time) {
        if (time == null) return null;
        String cleaned = time.contains(".") ? time.substring(0, time.indexOf('.')) : time;
        return cleaned.replace('T', ' ');
    }

    // ==================== 类型转换工具方法 ====================

    @SuppressWarnings("unchecked")
    private List<String> getStringList(Map<String, Object> source, String key) {
        if (source == null) return null;
        Object val = source.get(key);
        if (val instanceof List) {
            return (List<String>) val;
        }
        return null;
    }

    private String getString(Map<String, Object> map, String key) {
        Object value = map.get(key);
        return value != null ? value.toString() : null;
    }

    private Integer toInt(Object value) {
        if (value instanceof Number num) {
            return num.intValue();
        }
        if (value instanceof String str) {
            try {
                return Integer.parseInt(str);
            } catch (NumberFormatException e) {
                return 0;
            }
        }
        return 0;
    }

    private double toDouble(Object value) {
        if (value instanceof Number num) {
            return num.doubleValue();
        }
        return 0.0;
    }

    private Long toLong(Object value) {
        if (value == null) return null;
        if (value instanceof Number num) {
            return num.longValue();
        }
        return Long.parseLong(value.toString());
    }

    /**
     * 按分类 ID 过滤搜索结果（混合搜索元数据补齐后使用）
     */
    private List<SearchResultVO> filterByCategoryIds(List<SearchResultVO> records, List<Long> categoryIds) {
        if (records == null || records.isEmpty() || categoryIds == null || categoryIds.isEmpty()) {
            return records != null ? records : new ArrayList<>();
        }
        return records.stream()
                .filter(vo -> vo.getCategoryId() != null && categoryIds.contains(vo.getCategoryId()))
                .collect(Collectors.toList());
    }

    /**
     * 为 ES bool 查询追加分类 terms 过滤（无分类时不追加）
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

    /**
     * 解析当前请求的检索 ACL（用户 + 所属团队）
     *
     * @return ACL 上下文
     */
    private SearchAclContext resolveSearchAclContext() {
        Long userId = UserContextUtil.getUserId();
        if (userId == null) {
            return SearchAclContext.anonymous();
        }
        return SearchAclContext.of(userId, fetchUserTeamIds(userId));
    }

    /**
     * 通过 Core 内部接口查询用户所属团队
     *
     * @param userId 用户 ID
     * @return 团队 ID 列表
     */
    @SuppressWarnings("unchecked")
    private List<Long> fetchUserTeamIds(Long userId) {
        if (userId == null) {
            return List.of();
        }
        String path = "/internal/users/" + userId + "/team-ids";
        try {
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            applyInternalCoreHeaders(headers, "GET", path);
            ResponseEntity<Map> response = restTemplate.exchange(
                    kbCoreUrl + path,
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    Map.class);
            Map body = response.getBody();
            if (body == null) {
                return List.of();
            }
            Object data = body.get("data");
            if (!(data instanceof List<?> list) || list.isEmpty()) {
                return List.of();
            }
            return list.stream()
                    .map(this::toLong)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.warn("查询用户团队失败，按无团队继续 ACL：userId={}, err={}", userId, e.getMessage());
            return List.of();
        }
    }

    /**
     * 按文档索引元数据后置过滤不可见结果（覆盖 chunk/hybrid 路径）
     *
     * @param records 搜索结果
     * @param acl     ACL 上下文
     * @return 可见结果
     */
    private List<SearchResultVO> filterVisibleRecords(List<SearchResultVO> records, SearchAclContext acl) {
        if (records == null || records.isEmpty()) {
            return records != null ? records : new ArrayList<>();
        }
        Map<Long, DocumentIndex> indexMap = loadDocumentIndexMap(records);
        List<SearchResultVO> visible = new ArrayList<>();
        for (SearchResultVO vo : records) {
            if (vo.getId() == null) {
                // 无 documentId 无法校验可见性，默认丢弃
                continue;
            }
            DocumentIndex doc = indexMap.get(vo.getId());
            if (doc == null) {
                continue;
            }
            if (DocumentVisibility.isVisible(
                    doc.getIsPublic(),
                    doc.getCreatorId(),
                    doc.getTeamId(),
                    acl.userId(),
                    acl.teamIds())) {
                visible.add(vo);
            }
        }
        return visible;
    }

    /**
     * 批量加载文档索引实体
     *
     * @param records 搜索结果
     * @return documentId → DocumentIndex
     */
    private Map<Long, DocumentIndex> loadDocumentIndexMap(List<SearchResultVO> records) {
        List<String> ids = records.stream()
                .filter(r -> r.getId() != null)
                .map(r -> String.valueOf(r.getId()))
                .distinct()
                .collect(Collectors.toList());
        if (ids.isEmpty()) {
            return Map.of();
        }
        try {
            Query searchQuery = new StringQuery(buildIdsQueryClause(ids));
            searchQuery.setPageable(PageRequest.of(0, ids.size()));
            SearchHits<DocumentIndex> searchHits = elasticsearchOperations.search(searchQuery, DocumentIndex.class);
            Map<Long, DocumentIndex> map = new LinkedHashMap<>();
            for (SearchHit<DocumentIndex> hit : searchHits.getSearchHits()) {
                DocumentIndex content = hit.getContent();
                if (content == null || content.getId() == null) {
                    continue;
                }
                Long id = toLong(content.getId());
                if (id != null) {
                    map.put(id, content);
                }
            }
            return map;
        } catch (Exception e) {
            log.warn("加载文档索引用于 ACL 失败：{}", e.getMessage());
            return Map.of();
        }
    }

    static String buildIdsQueryClause(List<String> ids) {
        String idsJson = ids.stream()
                .map(id -> "\"" + id + "\"")
                .collect(Collectors.joining(","));
        return "{\"terms\":{\"_id\":[" + idsJson + "]}}";
    }

    static String minimumTermCoverage() {
        return MINIMUM_TERM_COVERAGE;
    }

    /**
     * 为直连 kb-core 的 RestTemplate 请求附加内部服务 HMAC 鉴权头
     *
     * @param headers HTTP 头
     * @param method  HTTP 方法
     * @param path    请求路径（不含 query，与签名串一致）
     */
    private void applyInternalCoreHeaders(HttpHeaders headers, String method, String path) {
        KbCoreInternalProperties.SignedHeaders signed = kbCoreInternalProperties.sign(method, path);
        headers.set("X-Internal-Service", signed.service());
        headers.set("X-Internal-Timestamp", signed.timestamp());
        headers.set("X-Internal-Signature", signed.signature());
        headers.set("X-User-Id", String.valueOf(signed.systemUserId()));
    }

    /**
     * 获取文档级 ES 索引名
     */
    private String documentIndexName() {
        return indexingProperties.getDocumentIndex();
    }

    /**
     * 获取 chunk 级 ES 索引名
     */
    private String chunkIndexName() {
        return indexingProperties.getChunkIndex();
    }

    /**
     * 从 kb-core 查询已发布文档总数（status=1）
     */
    private long countPublishedDocumentsFromCore() {
        try {
            RestTemplate restTemplate = new RestTemplate();
            String path = "/documents/page";
            HttpHeaders headers = new HttpHeaders();
            applyInternalCoreHeaders(headers, "GET", path);
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            String pageUrl = kbCoreUrl + path + "?current=1&size=1&status=1";
            ResponseEntity<String> response = restTemplate.exchange(pageUrl, HttpMethod.GET, entity, String.class);
            String body = response.getBody();
            if (body == null) {
                return 0L;
            }

            Map<String, Object> respMap = objectMapper.readValue(body,
                    new TypeReference<Map<String, Object>>() {});
            @SuppressWarnings("unchecked")
            Map<String, Object> pageData = (Map<String, Object>) respMap.get("data");
            if (pageData == null) {
                return 0L;
            }
            Long total = toLong(pageData.get("total"));
            return total != null ? total : 0L;
        } catch (Exception e) {
            log.warn("查询 kb-core 已发布文档数失败：{}", e.getMessage());
            return 0L;
        }
    }

    /**
     * 判断 ES 索引是否存在
     */
    private boolean indexExists(String indexName) {
        try {
            return esClient.indices().exists(ExistsRequest.of(e -> e.index(indexName))).value();
        } catch (Exception e) {
            log.warn("检查索引是否存在失败：index={}, error={}", indexName, e.getMessage());
            return false;
        }
    }

    /**
     * 统计 ES 索引文档数量
     */
    private long countEsIndexDocuments(String indexName) {
        try {
            return esClient.count(c -> c.index(indexName)).count();
        } catch (Exception e) {
            log.warn("统计 ES 索引文档数失败：index={}, error={}", indexName, e.getMessage());
            return 0L;
        }
    }
}
