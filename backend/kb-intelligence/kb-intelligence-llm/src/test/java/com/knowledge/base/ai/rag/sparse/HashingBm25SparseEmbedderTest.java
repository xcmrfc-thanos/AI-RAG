package com.knowledge.base.ai.rag.sparse;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * {@link HashingBm25SparseEmbedder} 单测。
 */
class HashingBm25SparseEmbedderTest {

    @Test
    void embed_producesSparseWeights() {
        HashingBm25SparseEmbedder embedder = new HashingBm25SparseEmbedder(4096);
        Map<Integer, Float> v = embedder.embed("知识库 GoldenDB 检索测试");
        assertFalse(v.isEmpty());
        double sumSq = v.values().stream().mapToDouble(f -> (double) f * f).sum();
        assertTrue(Math.abs(sumSq - 1.0) < 1e-3, "应近似 L2 归一");
    }

    @Test
    void embed_blankEmpty() {
        assertTrue(new HashingBm25SparseEmbedder().embed("").isEmpty());
    }
}
