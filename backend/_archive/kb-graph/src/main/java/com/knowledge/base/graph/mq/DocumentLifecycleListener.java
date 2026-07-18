package com.knowledge.base.graph.mq;

import com.knowledge.base.common.event.DocumentLifecycleEventDTO;
import com.knowledge.base.common.event.DocumentLifecycleEventType;
import com.knowledge.base.graph.service.GraphService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;

/**
 * 文档生命周期事件消费者（Neo4j 图谱清理）
 *
 * <p>替代 kb-document 对 kb-graph 的 Feign 删除触发。</p>
 *
 * @author knowledge-base-team
 * @since 1.0.0
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DocumentLifecycleListener {

    private final GraphService graphService;

    /**
     * 消费文档移除事件并清理 Neo4j 图谱
     *
     * @param event 领域事件
     */
    @RabbitListener(queues = "#{@graphDocumentLifecycleQueue.name}",
            containerFactory = "documentLifecycleListenerContainerFactory")
    public void onDocumentLifecycle(@Payload DocumentLifecycleEventDTO event) {
        if (event == null || event.getDocumentId() == null || event.getEventType() == null) {
            log.warn("忽略无效文档生命周期事件：{}", event);
            return;
        }

        if (event.getEventType() != DocumentLifecycleEventType.REMOVED) {
            return;
        }

        Long documentId = event.getDocumentId();
        log.info("收到文档 REMOVED 事件，清理图谱：documentId={}, eventId={}",
                documentId, event.getEventId());

        try {
            graphService.deleteByDocId(documentId);
        } catch (Exception e) {
            log.error("清理文档图谱失败：documentId={}, error={}", documentId, e.getMessage(), e);
        }
    }
}
