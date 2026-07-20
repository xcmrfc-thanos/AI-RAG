package com.knowledge.base.ai.config;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * EmbeddingConfig endpoint 回退逻辑单测。
 */
class EmbeddingConfigEndpointTest {

    /**
     * embedding.apiKey 优先于 qwen.api-key。
     */
    @Test
    void resolveApiKey_prefersEmbeddingOverQwen() {
        EmbeddingConfig config = new EmbeddingConfig();
        RagProperties props = new RagProperties();
        props.getEmbedding().setApiKey("sk-embed");
        ReflectionTestUtils.setField(config, "ragProperties", props);
        ReflectionTestUtils.setField(config, "qwenApiKey", "sk-qwen");
        assertEquals("sk-embed", config.resolveApiKey());
    }

    /**
     * embedding.apiKey 为空时回退 qwen.api-key。
     */
    @Test
    void resolveApiKey_fallsBackToQwen() {
        EmbeddingConfig config = new EmbeddingConfig();
        RagProperties props = new RagProperties();
        props.getEmbedding().setApiKey("");
        ReflectionTestUtils.setField(config, "ragProperties", props);
        ReflectionTestUtils.setField(config, "qwenApiKey", "sk-qwen");
        assertEquals("sk-qwen", config.resolveApiKey());
    }

    /**
     * embedding.baseUrl 优先于 qwen.base-url。
     */
    @Test
    void resolveBaseUrl_prefersEmbeddingOverQwen() {
        EmbeddingConfig config = new EmbeddingConfig();
        RagProperties props = new RagProperties();
        props.getEmbedding().setBaseUrl("https://api.siliconflow.cn/v1");
        ReflectionTestUtils.setField(config, "ragProperties", props);
        ReflectionTestUtils.setField(config, "qwenBaseUrl", "https://dashscope.aliyuncs.com/compatible-mode/v1");
        assertEquals("https://api.siliconflow.cn/v1", config.resolveBaseUrl());
    }

    /**
     * embedding.baseUrl 为空时回退 qwen.base-url。
     */
    @Test
    void resolveBaseUrl_fallsBackToQwen() {
        EmbeddingConfig config = new EmbeddingConfig();
        RagProperties props = new RagProperties();
        props.getEmbedding().setBaseUrl("  ");
        ReflectionTestUtils.setField(config, "ragProperties", props);
        ReflectionTestUtils.setField(config, "qwenBaseUrl", "https://dashscope.aliyuncs.com/compatible-mode/v1");
        assertEquals("https://dashscope.aliyuncs.com/compatible-mode/v1", config.resolveBaseUrl());
    }

    /**
     * Embedding 默认维度与模型保持 1024 / text-embedding-v3。
     */
    @Test
    void embeddingDefaults_matchLegacy() {
        RagProperties.Embedding emb = new RagProperties().getEmbedding();
        assertEquals("text-embedding-v3", emb.getModel());
        assertEquals(1024, emb.getDimension());
        assertEquals("qwen", emb.getProvider());
        assertEquals("", emb.getApiKey());
        assertEquals("", emb.getBaseUrl());
    }
}
