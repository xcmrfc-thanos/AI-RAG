package com.knowledge.base.ai.config;

import com.knowledge.base.common.config.SystemConfigCache;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;

/**
 * KAG 运行时开关热读：优先 Redis {@link SystemConfigCache}，否则回退 {@link KAGProperties}。
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Slf4j
@Component
public class KagRuntimeSettings {

    /** 文档发布后是否自动抽实体/构图 */
    public static final String KEY_AUTO_EXTRACT = "kag.extraction.auto-enabled";

    private final KAGProperties kagProperties;
    @Nullable
    private final SystemConfigCache systemConfigCache;

    /**
     * 构造热读解析器（Spring 注入；缓存可选）。
     *
     * @param kagProperties     yml/Nacos 兜底
     * @param systemConfigCache 可选 Redis 配置缓存
     */
    @Autowired
    public KagRuntimeSettings(KAGProperties kagProperties,
                              @Autowired(required = false) SystemConfigCache systemConfigCache) {
        this.kagProperties = kagProperties;
        this.systemConfigCache = systemConfigCache;
    }

    /**
     * 单测构造。
     *
     * @param kagProperties     兜底配置
     * @param systemConfigCache 缓存或 null
     * @return 解析器
     */
    public static KagRuntimeSettings forTest(KAGProperties kagProperties,
                                             @Nullable SystemConfigCache systemConfigCache) {
        return new KagRuntimeSettings(kagProperties, systemConfigCache);
    }

    /**
     * 是否在文档发布时自动触发图谱构建。
     *
     * <p>无缓存/读失败时回退 {@link KAGProperties.Extraction#isAutoEnabled()}（默认 true）。</p>
     *
     * @return true 表示自动抽取
     */
    public boolean isAutoExtractEnabled() {
        boolean fallback = kagProperties.getExtraction().isAutoEnabled();
        if (systemConfigCache == null) {
            return fallback;
        }
        try {
            String raw = systemConfigCache.getConfig(KEY_AUTO_EXTRACT);
            if (raw == null || raw.isBlank()) {
                return fallback;
            }
            return parseBoolean(raw, fallback);
        } catch (Exception e) {
            log.warn("读取配置 {} 失败，回退 {}: {}", KEY_AUTO_EXTRACT, fallback, e.getMessage());
            return fallback;
        }
    }

    /**
     * 解析布尔配置（支持 true/false/1/0/yes/no）。
     *
     * @param raw      原始字符串
     * @param fallback 非法时回退
     * @return 布尔值
     */
    static boolean parseBoolean(String raw, boolean fallback) {
        String v = raw.trim().toLowerCase();
        if ("true".equals(v) || "1".equals(v) || "yes".equals(v) || "on".equals(v)) {
            return true;
        }
        if ("false".equals(v) || "0".equals(v) || "no".equals(v) || "off".equals(v)) {
            return false;
        }
        log.warn("配置布尔值非法：{}，回退 {}", raw, fallback);
        return fallback;
    }
}
