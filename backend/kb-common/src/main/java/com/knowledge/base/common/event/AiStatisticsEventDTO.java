package com.knowledge.base.common.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * AI 统计投影事件 DTO（Intelligence → kb-statistics，P3-1）。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiStatisticsEventDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    /** CONVERSATION_CREATED / CONVERSATION_DELETED / USER_MESSAGE_CREATED */
    private String eventType;

    private Long conversationId;

    private Long messageId;

    private Long userId;

    private String role;

    private LocalDateTime timestamp;
}
