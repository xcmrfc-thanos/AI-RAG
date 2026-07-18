package com.knowledge.base.search.mq;

import com.knowledge.base.common.event.DocumentLifecycleEventDTO;
import com.knowledge.base.common.event.DocumentLifecycleEventType;
import com.knowledge.base.search.service.SearchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;

/**
 * 文档生命周期事件消费者（ES 全文索引）
 *
 * @author knowledge-base-team
 * @since 1.0.0
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DocumentLifecycleListener {

    private final SearchService searchService;

    /**
     * 消费文档生命周期事件并同步 ES 索引
     *
     * @param event 领域事件
     */
    @RabbitListener(queues = "#{@searchDocumentLifecycleQueue.name}",
            containerFactory = "documentLifecycleListenerContainerFactory")
    public void onDocumentLifecycle(@Payload DocumentLifecycleEventDTO event) {
        if (event == null || event.getDocumentId() == null || event.getEventType() == null) {
            log.warn("忽略无效文档生命周期事件：{}", event);
            return;
        }

        Long documentId = event.getDocumentId();
        DocumentLifecycleEventType type = event.getEventType();
        log.info("收到文档生命周期事件：type={}, documentId={}, eventId={}",
                type, documentId, event.getEventId());

        try {
            switch (type) {
                case PUBLISHED -> {
                    if (event.getSearchIndexData() != null && !event.getSearchIndexData().isEmpty()) {
                        searchService.indexDocumentData(event.getSearchIndexData());
                    } else {
                        searchService.indexDocument(documentId);
                    }
                }
                case REMOVED -> searchService.deleteDocument(documentId);
                case GRAPH_REBUILD -> log.debug("GRAPH_REBUILD 事件由 kb-ai 处理，kb-search 忽略");
                default -> log.warn("未知文档生命周期事件类型：{}", type);
            }
        } catch (Exception e) {
            log.error("处理文档生命周期 ES 索引失败：type={}, documentId={}, error={}",
                    type, documentId, e.getMessage(), e);
        }
    }
}
