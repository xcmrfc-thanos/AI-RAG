package com.knowledge.base.ai.rag.rerank;

import com.knowledge.base.ai.config.RagProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * {@link RerankProviderResolver} 单测。
 */
class RerankProviderResolverTest {

    private RagProperties ragProperties;
    private RerankProviderResolver resolver;

    @BeforeEach
    void setUp() {
        ragProperties = new RagProperties();
        resolver = new RerankProviderResolver(ragProperties, null);
        ReflectionTestUtils.setField(resolver, "qwenApiKey", "qwen-key");
        ReflectionTestUtils.setField(resolver, "siliconflowApiKey", "sf-key");
        ReflectionTestUtils.setField(resolver, "siliconflowBaseUrl", "https://api.siliconflow.cn/v1");
    }

    @Test
    void autoFollowsSiliconflowEmbedding() {
        ragProperties.getEmbedding().setProvider("siliconflow");
        ragProperties.getRerank().setProvider("auto");
        ragProperties.getRerank().setMode("api");
        ragProperties.getRerank().setEnabled(true);

        ResolvedRerank cfg = resolver.resolve();
        assertTrue(cfg.usable());
        assertEquals("siliconflow", cfg.provider());
        assertEquals(RerankProviderResolver.DEFAULT_SILICONFLOW_MODEL, cfg.model());
        assertEquals("/rerank", cfg.endpointPath());
        assertEquals("sf-key", cfg.apiKey());
    }

    @Test
    void autoFollowsQwenEmbedding() {
        ragProperties.getEmbedding().setProvider("qwen");
        ragProperties.getRerank().setProvider("auto");
        ragProperties.getRerank().setMode("api");

        ResolvedRerank cfg = resolver.resolve();
        assertTrue(cfg.usable());
        assertEquals("qwen", cfg.provider());
        assertEquals(RerankProviderResolver.DEFAULT_QWEN_MODEL, cfg.model());
        assertEquals("/reranks", cfg.endpointPath());
        assertEquals(RerankProviderResolver.DEFAULT_QWEN_RERANK_BASE, cfg.baseUrl());
    }

    @Test
    void customWithoutBaseUrlNotUsable() {
        ragProperties.getRerank().setProvider("custom");
        ragProperties.getRerank().setMode("api");
        ragProperties.getRerank().setBaseUrl("");
        ragProperties.getRerank().setModel("BAAI/bge-reranker-v2-m3");

        ResolvedRerank cfg = resolver.resolve();
        assertFalse(cfg.usable());
        assertEquals("custom", cfg.provider());
    }

    @Test
    void modeOffNotUsable() {
        ragProperties.getRerank().setMode("off");
        assertFalse(resolver.resolve().usable());
        assertEquals("off", resolver.resolveMode());
    }
}
