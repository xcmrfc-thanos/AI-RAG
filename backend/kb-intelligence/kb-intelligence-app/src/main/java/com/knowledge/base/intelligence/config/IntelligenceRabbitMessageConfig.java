package com.knowledge.base.intelligence.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.DefaultClassMapper;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.boot.autoconfigure.amqp.SimpleRabbitListenerContainerFactoryConfigurer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

/**
 * Intelligence 统一 RabbitMQ JSON 序列化配置
 *
 * <p>修复 RAG/KAG 重建索引队列 Java 反序列化 SecurityException，Producer/Consumer 均走 Jackson JSON。</p>
 *
 * @author 苏三
 * @since 1.0.0
 */
@Configuration
public class IntelligenceRabbitMessageConfig {

    /**
     * Intelligence 模块统一 JSON 消息转换器（含 RAG/KAG 消息白名单）
     */
    /**
     * intelligenceJackson2JsonMessageConverter 方法。
     */
    @Bean
    @Primary
    public Jackson2JsonMessageConverter intelligenceJackson2JsonMessageConverter() {
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        Jackson2JsonMessageConverter converter = new Jackson2JsonMessageConverter(objectMapper);
        DefaultClassMapper classMapper = new DefaultClassMapper();
        classMapper.setTrustedPackages(
                "com.knowledge.base.ai.mq",
                "com.knowledge.base.common.event",
                "java.util",
                "java.lang"
        );
        converter.setClassMapper(classMapper);
        converter.setCreateMessageIds(true);
        return converter;
    }

    /**
     * 默认 RabbitTemplate 使用 JSON 序列化，避免 ReindexMessage 走 Java 原生序列化
     */
    /**
     * rabbitTemplate 方法。
     */
    @Bean
    @Primary
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory,
                                         Jackson2JsonMessageConverter intelligenceJackson2JsonMessageConverter) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(intelligenceJackson2JsonMessageConverter);
        return template;
    }

    /**
     * 默认监听容器工厂（RAG/KAG 等未指定 containerFactory 的 @RabbitListener）
     */
    /**
     * rabbitListenerContainerFactory 方法。
     */
    @Bean
    @Primary
    public SimpleRabbitListenerContainerFactory rabbitListenerContainerFactory(
            SimpleRabbitListenerContainerFactoryConfigurer configurer,
            ConnectionFactory connectionFactory,
            Jackson2JsonMessageConverter intelligenceJackson2JsonMessageConverter) {
        SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory();
        configurer.configure(factory, connectionFactory);
        factory.setMessageConverter(intelligenceJackson2JsonMessageConverter);
        return factory;
    }
}
