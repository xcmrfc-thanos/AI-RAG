package com.knowledge.base.ai.config;

import com.knowledge.base.common.config.SystemConfigCache;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;

/**
 * RAG 检索参数热读：优先 Redis {@link SystemConfigCache}，否则回退 {@link RagProperties}。
 *
 * <p>键名与 Settings RAG 分组一致（{@code rag.retrieval.*}）。</p>
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Slf4j
@Component
public class RagRuntimeSettings {

    /** 默认返回 Top-K */
    public static final String KEY_DEFAULT_TOP_K = "rag.retrieval.default-top-k";
    /** 混合检索各路候选 Top-K */
    public static final String KEY_HYBRID_TOP_K = "rag.retrieval.hybrid-top-k";
    /** 最终返回 Top-K */
    public static final String KEY_FINAL_TOP_K = "rag.retrieval.final-top-k";

    private final RagProperties ragProperties;
    @Nullable
    private final SystemConfigCache systemConfigCache;

    /**
     * 构造热读解析器（Spring 注入；缓存可选）。
     *
     * @param ragProperties     yml/Nacos 兜底
     * @param systemConfigCache 可选 Redis 配置缓存
     */
    @Autowired
    public RagRuntimeSettings(RagProperties ragProperties,
                              @Autowired(required = false) SystemConfigCache systemConfigCache) {
        this.ragProperties = ragProperties;
        this.systemConfigCache = systemConfigCache;
    }

    /**
     * 单测构造。
     *
     * @param ragProperties     兜底配置
     * @param systemConfigCache 缓存或 null
     * @return 解析器
     */
    public static RagRuntimeSettings forTest(RagProperties ragProperties,
                                             @Nullable SystemConfigCache systemConfigCache) {
        return new RagRuntimeSettings(ragProperties, systemConfigCache);
    }

    /**
     * 解析默认 Top-K（对话/未指定时），至少为 1。
     *
     * @return Top-K
     */
    public int resolveDefaultTopK() {
        return resolvePositiveInt(KEY_DEFAULT_TOP_K, ragProperties.getRetrieval().getDefaultTopK());
    }

    /**
     * 解析混合检索各路候选 Top-K，至少为 1。
     *
     * @return hybrid Top-K
     */
    public int resolveHybridTopK() {
        return resolvePositiveInt(KEY_HYBRID_TOP_K, ragProperties.getRetrieval().getHybridTopK());
    }

    /**
     * 解析最终返回 Top-K，至少为 1。
     *
     * @return final Top-K
     */
    public int resolveFinalTopK() {
        return resolvePositiveInt(KEY_FINAL_TOP_K, ragProperties.getRetrieval().getFinalTopK());
    }

    /**
     * 从缓存读取正整数；失败回退 fallback（clamp ≥1）。
     *
     * @param configKey 配置键
     * @param fallback  属性默认值
     * @return 有效整数
     */
    int resolvePositiveInt(String configKey, int fallback) {
        int safeFallback = Math.max(1, fallback);
        if (systemConfigCache == null) {
            return safeFallback;
        }
        try {
            String raw = systemConfigCache.getConfig(configKey);
            if (raw == null || raw.isBlank()) {
                return safeFallback;
            }
            int value = Integer.parseInt(raw.trim());
            if (value <= 0) {
                log.warn("配置 {}={} 非法，回退 {}", configKey, raw, safeFallback);
                return safeFallback;
            }
            return value;
        } catch (NumberFormatException e) {
            log.warn("配置 {} 非数字，回退 {}: {}", configKey, safeFallback, e.getMessage());
            return safeFallback;
        } catch (Exception e) {
            log.warn("读取配置 {} 失败，回退 {}: {}", configKey, safeFallback, e.getMessage());
            return safeFallback;
        }
    }
}
