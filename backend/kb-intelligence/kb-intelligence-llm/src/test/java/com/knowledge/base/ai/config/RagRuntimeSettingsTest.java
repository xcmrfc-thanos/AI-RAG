package com.knowledge.base.ai.config;

import com.knowledge.base.common.config.SystemConfigCache;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * RagRuntimeSettings 热读与回退单测。
 *
 * @author AI-RAG
 * @since 1.0.0
 */
class RagRuntimeSettingsTest {

    private RagProperties properties;
    private SystemConfigCache cache;

    /**
     * 初始化属性与 mock 缓存。
     */
    @BeforeEach
    void setUp() {
        properties = new RagProperties();
        properties.getRetrieval().setDefaultTopK(5);
        properties.getRetrieval().setHybridTopK(20);
        properties.getRetrieval().setFinalTopK(5);
        cache = mock(SystemConfigCache.class);
    }

    /**
     * 无缓存时回退属性。
     */
    @Test
    void noCache_fallsBack() {
        RagRuntimeSettings settings = RagRuntimeSettings.forTest(properties, null);
        assertEquals(5, settings.resolveDefaultTopK());
        assertEquals(20, settings.resolveHybridTopK());
        assertEquals(5, settings.resolveFinalTopK());
    }

    /**
     * 缓存命中时使用热读值。
     */
    @Test
    void cacheHit_usesCached() {
        when(cache.getConfig(RagRuntimeSettings.KEY_DEFAULT_TOP_K)).thenReturn("8");
        when(cache.getConfig(RagRuntimeSettings.KEY_HYBRID_TOP_K)).thenReturn("30");
        RagRuntimeSettings settings = RagRuntimeSettings.forTest(properties, cache);
        assertEquals(8, settings.resolveDefaultTopK());
        assertEquals(30, settings.resolveHybridTopK());
    }

    /**
     * 非法数字回退。
     */
    @Test
    void illegal_fallsBack() {
        when(cache.getConfig(RagRuntimeSettings.KEY_DEFAULT_TOP_K)).thenReturn("x");
        RagRuntimeSettings settings = RagRuntimeSettings.forTest(properties, cache);
        assertEquals(5, settings.resolveDefaultTopK());
    }
}
