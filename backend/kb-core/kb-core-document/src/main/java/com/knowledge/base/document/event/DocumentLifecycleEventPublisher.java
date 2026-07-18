package com.knowledge.base.document.event;

import com.knowledge.base.common.config.InstanceIdentifier;
import com.knowledge.base.common.constants.DocumentLifecycleMQConstants;
import com.knowledge.base.common.event.DocumentLifecycleEventDTO;
import com.knowledge.base.common.event.DocumentLifecycleEventType;
import com.knowledge.base.document.config.DocumentIndexingProperties;
import com.knowledge.base.document.entity.Document;
import com.knowledge.base.document.support.DocumentSearchIndexPayloadBuilder;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.connection.CorrelationData;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

/**
 * 文档生命周期事件发布器
 *
 * <p>支持有限次重试与 Publisher Confirm；失败时输出可补偿的 documentId/eventId。</p>
 *
 * @author knowledge-base-team
 * @since 1.0.0
 */
@Slf4j
@Component
public class DocumentLifecycleEventPublisher {

    private final ConcurrentHashMap<String, DocumentLifecycleEventDTO> pendingConfirms = new ConcurrentHashMap<>();

    private volatile boolean callbacksRegistered = false;

    @Resource
    private RabbitTemplate rabbitTemplate;

    @Resource
    private InstanceIdentifier instanceIdentifier;

    @Resource
    private DocumentSearchIndexPayloadBuilder searchIndexPayloadBuilder;

    @Resource
    private DocumentIndexingProperties indexingProperties;

    /**
     * 在注入后注册 Confirm/Return 回调（幂等）
     */
    private void ensureCallbacks() {
        if (callbacksRegistered) {
            return;
        }
        synchronized (this) {
            if (callbacksRegistered) {
                return;
            }
            rabbitTemplate.setConfirmCallback((correlationData, ack, cause) -> {
                String id = correlationData != null ? correlationData.getId() : null;
                DocumentLifecycleEventDTO event = id != null ? pendingConfirms.remove(id) : null;
                if (ack) {
                    log.debug("文档生命周期事件 Confirm ACK：eventId={}", id);
                    return;
                }
                if (event != null) {
                    log.error("INDEXING_PUBLISH_NACK documentId={} eventId={} cause={} compensable=rebuild-es-indices",
                            event.getDocumentId(), event.getEventId(), cause);
                } else {
                    log.error("INDEXING_PUBLISH_NACK eventId={} cause={}", id, cause);
                }
            });
            rabbitTemplate.setReturnsCallback(returned ->
                    log.error("INDEXING_PUBLISH_RETURNED documentId={} routingKey={} replyText={} compensable=rebuild-es-indices",
                            extractDocumentId(returned.getMessage().getMessageProperties().getCorrelationId()),
                            returned.getRoutingKey(),
                            returned.getReplyText()));
            callbacksRegistered = true;
        }
    }

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
        sendWithRetry(DocumentLifecycleMQConstants.publishedRoutingKey(instanceIdentifier.getId()), event);
    }

    /**
     * 发布文档移除事件（删除/下架/归档）
     *
     * @param documentId 文档 ID
     * @param title      文档标题（可选）
     */
    public void publishRemoved(Long documentId, String title) {
        DocumentLifecycleEventDTO event = baseEvent(documentId, title, DocumentLifecycleEventType.REMOVED);
        sendWithRetry(DocumentLifecycleMQConstants.removedRoutingKey(instanceIdentifier.getId()), event);
    }

    /**
     * 发布仅重建 KAG 图谱事件
     *
     * @param documentId 文档 ID
     * @param title      文档标题（可选）
     */
    public void publishGraphRebuild(Long documentId, String title) {
        DocumentLifecycleEventDTO event = baseEvent(documentId, title, DocumentLifecycleEventType.GRAPH_REBUILD);
        sendWithRetry(DocumentLifecycleMQConstants.graphRebuildRoutingKey(instanceIdentifier.getId()), event);
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

    /**
     * 有限次重试发送；耗尽后抛出或记录补偿线索
     */
    private void sendWithRetry(String routingKey, DocumentLifecycleEventDTO event) {
        ensureCallbacks();
        int maxAttempts = Math.max(1, indexingProperties.getPublishMaxAttempts());
        long backoff = Math.max(0L, indexingProperties.getPublishRetryBackoffMs());
        Exception last = null;
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                CorrelationData correlationData = new CorrelationData(event.getEventId());
                pendingConfirms.put(event.getEventId(), event);
                rabbitTemplate.convertAndSend(
                        DocumentLifecycleMQConstants.EXCHANGE,
                        routingKey,
                        event,
                        correlationData);
                log.info("文档生命周期事件已发布：type={}, documentId={}, eventId={}, attempt={}",
                        event.getEventType(), event.getDocumentId(), event.getEventId(), attempt);
                return;
            } catch (Exception e) {
                last = e;
                pendingConfirms.remove(event.getEventId());
                log.warn("文档生命周期事件发布失败：documentId={}, eventId={}, attempt={}/{}, error={}",
                        event.getDocumentId(), event.getEventId(), attempt, maxAttempts, e.getMessage());
                if (attempt < maxAttempts && backoff > 0) {
                    try {
                        TimeUnit.MILLISECONDS.sleep(backoff * attempt);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            }
        }
        log.error("INDEXING_PUBLISH_EXHAUSTED documentId={} eventId={} type={} compensable=rebuild-es-indices error={}",
                event.getDocumentId(), event.getEventId(), event.getEventType(),
                last != null ? last.getMessage() : "unknown");
        if (last != null) {
            throw new IllegalStateException("文档生命周期事件发布失败，已耗尽重试：" + event.getEventId(), last);
        }
    }

    private Long extractDocumentId(String correlationId) {
        DocumentLifecycleEventDTO event = correlationId != null ? pendingConfirms.get(correlationId) : null;
        return event != null ? event.getDocumentId() : null;
    }
}
