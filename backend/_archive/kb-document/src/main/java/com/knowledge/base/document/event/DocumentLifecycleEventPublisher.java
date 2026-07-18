package com.knowledge.base.document.event;

import com.knowledge.base.common.config.InstanceIdentifier;
import com.knowledge.base.common.constants.DocumentLifecycleMQConstants;
import com.knowledge.base.common.event.DocumentLifecycleEventDTO;
import com.knowledge.base.common.event.DocumentLifecycleEventType;
import com.knowledge.base.document.entity.Document;
import com.knowledge.base.document.support.DocumentSearchIndexPayloadBuilder;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * 文档生命周期事件发布器
 *
 * <p>将文档发布/删除/图谱重建等副作用通知到 Intelligence 子服务，替代 Feign 编排。</p>
 *
 * @author knowledge-base-team
 * @since 1.0.0
 */
@Slf4j
@Component
public class DocumentLifecycleEventPublisher {

    @Resource
    private RabbitTemplate rabbitTemplate;

    @Resource
    private InstanceIdentifier instanceIdentifier;

    @Resource
    private DocumentSearchIndexPayloadBuilder searchIndexPayloadBuilder;

    /**
     * 发布文档已发布/更新事件
     *
     * @param document 文档实体
     * @param content  正文（可选）
     */
    public void publishPublished(Document document, String content) {
        Map<String, Object> searchIndexData = searchIndexPayloadBuilder.build(document, content);
        DocumentLifecycleEventDTO event = baseEvent(document.getId(), document.getTitle(),
                DocumentLifecycleEventType.PUBLISHED);
        event.setSearchIndexData(searchIndexData);
        send(DocumentLifecycleMQConstants.publishedRoutingKey(instanceIdentifier.getId()), event);
    }

    /**
     * 发布文档移除事件（删除/下架/归档）
     *
     * @param documentId 文档 ID
     * @param title      文档标题（可选）
     */
    public void publishRemoved(Long documentId, String title) {
        DocumentLifecycleEventDTO event = baseEvent(documentId, title, DocumentLifecycleEventType.REMOVED);
        send(DocumentLifecycleMQConstants.removedRoutingKey(instanceIdentifier.getId()), event);
    }

    /**
     * 发布仅重建 KAG 图谱事件
     *
     * @param documentId 文档 ID
     * @param title      文档标题（可选）
     */
    public void publishGraphRebuild(Long documentId, String title) {
        DocumentLifecycleEventDTO event = baseEvent(documentId, title, DocumentLifecycleEventType.GRAPH_REBUILD);
        send(DocumentLifecycleMQConstants.graphRebuildRoutingKey(instanceIdentifier.getId()), event);
    }

    private DocumentLifecycleEventDTO baseEvent(Long documentId, String title,
                                                DocumentLifecycleEventType eventType) {
        return DocumentLifecycleEventDTO.builder()
                .eventId(UUID.randomUUID().toString())
                .eventType(eventType)
                .documentId(documentId)
                .documentTitle(title)
                .timestamp(LocalDateTime.now())
                .build();
    }

    private void send(String routingKey, DocumentLifecycleEventDTO event) {
        rabbitTemplate.convertAndSend(DocumentLifecycleMQConstants.EXCHANGE, routingKey, event);
        log.info("文档生命周期事件已发布：type={}, documentId={}, eventId={}",
                event.getEventType(), event.getDocumentId(), event.getEventId());
    }
}
