package com.knowledge.base.ai.config;

import com.knowledge.base.common.config.SystemConfigCache;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * RAG 检索参数热读：优先 Redis {@link SystemConfigCache}，否则回退 {@link RagProperties}。
 *
 * <p>键名与 Settings RAG 分组一致（{@code rag.retrieval.*} / {@code rag.rerank.*}）。</p>
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
    /** 是否启用重排 */
    public static final String KEY_RERANK_ENABLED = "rag.rerank.enabled";
    /** 重排模式：off / api / llm */
    public static final String KEY_RERANK_MODE = "rag.rerank.mode";
    /** 重排 provider：auto / qwen / siliconflow / custom */
    public static final String KEY_RERANK_PROVIDER = "rag.rerank.provider";
    /** 重排模型名（空则按 provider 默认） */
    public static final String KEY_RERANK_MODEL = "rag.rerank.model";

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
     * 是否启用重排（缓存优先，yml 兜底）。
     *
     * @return true 表示允许进入 api/llm 重排
     */
    public boolean resolveRerankEnabled() {
        boolean fallback = ragProperties.getRerank() != null && ragProperties.getRerank().isEnabled();
        return resolveBoolean(KEY_RERANK_ENABLED, fallback);
    }

    /**
     * 解析重排 mode（off/api/llm）；未启用时返回 off。
     *
     * @return 规范化 mode
     */
    public String resolveRerankMode() {
        if (!resolveRerankEnabled()) {
            return "off";
        }
        String fallback = ragProperties.getRerank() != null && StringUtils.hasText(ragProperties.getRerank().getMode())
                ? ragProperties.getRerank().getMode().trim().toLowerCase()
                : "api";
        String mode = resolveString(KEY_RERANK_MODE, fallback);
        if (!StringUtils.hasText(mode)) {
            return "api";
        }
        return mode.trim().toLowerCase();
    }

    /**
     * 解析重排 provider（空则回退 yml）。
     *
     * @return provider 或空串
     */
    public String resolveRerankProvider() {
        String fallback = ragProperties.getRerank() != null && StringUtils.hasText(ragProperties.getRerank().getProvider())
                ? ragProperties.getRerank().getProvider().trim()
                : "auto";
        return resolveString(KEY_RERANK_PROVIDER, fallback);
    }

    /**
     * 解析重排模型（空串表示使用 provider 默认）。
     *
     * @return 模型名或空串
     */
    public String resolveRerankModel() {
        String fallback = ragProperties.getRerank() != null && StringUtils.hasText(ragProperties.getRerank().getModel())
                ? ragProperties.getRerank().getModel().trim()
                : "";
        return resolveString(KEY_RERANK_MODEL, fallback);
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

    /**
     * 从缓存读取布尔值；失败回退 fallback。
     *
     * @param configKey 配置键
     * @param fallback  属性默认值
     * @return 布尔
     */
    boolean resolveBoolean(String configKey, boolean fallback) {
        if (systemConfigCache == null) {
            return fallback;
        }
        try {
            String raw = systemConfigCache.getConfig(configKey);
            if (raw == null || raw.isBlank()) {
                return fallback;
            }
            String v = raw.trim().toLowerCase();
            if ("true".equals(v) || "1".equals(v) || "yes".equals(v)) {
                return true;
            }
            if ("false".equals(v) || "0".equals(v) || "no".equals(v)) {
                return false;
            }
            log.warn("配置 {}={} 非法，回退 {}", configKey, raw, fallback);
            return fallback;
        } catch (Exception e) {
            log.warn("读取配置 {} 失败，回退 {}: {}", configKey, fallback, e.getMessage());
            return fallback;
        }
    }

    /**
     * 从缓存读取字符串；空白回退 fallback。
     *
     * @param configKey 配置键
     * @param fallback  属性默认值
     * @return 非 null 字符串
     */
    String resolveString(String configKey, String fallback) {
        String safeFallback = fallback != null ? fallback : "";
        if (systemConfigCache == null) {
            return safeFallback;
        }
        try {
            String raw = systemConfigCache.getConfig(configKey);
            if (raw == null || raw.isBlank()) {
                return safeFallback;
            }
            return raw.trim();
        } catch (Exception e) {
            log.warn("读取配置 {} 失败，回退 {}: {}", configKey, safeFallback, e.getMessage());
            return safeFallback;
        }
    }
}
