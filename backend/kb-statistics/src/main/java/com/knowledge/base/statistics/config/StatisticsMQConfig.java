package com.knowledge.base.statistics.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.knowledge.base.common.config.InstanceIdentifier;
import jakarta.annotation.Resource;
import org.springframework.amqp.core.*;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.DefaultClassMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * 统计服务 RabbitMQ 配置
 *
 * <p>定义统计事件的消息队列、交换机和绑定关系</p>
 * <p>队列名与路由键使用 InstanceIdentifier 进行实例隔离</p>
 *
 * @author 苏三
 * @since 1.0.0
 */
@Configuration
public class StatisticsMQConfig {

    @Resource
    private InstanceIdentifier instanceIdentifier;

    // ======================== 交换机（全局共享） ========================

    public static final String STATISTICS_EXCHANGE = "kb.statistics.exchange";

    /**
     * statisticsExchange 方法。
     */
    @Bean
    public TopicExchange statisticsExchange() {
        return new TopicExchange(STATISTICS_EXCHANGE, true, false);
    }

    // ======================== 队列名（实例隔离） ========================

    public String statisticsViewQueueName() {
        return "kb.statistics.view.queue." + instanceIdentifier.getId();
    }

    /**
     * statisticsLikeQueueName 方法。
     */
    public String statisticsLikeQueueName() {
        return "kb.statistics.like.queue." + instanceIdentifier.getId();
    }

    /**
     * statisticsCommentQueueName 方法。
     */
    public String statisticsCommentQueueName() {
        return "kb.statistics.comment.queue." + instanceIdentifier.getId();
    }

    // ======================== 路由键（实例隔离） ========================

    public String viewRoutingKey() {
        return "statistics.view." + instanceIdentifier.getId() + ".*";
    }

    /**
     * 点赞RoutingKey。
     */
    public String likeRoutingKey() {
        return "statistics.like." + instanceIdentifier.getId() + ".*";
    }

    /**
     * commentRoutingKey 方法。
     */
    public String commentRoutingKey() {
        return "statistics.comment." + instanceIdentifier.getId() + ".*";
    }

    /**
     * aiRoutingKey 方法。
     */
    public String aiRoutingKey() {
        return com.knowledge.base.common.constants.AiStatisticsMQConstants.bindingPattern(instanceIdentifier.getId());
    }

    /**
     * projectionRoutingKey 方法。
     */
    public String projectionRoutingKey() {
        return com.knowledge.base.common.constants.CoreStatisticsProjectionMQConstants.bindingPattern(instanceIdentifier.getId());
    }

    /**
     * statisticsProjectionQueueName 方法。
     */
    public String statisticsProjectionQueueName() {
        return "kb.statistics.projection.queue." + instanceIdentifier.getId();
    }

    /**
     * statisticsOperationLogQueueName 方法。
     */
    public String statisticsOperationLogQueueName() {
        return "kb.statistics.operationlog.queue." + instanceIdentifier.getId();
    }

    /**
     * operationLogRoutingKey 方法。
     */
    public String operationLogRoutingKey() {
        return "operationlog." + instanceIdentifier.getId() + ".#";
    }

    // ======================== Bean 定义 ========================

    /**
     * statisticsViewQueue 方法。
     */
    @Bean
    public Queue statisticsViewQueue() {
        return QueueBuilder.durable(statisticsViewQueueName()).build();
    }

    /**
     * statisticsLikeQueue 方法。
     */
    @Bean
    public Queue statisticsLikeQueue() {
        return QueueBuilder.durable(statisticsLikeQueueName()).build();
    }

    /**
     * statisticsCommentQueue 方法。
     */
    @Bean
    public Queue statisticsCommentQueue() {
        return QueueBuilder.durable(statisticsCommentQueueName()).build();
    }

    /**
     * statisticsAiQueue 方法。
     */
    @Bean
    public Queue statisticsAiQueue() {
        return QueueBuilder.durable(statisticsAiQueueName()).build();
    }

    /**
     * statisticsAiQueueName 方法。
     */
    public String statisticsAiQueueName() {
        return "kb.statistics.ai.queue." + instanceIdentifier.getId();
    }

    /**
     * statisticsViewBinding 方法。
     */
    @Bean
    public Binding statisticsViewBinding() {
        return BindingBuilder.bind(statisticsViewQueue())
                .to(statisticsExchange())
                .with(viewRoutingKey());
    }

    /**
     * statisticsLikeBinding 方法。
     */
    @Bean
    public Binding statisticsLikeBinding() {
        return BindingBuilder.bind(statisticsLikeQueue())
                .to(statisticsExchange())
                .with(likeRoutingKey());
    }

    /**
     * statisticsCommentBinding 方法。
     */
    @Bean
    public Binding statisticsCommentBinding() {
        return BindingBuilder.bind(statisticsCommentQueue())
                .to(statisticsExchange())
                .with(commentRoutingKey());
    }

    /**
     * statisticsAiBinding 方法。
     */
    @Bean
    public Binding statisticsAiBinding() {
        return BindingBuilder.bind(statisticsAiQueue())
                .to(statisticsExchange())
                .with(aiRoutingKey());
    }

    /**
     * statisticsProjectionQueue 方法。
     */
    @Bean
    public Queue statisticsProjectionQueue() {
        return QueueBuilder.durable(statisticsProjectionQueueName()).build();
    }

    /**
     * statisticsProjectionBinding 方法。
     */
    @Bean
    public Binding statisticsProjectionBinding() {
        return BindingBuilder.bind(statisticsProjectionQueue())
                .to(statisticsExchange())
                .with(projectionRoutingKey());
    }

    /**
     * operationLogExchange 方法。
     */
    @Bean
    public TopicExchange operationLogExchange() {
        return new TopicExchange("kb.operationlog.exchange", true, false);
    }

    /**
     * statisticsOperationLogQueue 方法。
     */
    @Bean
    public Queue statisticsOperationLogQueue() {
        return QueueBuilder.durable(statisticsOperationLogQueueName()).build();
    }

    /**
     * statisticsOperationLogBinding 方法。
     */
    @Bean
    public Binding statisticsOperationLogBinding() {
        return BindingBuilder.bind(statisticsOperationLogQueue())
                .to(operationLogExchange())
                .with(operationLogRoutingKey());
    }

    // ======================== 消息转换器 ========================

    /**
     * jackson2JsonMessageConverter 方法。
     */
    @Bean
    public Jackson2JsonMessageConverter jackson2JsonMessageConverter() {
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        Jackson2JsonMessageConverter converter = new Jackson2JsonMessageConverter(objectMapper);
        DefaultClassMapper classMapper = new DefaultClassMapper();
        classMapper.setTrustedPackages(
                "com.knowledge.base.common.event",
                "com.knowledge.base.statistics.dto",
                "java.util",
                "java.lang"
        );
        converter.setClassMapper(classMapper);
        return converter;
    }
}
