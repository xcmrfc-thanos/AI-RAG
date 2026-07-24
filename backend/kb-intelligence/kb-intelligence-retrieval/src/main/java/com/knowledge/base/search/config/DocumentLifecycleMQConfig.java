package com.knowledge.base.search.config;

import com.knowledge.base.common.config.InstanceIdentifier;
import com.knowledge.base.common.constants.DocumentLifecycleMQConstants;
import jakarta.annotation.Resource;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * 文档生命周期 MQ 配置（检索子模块消费端）
 *
 * <p>交换机与 JSON 转换器由 graph 子模块 {@code DocumentLifecycleMQConfig} 统一提供，
 * 本模块仅声明 search 专属队列与绑定。</p>
 *
 * @author knowledge-base-team
 * @since 1.0.0
 */
@Configuration("searchDocumentLifecycleMQConfig")
public class DocumentLifecycleMQConfig {

    @Resource
    private InstanceIdentifier instanceIdentifier;

    /**
     * Intelligence 检索子模块文档生命周期队列
     */
    /**
     * 搜索DocumentLifecycleQueue。
     */
    @Bean
    public Queue searchDocumentLifecycleQueue() {
        return QueueBuilder.durable(searchDocumentLifecycleQueueName()).build();
    }

    /**
     * 绑定文档生命周期事件
     */
    /**
     * 搜索DocumentLifecycleBinding。
     */
    @Bean
    public Binding searchDocumentLifecycleBinding(TopicExchange documentLifecycleExchange) {
        return BindingBuilder.bind(searchDocumentLifecycleQueue())
                .to(documentLifecycleExchange)
                .with(DocumentLifecycleMQConstants.allEventsBindingPattern(instanceIdentifier.getId()));
    }

    /**
     * 获取队列名
     */
    public String searchDocumentLifecycleQueueName() {
        return "kb.search.document.lifecycle.queue." + instanceIdentifier.getId();
    }
}
