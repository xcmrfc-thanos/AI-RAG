package com.knowledge.base.search.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 搜索双索引健康检查结果
 *
 * <p>对比 kb-core 已发布文档数与 ES {@code kb_document} / {@code kb_chunk} 索引文档量。</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchIndexHealthVO {

    /** 健康状态：HEALTHY / WARNING / CRITICAL */
    private String status;

    /** 人类可读摘要 */
    private String message;

    /** kb-core MySQL 已发布文档数（status=1） */
    private Long mysqlPublishedCount;

    /** ES 文档级索引文档数 */
    private Long esDocumentCount;

    /** ES chunk 索引文档数 */
    private Long esChunkCount;

    /** 文档级索引是否存在 */
    private Boolean documentIndexExists;

    /** chunk 索引是否存在 */
    private Boolean chunkIndexExists;

    /** 文档级索引是否与 MySQL 已发布数一致 */
    private Boolean documentCountSynced;

    /** chunk 索引是否具备基础数据（有已发布文档时应有 chunk） */
    private Boolean chunkIndexPopulated;
}
