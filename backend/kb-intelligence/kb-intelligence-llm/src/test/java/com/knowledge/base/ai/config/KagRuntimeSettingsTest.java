package com.knowledge.base.ai.config;

import com.knowledge.base.common.config.SystemConfigCache;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * KagRuntimeSettings 热读与回退单测。
 *
 * @author AI-RAG
 * @since 1.0.0
 */
class KagRuntimeSettingsTest {

    private KAGProperties properties;
    private SystemConfigCache cache;

    /**
     * 初始化属性与 mock 缓存。
     */
    @BeforeEach
    void setUp() {
        properties = new KAGProperties();
        properties.getExtraction().setAutoEnabled(true);
        cache = mock(SystemConfigCache.class);
    }

    /**
     * 无缓存时回退属性默认 true。
     */
    @Test
    void noCache_fallsBackTrue() {
        assertTrue(KagRuntimeSettings.forTest(properties, null).isAutoExtractEnabled());
    }

    /**
     * 缓存 false 关闭自动抽取。
     */
    @Test
    void cacheFalse_disables() {
        when(cache.getConfig(KagRuntimeSettings.KEY_AUTO_EXTRACT)).thenReturn("false");
        assertFalse(KagRuntimeSettings.forTest(properties, cache).isAutoExtractEnabled());
    }

    /**
     * 缓存 0 视为 false。
     */
    @Test
    void cacheZero_disables() {
        when(cache.getConfig(KagRuntimeSettings.KEY_AUTO_EXTRACT)).thenReturn("0");
        assertFalse(KagRuntimeSettings.forTest(properties, cache).isAutoExtractEnabled());
    }

    /**
     * 读失败回退属性。
     */
    @Test
    void cacheThrows_fallsBack() {
        when(cache.getConfig(KagRuntimeSettings.KEY_AUTO_EXTRACT))
                .thenThrow(new RuntimeException("redis down"));
        assertTrue(KagRuntimeSettings.forTest(properties, cache).isAutoExtractEnabled());
    }
}
