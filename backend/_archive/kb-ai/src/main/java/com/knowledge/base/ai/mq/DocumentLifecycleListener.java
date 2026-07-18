package com.knowledge.base.ai.mq;

import com.knowledge.base.ai.config.DocumentLifecycleMQConfig;
import com.knowledge.base.ai.rag.kag.graph.GraphBuildService;
import com.knowledge.base.ai.rag.service.ReindexService;
import com.knowledge.base.common.event.DocumentLifecycleEventDTO;
import com.knowledge.base.common.event.DocumentLifecycleEventType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;

/**
 * 文档生命周期事件消费者（RAG + KAG）
 *
 * <p>替代 kb-document 对 kb-ai 的 Feign 索引触发。</p>
 *
 * @author knowledge-base-team
 * @since 1.0.0
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DocumentLifecycleListener {

    private final ReindexService reindexService;
    private final GraphBuildService graphBuildService;

    /**
     * 消费文档生命周期事件并触发 RAG/KAG 索引
     *
     * @param event 领域事件
     */
    @RabbitListener(queues = "#{@aiDocumentLifecycleQueue.name}",
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
                case PUBLISHED -> handlePublished(documentId);
                case REMOVED -> handleRemoved(documentId);
                case GRAPH_REBUILD -> graphBuildService.publishBuildTask(documentId);
                default -> log.warn("未知文档生命周期事件类型：{}", type);
            }
        } catch (Exception e) {
            log.error("处理文档生命周期事件失败：type={}, documentId={}, error={}",
                    type, documentId, e.getMessage(), e);
        }
    }

    private void handlePublished(Long documentId) {
        reindexService.reindexByDocId(documentId);
        graphBuildService.publishBuildTask(documentId);
    }

    private void handleRemoved(Long documentId) {
        reindexService.deleteByDocId(documentId);
        graphBuildService.publishDeleteTask(documentId);
    }
}
