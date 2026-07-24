package com.knowledge.base.ai.config;

import org.springframework.util.StringUtils;

import java.util.Locale;
import java.util.Objects;

/**
 * 检索部署形态白名单：关键词腿 × 向量腿。
 *
 * <p>仅下列五组合合法；非法组合应在启动或保存设置时拒绝。</p>
 *
 * @author AI-RAG
 * @since 1.0.0
 */
public enum RetrievalEngineProfile {

    /** ES BM25 + ES dense（默认） */
    ES_ES("es-es", "elasticsearch", "elasticsearch", "Elasticsearch（单库，推荐）"),
    /** ES BM25 + Qdrant dense */
    ES_QDRANT("es-qdrant", "elasticsearch", "qdrant", "ES + Qdrant（组合）"),
    /** Qdrant sparse + Qdrant dense */
    QDRANT_QDRANT("qdrant-qdrant", "qdrant", "qdrant", "Qdrant（单库）"),
    /** ES BM25 + Milvus dense */
    ES_MILVUS("es-milvus", "elasticsearch", "milvus", "ES + Milvus（组合）"),
    /** Milvus sparse + Milvus dense */
    MILVUS_MILVUS("milvus-milvus", "milvus", "milvus", "Milvus（单库）");

    private final String id;
    private final String keywordEngine;
    private final String denseEngine;
    private final String displayName;

    RetrievalEngineProfile(String id, String keywordEngine, String denseEngine, String displayName) {
        this.id = id;
        this.keywordEngine = keywordEngine;
        this.denseEngine = denseEngine;
        this.displayName = displayName;
    }

    /**
     * 配置/API 用稳定 ID。
     *
     * @return 如 es-es
     */
    public String id() {
        return id;
    }

    /**
     * 关键词腿引擎。
     *
     * @return elasticsearch | qdrant | milvus
     */
    public String keywordEngine() {
        return keywordEngine;
    }

    /**
     * 向量腿引擎。
     *
     * @return elasticsearch | qdrant | milvus
     */
    public String denseEngine() {
        return denseEngine;
    }

    /**
     * 设置页展示名。
     *
     * @return 中文名
     */
    public String displayName() {
        return displayName;
    }

    /**
     * 是否需要 Qdrant 客户端（dense 或 keyword 含 qdrant）。
     *
     * @return true 需要
     */
    public boolean needsQdrant() {
        return "qdrant".equals(keywordEngine) || "qdrant".equals(denseEngine);
    }

    /**
     * 是否需要 Milvus 客户端。
     *
     * @return true 需要
     */
    public boolean needsMilvus() {
        return "milvus".equals(keywordEngine) || "milvus".equals(denseEngine);
    }

    /**
     * 是否需要 ES chunk 索引（BM25 或 dense 在 ES）。
     *
     * @return true 需要
     */
    public boolean needsElasticsearchChunk() {
        return "elasticsearch".equals(keywordEngine) || "elasticsearch".equals(denseEngine);
    }

    /**
     * 兼容旧配置映射。
     *
     * @param vectorStore    rag.vector-store
     * @param qdrantEnabled  rag.qdrant.enabled
     * @return 白名单 profile
     */
    public static RetrievalEngineProfile fromLegacy(String vectorStore, boolean qdrantEnabled) {
        String vs = normalizeEngine(vectorStore, "elasticsearch");
        if ("milvus".equals(vs)) {
            return MILVUS_MILVUS;
        }
        if ("qdrant".equals(vs)) {
            return QDRANT_QDRANT;
        }
        // elasticsearch
        return qdrantEnabled ? ES_QDRANT : ES_ES;
    }

    /**
     * 由两腿解析；非法则抛异常。
     *
     * @param keywordEngine 关键词腿
     * @param denseEngine   向量腿
     * @return profile
     */
    public static RetrievalEngineProfile fromEngines(String keywordEngine, String denseEngine) {
        String kw = normalizeEngine(keywordEngine, null);
        String dense = normalizeEngine(denseEngine, null);
        if (kw == null || dense == null) {
            throw new IllegalArgumentException("关键词引擎与向量引擎均不能为空");
        }
        for (RetrievalEngineProfile p : values()) {
            if (p.keywordEngine.equals(kw) && p.denseEngine.equals(dense)) {
                return p;
            }
        }
        throw new IllegalArgumentException(
                "不支持的检索组合: keyword=" + kw + ", dense=" + dense
                        + "；仅允许 es-es / es-qdrant / qdrant-qdrant / es-milvus / milvus-milvus");
    }

    /**
     * 由稳定 ID 解析。
     *
     * @param id 如 es-qdrant
     * @return profile
     */
    public static RetrievalEngineProfile fromId(String id) {
        if (!StringUtils.hasText(id)) {
            return ES_ES;
        }
        String n = id.trim().toLowerCase(Locale.ROOT);
        for (RetrievalEngineProfile p : values()) {
            if (p.id.equals(n)) {
                return p;
            }
        }
        throw new IllegalArgumentException("未知检索形态: " + id);
    }

    /**
     * 兼容导出旧 vector-store 字段（单库语义近似）。
     *
     * @return elasticsearch | milvus | qdrant
     */
    public String legacyVectorStore() {
        if (this == MILVUS_MILVUS) {
            return "milvus";
        }
        if (this == QDRANT_QDRANT) {
            return "qdrant";
        }
        return "elasticsearch";
    }

    /**
     * 兼容导出旧 qdrant.enabled（仅 es-qdrant 为 true；单库 qdrant 也需要客户端但不走旁路语义）。
     *
     * @return 旁路开关语义
     */
    public boolean legacyQdrantBypassEnabled() {
        return this == ES_QDRANT;
    }

    private static String normalizeEngine(String raw, String defaultValue) {
        if (!StringUtils.hasText(raw)) {
            return defaultValue;
        }
        return raw.trim().toLowerCase(Locale.ROOT);
    }

    /**
     * toString 方法。
     */
    @Override
    public String toString() {
        return id;
    }

    /**
     * 相等比较辅助。
     *
     * @param other 另一 profile
     * @return 是否同一
     */
    public boolean isSame(RetrievalEngineProfile other) {
        return this == other || Objects.equals(this, other);
    }
}
