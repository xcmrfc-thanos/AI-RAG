package com.knowledge.base.intelligence.acceptance;

import com.knowledge.base.ai.config.KagRuntimeSettings;
import com.knowledge.base.ai.mq.DocumentLifecycleListener;
import com.knowledge.base.ai.rag.kag.graph.GraphBuildService;
import com.knowledge.base.ai.rag.service.ReindexService;
import com.knowledge.base.common.event.DocumentLifecycleEventDTO;
import com.knowledge.base.common.event.DocumentLifecycleEventType;
import com.knowledge.base.search.service.SearchService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;

import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.when;

/**
 * 文档发布全链路编排验收：同一生命周期事件在检索与 RAG 消费者上的期望副作用。
 *
 * <p>不启动完整 Spring 容器；环境就绪后可用 Testcontainers 扩展为 @SpringBootTest E2E。</p>
 */
@ExtendWith(MockitoExtension.class)
class DocumentLifecycleChainAcceptanceTest {

    @Mock
    private SearchService searchService;

    @Mock
    private ReindexService reindexService;

    @Mock
    private GraphBuildService graphBuildService;

    @Mock
    private KagRuntimeSettings kagRuntimeSettings;

    private com.knowledge.base.search.mq.DocumentLifecycleListener searchListener;
    private DocumentLifecycleListener aiListener;

    /**
     * 组装检索与 AI 两侧消费者。
     */
    @BeforeEach
    void setUp() {
        searchListener = new com.knowledge.base.search.mq.DocumentLifecycleListener(searchService);
        aiListener = new DocumentLifecycleListener(reindexService, graphBuildService, kagRuntimeSettings);
    }

    /**
     * 发布文档：ES 双索引写入 + 向量重建 + 图谱构建应均被触发。
     */
    @Test
    void publishedDocumentShouldTriggerSearchAndRagSideEffects() {
        Long documentId = 9001L;
        Map<String, Object> indexPayload = Map.of(
                "documentId", documentId,
                "title", "全链路验收文档",
                "content", "正文包含 startTransition 关键词"
        );
        DocumentLifecycleEventDTO event = DocumentLifecycleEventDTO.builder()
                .eventId("evt-chain-published")
                .eventType(DocumentLifecycleEventType.PUBLISHED)
                .documentId(documentId)
                .documentTitle("全链路验收文档")
                .searchIndexData(indexPayload)
                .build();

        when(reindexService.reindexByDocId(documentId)).thenReturn("reindex-task");
        when(graphBuildService.publishBuildTask(documentId)).thenReturn("graph-task");

        searchListener.onDocumentLifecycle(event);
        aiListener.onDocumentLifecycle(event);

        var inOrderSearch = inOrder(searchService);
        inOrderSearch.verify(searchService).indexDocumentData(indexPayload);

        var inOrderAi = inOrder(reindexService, graphBuildService);
        inOrderAi.verify(reindexService).reindexByDocId(documentId);
        inOrderAi.verify(graphBuildService).publishBuildTask(documentId);
    }

    /**
     * 删除文档：ES 清理 + 向量删除 + 图谱删除应均被触发。
     */
    @Test
    void removedDocumentShouldTriggerCleanupOnBothConsumers() {
        Long documentId = 9002L;
        DocumentLifecycleEventDTO event = DocumentLifecycleEventDTO.builder()
                .eventId("evt-chain-removed")
                .eventType(DocumentLifecycleEventType.REMOVED)
                .documentId(documentId)
                .build();

        when(reindexService.deleteByDocId(documentId)).thenReturn("delete-task");
        when(graphBuildService.publishDeleteTask(documentId)).thenReturn("graph-delete-task");

        searchListener.onDocumentLifecycle(event);
        aiListener.onDocumentLifecycle(event);

        var inOrderSearch = inOrder(searchService);
        inOrderSearch.verify(searchService).deleteDocument(documentId);

        var inOrderAi = inOrder(reindexService, graphBuildService);
        inOrderAi.verify(reindexService).deleteByDocId(documentId);
        inOrderAi.verify(graphBuildService).publishDeleteTask(documentId);
    }
}
