package com.knowledge.base.ai.rag.sparse;

import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.SortedMap;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Hashing BM25-lite / SparseVectorSupport 单测。
 */
class HashingBm25SparseEmbedderTest {

    /**
     * 中文文本应产出非空稀疏向量。
     */
    @Test
    void embedChineseProducesSparseWeights() {
        HashingBm25SparseEmbedder embedder = new HashingBm25SparseEmbedder(4096);
        Map<Integer, Float> sparse = embedder.embed("知识库检索混合");
        assertFalse(sparse.isEmpty());
        double sumSq = sparse.values().stream().mapToDouble(v -> (double) v * v).sum();
        assertEquals(1.0, sumSq, 1e-4);
    }

    /**
     * 空文本返回 empty。
     */
    @Test
    void embedBlankReturnsEmpty() {
        HashingBm25SparseEmbedder embedder = new HashingBm25SparseEmbedder(4096);
        assertTrue(embedder.embed("").isEmpty());
        assertTrue(embedder.embed(null).isEmpty());
    }

    /**
     * Milvus SortedMap 转换保持下标与权重。
     */
    @Test
    void toMilvusSortedMapKeepsEntries() {
        HashingBm25SparseEmbedder embedder = new HashingBm25SparseEmbedder(4096);
        Map<Integer, Float> sparse = embedder.embed("rag sparse");
        SortedMap<Long, Float> milvus = SparseVectorSupport.toMilvusSortedMap(sparse);
        assertEquals(sparse.size(), milvus.size());
        assertEquals(SparseVectorSupport.toIndexList(sparse).size(),
                SparseVectorSupport.toValueList(sparse).size());
    }
}
