package com.knowledge.base.statistics.mq;

import com.knowledge.base.common.event.AiStatisticsEventDTO;
import com.knowledge.base.common.constants.AiStatisticsMQConstants;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * AI 统计投影 MQ 监听器（P3-1）。
 */
@Slf4j
@Component
public class AiStatisticsMQListener {

    @Resource
    private JdbcTemplate jdbcTemplate;

    /**
     * 消费 AI 统计事件并写入本地投影表
     */
    @RabbitListener(queues = "#{@statisticsAiQueue.name}")
    public void handleAiStatisticsEvent(AiStatisticsEventDTO event) {
        if (event == null || event.getEventType() == null) {
            return;
        }
        try {
            switch (event.getEventType()) {
                case AiStatisticsMQConstants.EVENT_CONVERSATION_CREATED -> insertConversation(event);
                case AiStatisticsMQConstants.EVENT_CONVERSATION_DELETED -> markConversationDeleted(event);
                case AiStatisticsMQConstants.EVENT_USER_MESSAGE_CREATED -> insertUserMessage(event);
                default -> log.warn("未知 AI 统计事件类型：{}", event.getEventType());
            }
        } catch (Exception e) {
            log.error("处理 AI 统计事件失败：type={}, conversationId={}, error={}",
                    event.getEventType(), event.getConversationId(), e.getMessage(), e);
        }
    }

    /**
     * 插入对话投影
     */
    private void insertConversation(AiStatisticsEventDTO event) {
        jdbcTemplate.update(
                "INSERT INTO stat_ai_conversation (id, user_id, created_at, deleted) VALUES (?, ?, NOW(), 0) "
                        + "ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), deleted = 0",
                event.getConversationId(),
                event.getUserId());
    }

    /**
     * 标记对话已删除
     */
    private void markConversationDeleted(AiStatisticsEventDTO event) {
        jdbcTemplate.update(
                "UPDATE stat_ai_conversation SET deleted = 1 WHERE id = ?",
                event.getConversationId());
    }

    /**
     * 插入用户消息投影
     */
    private void insertUserMessage(AiStatisticsEventDTO event) {
        jdbcTemplate.update(
                "INSERT INTO stat_ai_message (id, conversation_id, role, created_at, deleted) "
                        + "VALUES (?, ?, 'user', NOW(), 0) ON DUPLICATE KEY UPDATE deleted = 0",
                event.getMessageId(),
                event.getConversationId());
    }
}
