package com.knowledge.base.ai.config;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * EmbeddingConfig endpoint 回退逻辑单测。
 */
class EmbeddingConfigEndpointTest {

    /**
     * embedding.apiKey 优先于根节点凭证。
     */
    @Test
    void resolveApiKey_prefersEmbeddingOverride() {
        EmbeddingConfig config = newConfig("siliconflow", "sk-embed", "", "sk-sf", "sk-qwen");
        assertEquals("sk-embed", config.resolveApiKey());
    }

    /**
     * provider=siliconflow 且无 embedding 覆盖时，回退 siliconflow.api-key。
     */
    @Test
    void resolveApiKey_fallsBackToSiliconflowWhenProviderSiliconflow() {
        EmbeddingConfig config = newConfig("siliconflow", "", "", "sk-sf", "sk-qwen");
        assertEquals("sk-sf", config.resolveApiKey());
    }

    /**
     * provider=qwen 时回退 qwen.api-key（不误用硅基 Key）。
     */
    @Test
    void resolveApiKey_fallsBackToQwenWhenProviderQwen() {
        EmbeddingConfig config = newConfig("qwen", "", "", "sk-sf", "sk-qwen");
        assertEquals("sk-qwen", config.resolveApiKey());
    }

    /**
     * embedding.baseUrl 优先。
     */
    @Test
    void resolveBaseUrl_prefersEmbeddingOverride() {
        EmbeddingConfig config = newConfig(
                "siliconflow",
                "",
                "https://override.example/v1",
                "sk-sf",
                "sk-qwen");
        ReflectionTestUtils.setField(config, "siliconflowBaseUrl", "https://api.siliconflow.cn/v1");
        ReflectionTestUtils.setField(config, "qwenBaseUrl", "https://dashscope.aliyuncs.com/compatible-mode/v1");
        assertEquals("https://override.example/v1", config.resolveBaseUrl());
    }

    /**
     * provider=siliconflow 时回退硅基 base-url。
     */
    @Test
    void resolveBaseUrl_fallsBackToSiliconflowWhenProviderSiliconflow() {
        EmbeddingConfig config = newConfig("siliconflow", "", "", "sk-sf", "sk-qwen");
        ReflectionTestUtils.setField(config, "siliconflowBaseUrl", "https://api.siliconflow.cn/v1");
        ReflectionTestUtils.setField(config, "qwenBaseUrl", "https://dashscope.aliyuncs.com/compatible-mode/v1");
        assertEquals("https://api.siliconflow.cn/v1", config.resolveBaseUrl());
    }

    /**
     * provider=qwen 时回退通义 base-url。
     */
    @Test
    void resolveBaseUrl_fallsBackToQwenWhenProviderQwen() {
        EmbeddingConfig config = newConfig("qwen", "", "  ", "sk-sf", "sk-qwen");
        ReflectionTestUtils.setField(config, "siliconflowBaseUrl", "https://api.siliconflow.cn/v1");
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

    /**
     * 构造带 provider / 覆盖 / 根节点 Key 的 EmbeddingConfig。
     *
     * @param provider          rag.embedding.provider
     * @param embeddingApiKey   rag.embedding.api-key
     * @param embeddingBaseUrl  rag.embedding.base-url
     * @param siliconflowApiKey siliconflow.api-key
     * @param qwenApiKey        qwen.api-key
     * @return 测试用配置实例
     */
    private static EmbeddingConfig newConfig(
            String provider,
            String embeddingApiKey,
            String embeddingBaseUrl,
            String siliconflowApiKey,
            String qwenApiKey) {
        EmbeddingConfig config = new EmbeddingConfig();
        RagProperties props = new RagProperties();
        props.getEmbedding().setProvider(provider);
        props.getEmbedding().setApiKey(embeddingApiKey);
        props.getEmbedding().setBaseUrl(embeddingBaseUrl);
        ReflectionTestUtils.setField(config, "ragProperties", props);
        ReflectionTestUtils.setField(config, "siliconflowApiKey", siliconflowApiKey);
        ReflectionTestUtils.setField(config, "qwenApiKey", qwenApiKey);
        return config;
    }
}
