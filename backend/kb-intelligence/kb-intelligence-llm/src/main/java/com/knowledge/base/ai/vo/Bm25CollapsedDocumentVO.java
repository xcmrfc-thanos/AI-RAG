package com.knowledge.base.ai.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * collapse 聚合后的单文档 BM25 命中（含多个 top chunk）
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Bm25CollapsedDocumentVO {

    /** 文档 ID */
    private Long documentId;

    /** 文档标题 */
    private String documentTitle;

    /** 发布时间 */
    private String publishTime;

    /** 文档级得分（取得分最高的 chunk 分数） */
    private Double score;

    /** 该文档下命中的 chunk 列表 */
    @Builder.Default
    private List<RagSearchResultVO> chunks = new ArrayList<>();
}
