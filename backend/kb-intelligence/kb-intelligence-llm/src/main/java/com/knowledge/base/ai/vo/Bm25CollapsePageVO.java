package com.knowledge.base.ai.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * BM25 collapse 分页结果（按 document_id 聚合后的单页）
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Bm25CollapsePageVO {

    /** 命中文档总数（ES cardinality 统计） */
    private Long total;

    /** 当前页文档列表（每文档含 top chunk 命中） */
    @Builder.Default
    private List<Bm25CollapsedDocumentVO> documents = new ArrayList<>();
}
