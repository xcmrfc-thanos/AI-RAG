package com.knowledge.base.common.constants;

/**
 * AI 统计事件 RabbitMQ 常量（P3-1）。
 */
public final class AiStatisticsMQConstants {

    /** 与统计服务共用交换机 */
    public static final String EXCHANGE = "kb.statistics.exchange";

    public static final String EVENT_CONVERSATION_CREATED = "CONVERSATION_CREATED";
    public static final String EVENT_CONVERSATION_DELETED = "CONVERSATION_DELETED";
    public static final String EVENT_USER_MESSAGE_CREATED = "USER_MESSAGE_CREATED";

    private AiStatisticsMQConstants() {
    }

    /**
     * 构建 AI 统计路由键（实例隔离）。
     *
     * @param instanceId 实例标识
     * @param eventType  事件类型
     * @return 路由键
     */
    public static String routingKey(String instanceId, String eventType) {
        return "statistics.ai." + instanceId + "." + eventType.toLowerCase();
    }

    /**
     * 构建 AI 统计队列绑定通配路由键。
     *
     * @param instanceId 实例标识
     * @return 绑定路由键
     */
    public static String bindingPattern(String instanceId) {
        return "statistics.ai." + instanceId + ".*";
    }
}
