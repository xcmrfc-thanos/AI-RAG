package com.knowledge.base.ai.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.knowledge.base.common.config.InstanceIdentifier;
import com.knowledge.base.common.constants.DocumentLifecycleMQConstants;
import jakarta.annotation.Resource;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.support.converter.DefaultClassMapper;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * 文档生命周期 MQ 配置（kb-ai 消费端）
 *
 * @author knowledge-base-team
 * @since 1.0.0
 */
@Configuration
public class DocumentLifecycleMQConfig {

    @Resource
    private InstanceIdentifier instanceIdentifier;

    /**
     * 文档生命周期交换机
     */
    @Bean
    public TopicExchange documentLifecycleExchange() {
        return new TopicExchange(DocumentLifecycleMQConstants.EXCHANGE, true, false);
    }

    /**
     * kb-ai 文档生命周期队列（实例隔离）
     */
    @Bean
    public Queue aiDocumentLifecycleQueue() {
        return QueueBuilder.durable(aiDocumentLifecycleQueueName()).build();
    }

    /**
     * 绑定所有文档生命周期事件
     */
    @Bean
    public Binding aiDocumentLifecycleBinding() {
        return BindingBuilder.bind(aiDocumentLifecycleQueue())
                .to(documentLifecycleExchange())
                .with(DocumentLifecycleMQConstants.allEventsBindingPattern(instanceIdentifier.getId()));
    }

    /**
     * 获取队列名
     */
    public String aiDocumentLifecycleQueueName() {
        return "kb.ai.document.lifecycle.queue." + instanceIdentifier.getId();
    }

    /**
     * 文档生命周期消息 JSON 转换器
     */
    @Bean
    public Jackson2JsonMessageConverter documentLifecycleMessageConverter() {
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        Jackson2JsonMessageConverter converter = new Jackson2JsonMessageConverter(objectMapper);
        DefaultClassMapper classMapper = new DefaultClassMapper();
        classMapper.setTrustedPackages(
                "com.knowledge.base.common.event",
                "java.util",
                "java.lang"
        );
        converter.setClassMapper(classMapper);
        return converter;
    }
}
