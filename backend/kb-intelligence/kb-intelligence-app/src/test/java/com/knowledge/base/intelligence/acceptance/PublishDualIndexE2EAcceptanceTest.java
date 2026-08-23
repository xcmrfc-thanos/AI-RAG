package com.knowledge.base.intelligence.acceptance;

import com.knowledge.base.ai.mq.DocumentLifecycleListener;
import com.knowledge.base.ai.rag.kag.graph.GraphBuildService;
import com.knowledge.base.ai.rag.service.ReindexService;
import com.knowledge.base.ai.rag.service.impl.ElasticsearchVectorIndexServiceImpl;
import com.knowledge.base.ai.vo.RagSearchResultVO;
import com.knowledge.base.common.event.DocumentLifecycleEventDTO;
import com.knowledge.base.common.event.DocumentLifecycleEventType;
import com.knowledge.base.common.result.PageResult;
import com.knowledge.base.intelligence.acceptance.support.InMemoryElasticsearchSupport;
import com.knowledge.base.intelligence.acceptance.support.InMemoryEsTestConfiguration;
import com.knowledge.base.intelligence.acceptance.support.SynchronousE2EReindexService;
import com.knowledge.base.search.dto.SearchRequestDTO;
import com.knowledge.base.search.service.SearchService;
import com.knowledge.base.search.vo.SearchResultVO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * MQ/RAG E2E 验收（进程内）：模拟文档发布生命周期，断言 kb_document 与 kb_chunk 双索引均可检索命中。
 *
 * <p>使用 {@link SpringBootTest} + 内存 ES 替身，不依赖 Docker/Testcontainers。</p>
 */
@SpringBootTest(classes = InMemoryEsTestConfiguration.class, webEnvironment = SpringBootTest.WebEnvironment.NONE)
class PublishDualIndexE2EAcceptanceTest {

    private static final Long DOCUMENT_ID = 91001L;
    private static final String KEYWORD = SynchronousE2EReindexService.KEYWORD;

    @Autowired
    private SearchService searchService;

    @Autowired
    private ElasticsearchVectorIndexServiceImpl vectorIndexService;

    @Autowired
    private ReindexService reindexService;

    @Autowired
    private GraphBuildService graphBuildService;

    @Autowired
    private InMemoryElasticsearchSupport inMemoryElasticsearchSupport;

    @Autowired
    private com.knowledge.base.ai.config.KagRuntimeSettings kagRuntimeSettings;

    private com.knowledge.base.search.mq.DocumentLifecycleListener searchListener;
    private DocumentLifecycleListener aiListener;

    /**
     * 初始化消费者并清空内存索引。
     */
    @BeforeEach
    void setUp() {
        inMemoryElasticsearchSupport.reset();
        searchListener = new com.knowledge.base.search.mq.DocumentLifecycleListener(searchService);
        aiListener = new DocumentLifecycleListener(reindexService, graphBuildService, kagRuntimeSettings);
    }

    /**
     * 发布文档后，文档级与 chunk 级索引均应命中同一关键词。
     */
    @Test
    void publishedDocumentShouldBeSearchableInDocumentAndChunkIndexes() {
        Map<String, Object> indexPayload = Map.of(
                "id", DOCUMENT_ID,
                "title", "E2E " + KEYWORD,
                "summary", "summary contains " + KEYWORD,
                "status", 1,
                "isPublic", 1,
                "authorId", 1000000000000000001L
        );
        DocumentLifecycleEventDTO event = DocumentLifecycleEventDTO.builder()
                .eventId("evt-e2e-published")
                .eventType(DocumentLifecycleEventType.PUBLISHED)
                .documentId(DOCUMENT_ID)
                .documentTitle("E2E " + KEYWORD)
                .searchIndexData(indexPayload)
                .build();

        searchListener.onDocumentLifecycle(event);
        aiListener.onDocumentLifecycle(event);

        SearchRequestDTO searchRequest = new SearchRequestDTO();
        searchRequest.setKeyword(KEYWORD);
        searchRequest.setCurrent(1);
        searchRequest.setSize(10);
        searchRequest.setSearchMode("keyword");
        PageResult<SearchResultVO> docResults = searchService.search(searchRequest);

        assertThat(docResults.getTotal()).isGreaterThan(0);
        assertThat(docResults.getRecords())
                .anyMatch(r -> DOCUMENT_ID.equals(r.getId()));

        List<RagSearchResultVO> chunkHits = vectorIndexService.searchBm25(KEYWORD, 10);
        assertThat(chunkHits).isNotEmpty();
        assertThat(chunkHits)
                .anyMatch(hit -> DOCUMENT_ID.equals(hit.getDocumentId())
                        && hit.getContent() != null
                        && hit.getContent().contains(KEYWORD));
    }
}
