package com.knowledge.base.ai.config;

import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * 解析当前检索部署形态（白名单），并回写兼容字段便于旧 {@code @ConditionalOnProperty}。
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RetrievalEngineResolver {

    private final RagProperties ragProperties;

    @Getter
    private RetrievalEngineProfile profile = RetrievalEngineProfile.ES_ES;

    /**
     * 启动时解析 profile；非法配置快速失败。
     */
    @PostConstruct
    public void init() {
        this.profile = resolve();
        applyLegacyCompat(profile);
        log.info("RAG retrieval profile={} keyword={} dense={} (legacy vector-store={}, qdrant.enabled={})",
                profile.id(), profile.keywordEngine(), profile.denseEngine(),
                ragProperties.getVectorStore(), ragProperties.getQdrant().isEnabled());
    }

    /**
     * 当前形态。
     *
     * @return 白名单 profile
     */
    public RetrievalEngineProfile current() {
        return profile;
    }

    /**
     * 从配置解析。
     *
     * @return profile
     */
    public RetrievalEngineProfile resolve() {
        RagProperties.Retrieval retrieval = ragProperties.getRetrieval();
        if (retrieval != null && StringUtils.hasText(retrieval.getProfile())) {
            return RetrievalEngineProfile.fromId(retrieval.getProfile());
        }
        if (retrieval != null
                && StringUtils.hasText(retrieval.getKeywordEngine())
                && StringUtils.hasText(retrieval.getDenseEngine())) {
            return RetrievalEngineProfile.fromEngines(
                    retrieval.getKeywordEngine(), retrieval.getDenseEngine());
        }
        boolean qdrant = ragProperties.getQdrant() != null && ragProperties.getQdrant().isEnabled();
        return RetrievalEngineProfile.fromLegacy(ragProperties.getVectorStore(), qdrant);
    }

    /**
     * 将 profile 同步到旧键，保持现有 Conditional 装配可用。
     *
     * <p>尚未完成 sparse 单库 / es-milvus 双写前，部分形态会降级到最近可运行组合并打 warn。</p>
     *
     * @param p profile
     */
    void applyLegacyCompat(RetrievalEngineProfile p) {
        switch (p) {
            case ES_QDRANT -> {
                ragProperties.setVectorStore("elasticsearch");
                setQdrantEnabled(true);
            }
            case QDRANT_QDRANT -> {
                log.warn("profile=qdrant-qdrant（sparse 单库）装配未完成，运行时暂降级为 es-qdrant");
                ragProperties.setVectorStore("elasticsearch");
                setQdrantEnabled(true);
            }
            case ES_MILVUS -> {
                log.warn("profile=es-milvus（ES BM25+Milvus dense）装配未完成，运行时暂降级为 es-es");
                ragProperties.setVectorStore("elasticsearch");
                setQdrantEnabled(false);
            }
            case MILVUS_MILVUS -> {
                ragProperties.setVectorStore("milvus");
                setQdrantEnabled(false);
            }
            case ES_ES -> {
                ragProperties.setVectorStore("elasticsearch");
                setQdrantEnabled(false);
            }
            default -> {
                ragProperties.setVectorStore("elasticsearch");
                setQdrantEnabled(false);
            }
        }
        if (ragProperties.getRetrieval() != null) {
            ragProperties.getRetrieval().setProfile(p.id());
            ragProperties.getRetrieval().setKeywordEngine(p.keywordEngine());
            ragProperties.getRetrieval().setDenseEngine(p.denseEngine());
        }
    }

    private void setQdrantEnabled(boolean enabled) {
        if (ragProperties.getQdrant() != null) {
            ragProperties.getQdrant().setEnabled(enabled);
        }
    }
}
