package com.knowledge.base.document.config;

import jakarta.annotation.PostConstruct;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * 文档索引触发配置
 *
 * <p>使用单一 {@code document.indexing.mode=event|legacy-feign|disabled}，
 * 非法枚举值由 Spring 绑定阶段失败，避免双写。</p>
 *
 * @author knowledge-base-team
 * @since 1.0.0
 */
@Data
@Slf4j
@Component
@ConfigurationProperties(prefix = "document.indexing")
public class DocumentIndexingProperties {

    /**
     * 索引触发模式，默认 {@link DocumentIndexingMode#EVENT}
     */
    private DocumentIndexingMode mode = DocumentIndexingMode.EVENT;

    /**
     * MQ 发布失败最大重试次数（含首次）
     */
    private int publishMaxAttempts = 3;

    /**
     * MQ 发布重试基础间隔毫秒
     */
    private long publishRetryBackoffMs = 200L;

    /**
     * legacy-feign 模式启动时输出醒目 WARN
     */
    @PostConstruct
    public void warnIfLegacy() {
        if (mode == DocumentIndexingMode.LEGACY_FEIGN) {
            log.warn("##############################################################");
            log.warn("# document.indexing.mode=legacy-feign 为应急回退，已禁用 MQ 事件");
            log.warn("# 生产推荐 document.indexing.mode=event");
            log.warn("##############################################################");
        }
    }

    /**
     * 是否走事件模式
     */
    public boolean isEventMode() {
        return mode == DocumentIndexingMode.EVENT;
    }

    /**
     * 是否走 Feign 应急模式
     */
    public boolean isLegacyFeignMode() {
        return mode == DocumentIndexingMode.LEGACY_FEIGN;
    }
}
