package com.knowledge.base.statistics.mq;

import com.knowledge.base.common.config.SqlDialectHelper;
import com.knowledge.base.common.constants.AiStatisticsMQConstants;
import com.knowledge.base.common.event.AiStatisticsEventDTO;
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

    @Resource
    private SqlDialectHelper sqlDialectHelper;

    /**
     * 消费 AI 统计事件并写入本地投影表
     *
     * @param event 事件
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
     *
     * @param event 事件
     */
    private void insertConversation(AiStatisticsEventDTO event) {
        String now = sqlDialectHelper.currentTimestamp();
        jdbcTemplate.update(
                sqlDialectHelper.upsertSql(
                        "stat_ai_conversation",
                        "id",
                        "id, user_id, created_at, deleted",
                        "?, ?, " + now + ", 0",
                        "user_id = VALUES(user_id), deleted = 0"),
                event.getConversationId(),
                event.getUserId());
    }

    /**
     * 标记对话已删除
     *
     * @param event 事件
     */
    private void markConversationDeleted(AiStatisticsEventDTO event) {
        jdbcTemplate.update(
                "UPDATE stat_ai_conversation SET deleted = 1 WHERE id = ?",
                event.getConversationId());
    }

    /**
     * 插入用户消息投影
     *
     * @param event 事件
     */
    private void insertUserMessage(AiStatisticsEventDTO event) {
        String now = sqlDialectHelper.currentTimestamp();
        jdbcTemplate.update(
                sqlDialectHelper.upsertSql(
                        "stat_ai_message",
                        "id",
                        "id, conversation_id, role, created_at, deleted",
                        "?, ?, 'user', " + now + ", 0",
                        "deleted = 0"),
                event.getMessageId(),
                event.getConversationId());
    }
}
