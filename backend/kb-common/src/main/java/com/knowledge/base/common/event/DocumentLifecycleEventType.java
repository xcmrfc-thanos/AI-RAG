package com.knowledge.base.common.event;

/**
 * 文档生命周期领域事件类型
 *
 * <p>通过 RabbitMQ 在 kb-document 与 Intelligence 子服务（ai/search/graph）之间传递，
 * 替代 Document 对索引服务的同步 Feign 编排。</p>
 *
 * @author knowledge-base-team
 * @since 1.0.0
 */
public enum DocumentLifecycleEventType {

    /**
     * 文档发布或内容更新：触发 RAG 向量索引、KAG 图谱构建、ES 全文索引
     */
    PUBLISHED,

    /**
     * 文档删除/下架/归档：触发各索引与图谱清理
     */
    REMOVED,

    /**
     * 仅重建 KAG 图谱（批量重建场景，不触发 RAG/ES）
     */
    GRAPH_REBUILD
}
