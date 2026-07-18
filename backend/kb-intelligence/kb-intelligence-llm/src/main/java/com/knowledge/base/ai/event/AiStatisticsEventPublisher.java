package com.knowledge.base.ai.event;

import com.knowledge.base.common.config.IntelligenceExecutorNames;
import com.knowledge.base.common.config.InstanceIdentifier;
import com.knowledge.base.common.constants.AiStatisticsMQConstants;
import com.knowledge.base.common.event.AiStatisticsEventDTO;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.concurrent.CompletableFuture;

/**
 * AI 统计事件发布器（P3-1：写入 kb-statistics 本地投影表）。
 */
@Slf4j
@Component
public class AiStatisticsEventPublisher {

    @Resource
    private RabbitTemplate rabbitTemplate;

    @Resource(name = IntelligenceExecutorNames.RAG)
    private ThreadPoolTaskExecutor ragTaskExecutor;

    @Resource
    private InstanceIdentifier instanceIdentifier;

    /**
     * 发布对话创建事件
     */
    public void publishConversationCreated(Long conversationId, Long userId) {
        publish(AiStatisticsMQConstants.EVENT_CONVERSATION_CREATED, AiStatisticsEventDTO.builder()
                .eventType(AiStatisticsMQConstants.EVENT_CONVERSATION_CREATED)
                .conversationId(conversationId)
                .userId(userId)
                .timestamp(LocalDateTime.now())
                .build());
    }

    /**
     * 发布对话删除事件
     */
    public void publishConversationDeleted(Long conversationId) {
        publish(AiStatisticsMQConstants.EVENT_CONVERSATION_DELETED, AiStatisticsEventDTO.builder()
                .eventType(AiStatisticsMQConstants.EVENT_CONVERSATION_DELETED)
                .conversationId(conversationId)
                .timestamp(LocalDateTime.now())
                .build());
    }

    /**
     * 发布用户消息创建事件
     */
    public void publishUserMessageCreated(Long messageId, Long conversationId) {
        publish(AiStatisticsMQConstants.EVENT_USER_MESSAGE_CREATED, AiStatisticsEventDTO.builder()
                .eventType(AiStatisticsMQConstants.EVENT_USER_MESSAGE_CREATED)
                .messageId(messageId)
                .conversationId(conversationId)
                .role("user")
                .timestamp(LocalDateTime.now())
                .build());
    }

    /**
     * 异步发送 MQ 事件
     */
    private void publish(String eventType, AiStatisticsEventDTO event) {
        CompletableFuture.runAsync(() -> {
            try {
                String routingKey = AiStatisticsMQConstants.routingKey(instanceIdentifier.getId(), eventType);
                rabbitTemplate.convertAndSend(AiStatisticsMQConstants.EXCHANGE, routingKey, event);
                log.debug("AI统计事件发布成功：type={}, conversationId={}", eventType, event.getConversationId());
            } catch (Exception e) {
                log.error("AI统计事件发布失败：type={}, error={}", eventType, e.getMessage());
            }
        }, ragTaskExecutor);
    }
}
