package com.knowledge.base.ai.config;

import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * 文档生命周期监听器容器工厂
 *
 * @author knowledge-base-team
 * @since 1.0.0
 */
@Configuration
public class DocumentLifecycleListenerConfig {

    /**
     * 使用文档生命周期专用 JSON 转换器的监听容器
     */
    @Bean
    public SimpleRabbitListenerContainerFactory documentLifecycleListenerContainerFactory(
            ConnectionFactory connectionFactory,
            Jackson2JsonMessageConverter documentLifecycleMessageConverter) {
        SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory();
        factory.setConnectionFactory(connectionFactory);
        factory.setMessageConverter(documentLifecycleMessageConverter);
        return factory;
    }
}
