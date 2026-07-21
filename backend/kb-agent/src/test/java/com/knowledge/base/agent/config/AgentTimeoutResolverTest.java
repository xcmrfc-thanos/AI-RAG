package com.knowledge.base.agent.config;

import com.knowledge.base.common.config.SystemConfigCache;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * AgentTimeoutResolver 热读与回退单测。
 *
 * @author AI-RAG
 * @since 1.0.0
 */
class AgentTimeoutResolverTest {

    private AgentProperties properties;
    private SystemConfigCache cache;

    /**
     * 初始化属性与 mock 缓存。
     */
    @BeforeEach
    void setUp() {
        properties = new AgentProperties();
        properties.getTimeouts().setRunSeconds(90);
        properties.getTimeouts().setLlmSeconds(60);
        properties.getTimeouts().setToolSeconds(5);
        cache = mock(SystemConfigCache.class);
    }

    /**
     * 无 Redis Bean 时回退 AgentProperties。
     */
    @Test
    void noCacheBean_fallsBackToProperties() {
        AgentTimeoutResolver resolver = AgentTimeoutResolver.forTest(properties, null);
        assertEquals(90, resolver.resolveRunSeconds());
        assertEquals(60, resolver.resolveLlmSeconds());
        assertEquals(5, resolver.resolveToolSeconds());
    }

    /**
     * 缓存有合法数字时优先热读。
     */
    @Test
    void cacheHit_usesCachedSeconds() {
        when(cache.getConfig(AgentTimeoutResolver.KEY_RUN_SECONDS)).thenReturn("120");
        when(cache.getConfig(AgentTimeoutResolver.KEY_TOOL_SECONDS)).thenReturn("8");
        AgentTimeoutResolver resolver = AgentTimeoutResolver.forTest(properties, cache);
        assertEquals(120, resolver.resolveRunSeconds());
        assertEquals(8, resolver.resolveToolSeconds());
    }

    /**
     * 非法数字回退属性默认值。
     */
    @Test
    void illegalNumber_fallsBack() {
        when(cache.getConfig(AgentTimeoutResolver.KEY_RUN_SECONDS)).thenReturn("abc");
        AgentTimeoutResolver resolver = AgentTimeoutResolver.forTest(properties, cache);
        assertEquals(90, resolver.resolveRunSeconds());
    }

    /**
     * 非正数回退属性默认值。
     */
    @Test
    void nonPositive_fallsBack() {
        when(cache.getConfig(AgentTimeoutResolver.KEY_RUN_SECONDS)).thenReturn("0");
        AgentTimeoutResolver resolver = AgentTimeoutResolver.forTest(properties, cache);
        assertEquals(90, resolver.resolveRunSeconds());
    }

    /**
     * 缓存读取异常时回退。
     */
    @Test
    void cacheThrows_fallsBack() {
        when(cache.getConfig(AgentTimeoutResolver.KEY_TOOL_SECONDS))
                .thenThrow(new RuntimeException("redis down"));
        AgentTimeoutResolver resolver = AgentTimeoutResolver.forTest(properties, cache);
        assertEquals(5, resolver.resolveToolSeconds());
    }
}
