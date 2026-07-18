package com.knowledge.base.common.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Intelligence BC 统一 ES 索引配置
 *
 * <p>doc-level（全文检索）与 chunk-level（向量/RAG）索引名集中管理，
 * 对应 rh-cha §3 Indexing Pipeline 第一阶段：配置统一、逻辑仍双索引。</p>
 *
 * @author knowledge-base-team
 * @since 1.0.0
 */
@Data
@Component
@ConfigurationProperties(prefix = "intelligence.indexing")
public class IntelligenceIndexingProperties {

    /** 文档级全文索引（原 kb-search） */
    private String documentIndex = "kb_document";

    /** 分块向量索引（原 kb-ai RAG） */
    private String chunkIndex = "kb_chunk";

    /**
     * 是否使用 IK 分词创建 ES 索引（本地 Docker ES 无 IK 插件时设为 false，回落 standard）
     */
    private boolean useIkAnalyzer = true;
}
