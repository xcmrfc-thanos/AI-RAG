package com.knowledge.base.document.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * 文档索引触发配置
 *
 * <p>Phase 0：默认走 MQ 领域事件；Feign 作为可选兜底（双写过渡期）。</p>
 *
 * @author knowledge-base-team
 * @since 1.0.0
 */
@Data
@Component
@ConfigurationProperties(prefix = "document.indexing")
public class DocumentIndexingProperties {

    /**
     * 是否通过 RabbitMQ 发布文档生命周期事件
     */
    private boolean eventEnabled = true;

    /**
     * 是否在事件之外保留 Feign 同步触发（过渡兜底，默认关闭）
     */
    private boolean feignFallbackEnabled = false;
}
