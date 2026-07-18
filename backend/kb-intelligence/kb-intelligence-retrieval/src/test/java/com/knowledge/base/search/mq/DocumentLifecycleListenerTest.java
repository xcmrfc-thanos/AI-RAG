package com.knowledge.base.search.mq;

import com.knowledge.base.common.event.DocumentLifecycleEventDTO;
import com.knowledge.base.common.event.DocumentLifecycleEventType;
import com.knowledge.base.search.service.SearchService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

/**
 * 检索模块文档生命周期 MQ 消费者验收测试。
 */
@ExtendWith(MockitoExtension.class)
class DocumentLifecycleListenerTest {

    @Mock
    private SearchService searchService;

    @InjectMocks
    private DocumentLifecycleListener listener;

    private DocumentLifecycleEventDTO publishedEvent;

    /**
     * 初始化发布事件样本。
     */
    @BeforeEach
    void setUp() {
        publishedEvent = DocumentLifecycleEventDTO.builder()
                .eventId("evt-search-1")
                .eventType(DocumentLifecycleEventType.PUBLISHED)
                .documentId(1001L)
                .documentTitle("验收文档")
                .searchIndexData(Map.of("documentId", 1001L, "title", "验收文档"))
                .build();
    }

    /**
     * 发布事件携带 searchIndexData 时应写入 ES 索引。
     */
    @Test
    void publishedWithPayloadShouldIndexDocumentData() {
        listener.onDocumentLifecycle(publishedEvent);

        verify(searchService).indexDocumentData(publishedEvent.getSearchIndexData());
        verify(searchService, never()).indexDocument(1001L);
    }

    /**
     * 发布事件无 payload 时应回退按文档 ID 建索引。
     */
    @Test
    void publishedWithoutPayloadShouldIndexByDocumentId() {
        publishedEvent.setSearchIndexData(null);

        listener.onDocumentLifecycle(publishedEvent);

        verify(searchService).indexDocument(1001L);
        verify(searchService, never()).indexDocumentData(org.mockito.ArgumentMatchers.anyMap());
    }

    /**
     * 删除事件应清理 ES 文档索引。
     */
    @Test
    void removedShouldDeleteDocumentIndex() {
        DocumentLifecycleEventDTO removed = DocumentLifecycleEventDTO.builder()
                .eventId("evt-search-2")
                .eventType(DocumentLifecycleEventType.REMOVED)
                .documentId(1001L)
                .build();

        listener.onDocumentLifecycle(removed);

        verify(searchService).deleteDocument(1001L);
    }

    /**
     * 图谱重建事件由 AI 模块处理，检索侧应忽略。
     */
    @Test
    void graphRebuildShouldBeIgnoredBySearchListener() {
        DocumentLifecycleEventDTO graphRebuild = DocumentLifecycleEventDTO.builder()
                .eventId("evt-search-3")
                .eventType(DocumentLifecycleEventType.GRAPH_REBUILD)
                .documentId(1001L)
                .build();

        listener.onDocumentLifecycle(graphRebuild);

        verifyNoInteractions(searchService);
    }

    /**
     * 无效事件不应触发索引副作用。
     */
    @Test
    void invalidEventShouldBeIgnored() {
        listener.onDocumentLifecycle(null);
        listener.onDocumentLifecycle(DocumentLifecycleEventDTO.builder().build());

        verifyNoInteractions(searchService);
    }
}
