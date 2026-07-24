package com.knowledge.base.document.config;

import com.knowledge.base.common.constants.DocumentLifecycleMQConstants;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * 文档生命周期 MQ 配置（发布端）
 *
 * <p>声明共享交换机，确保 kb-document 发布时交换机已存在。</p>
 *
 * @author knowledge-base-team
 * @since 1.0.0
 */
@Configuration
public class DocumentLifecycleMQConfig {

    /**
     * 文档生命周期 Topic 交换机
     */
    /**
     * documentLifecycleExchange 方法。
     */
    @Bean
    public TopicExchange documentLifecycleExchange() {
        return new TopicExchange(DocumentLifecycleMQConstants.EXCHANGE, true, false);
    }
}
