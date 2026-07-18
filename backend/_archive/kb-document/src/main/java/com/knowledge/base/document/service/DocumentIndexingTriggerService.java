package com.knowledge.base.document.service;

import com.knowledge.base.document.entity.Document;

/**
 * 文档索引副作用触发服务
 *
 * <p>统一入口：优先 MQ 领域事件，可选 Feign 兜底（{@code document.indexing.feign-fallback-enabled}）。</p>
 *
 * @author knowledge-base-team
 * @since 1.0.0
 */
public interface DocumentIndexingTriggerService {

    /**
     * 文档发布或内容更新后触发索引（RAG + KAG + ES）
     *
     * @param document 文档实体
     * @param content  正文（可选）
     */
    void onPublished(Document document, String content);

    /**
     * 文档删除/下架/归档后触发索引清理
     *
     * @param documentId 文档 ID
     * @param title      文档标题（可选，用于日志）
     */
    void onRemoved(Long documentId, String title);

    /**
     * 仅触发 KAG 图谱重建（批量重建场景）
     *
     * @param documentId 文档 ID
     * @param title      文档标题（可选）
     */
    void onGraphRebuild(Long documentId, String title);
}
