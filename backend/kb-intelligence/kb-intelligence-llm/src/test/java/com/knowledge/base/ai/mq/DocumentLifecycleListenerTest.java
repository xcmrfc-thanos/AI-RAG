package com.knowledge.base.ai.mq;

import com.knowledge.base.ai.config.KagRuntimeSettings;
import com.knowledge.base.ai.rag.kag.graph.GraphBuildService;
import com.knowledge.base.ai.rag.service.ReindexService;
import com.knowledge.base.common.event.DocumentLifecycleEventDTO;
import com.knowledge.base.common.event.DocumentLifecycleEventType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * LLM/RAG 模块文档生命周期 MQ 消费者验收测试。
 */
@ExtendWith(MockitoExtension.class)
class DocumentLifecycleListenerTest {

    @Mock
    private ReindexService reindexService;

    @Mock
    private GraphBuildService graphBuildService;

    @Mock
    private KagRuntimeSettings kagRuntimeSettings;

    @InjectMocks
    private DocumentLifecycleListener listener;

    private DocumentLifecycleEventDTO publishedEvent;

    /**
     * 初始化发布事件样本。
     */
    @BeforeEach
    void setUp() {
        publishedEvent = DocumentLifecycleEventDTO.builder()
                .eventId("evt-ai-1")
                .eventType(DocumentLifecycleEventType.PUBLISHED)
                .documentId(2002L)
                .documentTitle("RAG 验收文档")
                .build();
    }

    /**
     * 发布事件应触发向量重建与图谱构建任务。
     */
    @Test
    void publishedShouldReindexAndBuildGraph() {
        when(kagRuntimeSettings.isAutoExtractEnabled()).thenReturn(true);
        when(reindexService.reindexByDocId(2002L)).thenReturn("task-reindex");
        when(graphBuildService.publishBuildTask(2002L)).thenReturn("task-graph");

        listener.onDocumentLifecycle(publishedEvent);

        verify(reindexService).reindexByDocId(2002L);
        verify(graphBuildService).publishBuildTask(2002L);
    }

    /**
     * 自动抽取关闭时仍重建向量，但不触发图谱构建。
     */
    @Test
    void publishedWhenAutoExtractOff_skipsGraph() {
        when(kagRuntimeSettings.isAutoExtractEnabled()).thenReturn(false);
        when(reindexService.reindexByDocId(2002L)).thenReturn("task-reindex");

        listener.onDocumentLifecycle(publishedEvent);

        verify(reindexService).reindexByDocId(2002L);
        verify(graphBuildService, never()).publishBuildTask(2002L);
    }

    /**
     * 删除事件应清理向量索引与图谱。
     */
    @Test
    void removedShouldDeleteVectorAndGraph() {
        when(reindexService.deleteByDocId(2002L)).thenReturn("task-delete");
        when(graphBuildService.publishDeleteTask(2002L)).thenReturn("task-graph-delete");

        DocumentLifecycleEventDTO removed = DocumentLifecycleEventDTO.builder()
                .eventId("evt-ai-2")
                .eventType(DocumentLifecycleEventType.REMOVED)
                .documentId(2002L)
                .build();

        listener.onDocumentLifecycle(removed);

        verify(reindexService).deleteByDocId(2002L);
        verify(graphBuildService).publishDeleteTask(2002L);
        verify(reindexService, never()).reindexByDocId(2002L);
    }

    /**
     * 图谱重建事件仅触发图谱任务，不重建向量。
     */
    @Test
    void graphRebuildShouldOnlyPublishGraphTask() {
        when(graphBuildService.publishBuildTask(2002L)).thenReturn("task-graph");

        DocumentLifecycleEventDTO graphRebuild = DocumentLifecycleEventDTO.builder()
                .eventId("evt-ai-3")
                .eventType(DocumentLifecycleEventType.GRAPH_REBUILD)
                .documentId(2002L)
                .build();

        listener.onDocumentLifecycle(graphRebuild);

        verify(graphBuildService).publishBuildTask(2002L);
        verifyNoInteractions(reindexService);
    }

    /**
     * 无效事件不应触发 RAG/KAG 副作用。
     */
    @Test
    void invalidEventShouldBeIgnored() {
        listener.onDocumentLifecycle(null);

        verifyNoInteractions(reindexService);
        verifyNoInteractions(graphBuildService);
    }
}
