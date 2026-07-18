package com.knowledge.base.ai.rag.service.impl;

import com.knowledge.base.ai.config.RagProperties;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * EmbeddingServiceImpl 本地 Stub 向量单元测试。
 */
class EmbeddingServiceImplStubTest {

    /**
     * dev-stub 模式下应生成非零归一化向量。
     */
    @Test
    void buildDeterministicVectorHasNonZeroMagnitude() {
        RagProperties properties = new RagProperties();
        RagProperties.Embedding embedding = new RagProperties.Embedding();
        embedding.setDimension(1024);
        properties.setEmbedding(embedding);

        EmbeddingServiceImpl service = new EmbeddingServiceImpl(properties);
        ReflectionTestUtils.setField(service, "devStubEnabled", true);

        float[] vector = (float[]) ReflectionTestUtils.invokeMethod(service, "buildDeterministicVector", "E2EAccept");

        double sumSquares = 0.0d;
        for (float value : vector) {
            sumSquares += value * value;
        }
        assertTrue(sumSquares > 0.99d && sumSquares < 1.01d);
    }
}
