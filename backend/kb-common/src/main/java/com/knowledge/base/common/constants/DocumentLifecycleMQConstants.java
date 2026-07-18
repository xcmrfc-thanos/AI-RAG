package com.knowledge.base.common.constants;

/**
 * 文档生命周期 RabbitMQ 常量
 *
 * <p>发布端与消费者共用交换机名与路由键规则，确保实例隔离（InstanceIdentifier）。</p>
 *
 * @author knowledge-base-team
 * @since 1.0.0
 */
public final class DocumentLifecycleMQConstants {

    /** 文档生命周期 Topic 交换机（全局共享） */
    public static final String EXCHANGE = "kb.document.lifecycle.exchange";

    private DocumentLifecycleMQConstants() {
    }

    /**
     * 文档发布/更新事件路由键
     *
     * @param instanceId 实例标识
     * @return 路由键
     */
    public static String publishedRoutingKey(String instanceId) {
        return "document.lifecycle." + instanceId + ".published";
    }

    /**
     * 文档移除事件路由键
     *
     * @param instanceId 实例标识
     * @return 路由键
     */
    public static String removedRoutingKey(String instanceId) {
        return "document.lifecycle." + instanceId + ".removed";
    }

    /**
     * 仅重建图谱事件路由键
     *
     * @param instanceId 实例标识
     * @return 路由键
     */
    public static String graphRebuildRoutingKey(String instanceId) {
        return "document.lifecycle." + instanceId + ".graph_rebuild";
    }

    /**
     * 消费者绑定：所有生命周期事件
     *
     * @param instanceId 实例标识
     * @return 绑定 pattern
     */
    public static String allEventsBindingPattern(String instanceId) {
        return "document.lifecycle." + instanceId + ".#";
    }
}
