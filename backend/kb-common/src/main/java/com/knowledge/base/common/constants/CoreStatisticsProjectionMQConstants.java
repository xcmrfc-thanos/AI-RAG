package com.knowledge.base.common.constants;

/**
 * Core 域统计投影 RabbitMQ 常量（P3-1b）。
 */
public final class CoreStatisticsProjectionMQConstants {

    public static final String EXCHANGE = "kb.statistics.exchange";

    public static final String EVENT_DOCUMENT_UPSERT = "DOCUMENT_UPSERT";
    public static final String EVENT_DOCUMENT_DELETE = "DOCUMENT_DELETE";
    public static final String EVENT_USER_UPSERT = "USER_UPSERT";
    public static final String EVENT_USER_DELETE = "USER_DELETE";
    public static final String EVENT_COMMENT_UPSERT = "COMMENT_UPSERT";
    public static final String EVENT_COMMENT_DELETE = "COMMENT_DELETE";
    public static final String EVENT_CATEGORY_UPSERT = "CATEGORY_UPSERT";
    public static final String EVENT_ROLE_UPSERT = "ROLE_UPSERT";
    public static final String EVENT_TEAM_UPSERT = "TEAM_UPSERT";

    private CoreStatisticsProjectionMQConstants() {
    }

    /**
     * 构建投影事件路由键。
     */
    public static String routingKey(String instanceId, String eventType) {
        return "statistics.projection." + instanceId + "." + eventType.toLowerCase();
    }

    /**
     * 构建投影队列绑定通配路由键。
     */
    public static String bindingPattern(String instanceId) {
        return "statistics.projection." + instanceId + ".*";
    }
}
