package com.knowledge.base.document.config;

/**
 * 文档索引触发模式（单选，禁止 Feign/MQ 双开）
 *
 * @author AI-RAG
 * @since 1.0.0
 */
public enum DocumentIndexingMode {

    /** 正常终态：仅 RabbitMQ 领域事件 */
    EVENT,

    /** 应急回退：仅索引型 Feign，不发 MQ */
    LEGACY_FEIGN,

    /** 关闭索引副作用 */
    DISABLED
}
