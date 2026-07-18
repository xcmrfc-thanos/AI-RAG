package com.knowledge.base.ai.rag.support;

import com.knowledge.base.ai.vo.RagSearchResultVO;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * HybridSearchFusion RRF 融合单测
 */
class HybridSearchFusionTest {

    /**
     * 验证双路命中同一 chunk 时 RRF 分数叠加且排序靠前
     */
    @Test
    void fuseAndConvert_prefersOverlapAndLimitsTopK() {
        List<HybridSearchFusion.FusionCandidate> bm25 = List.of(
                HybridSearchFusion.FusionCandidate.of("c1", 1L, "t1", "a", null, null, 10.0),
                HybridSearchFusion.FusionCandidate.of("c2", 2L, "t2", "b", null, null, 9.0)
        );
        List<HybridSearchFusion.FusionCandidate> knn = List.of(
                HybridSearchFusion.FusionCandidate.of("c1", 1L, "t1", "a", null, null, 0.9),
                HybridSearchFusion.FusionCandidate.of("c3", 3L, "t3", "c", null, null, 0.8)
        );

        List<RagSearchResultVO> fused = HybridSearchFusion.fuseAndConvert(bm25, knn, 2, 60);

        assertEquals(2, fused.size());
        assertEquals("c1", fused.get(0).getChunkId());
        assertTrue(fused.get(0).getBm25Score() > 0);
        assertTrue(fused.get(0).getVectorScore() > 0);
    }

    /**
     * 验证仅 BM25 时仍可返回结果
     */
    @Test
    void fuseAndConvert_bm25Only() {
        List<HybridSearchFusion.FusionCandidate> bm25 = List.of(
                HybridSearchFusion.FusionCandidate.of("c9", 9L, "t9", "x", null, null, 5.0)
        );

        List<RagSearchResultVO> fused = HybridSearchFusion.fuseAndConvert(bm25, List.of(), 5, 60);

        assertEquals(1, fused.size());
        assertEquals("c9", fused.get(0).getChunkId());
        assertEquals(0.0, fused.get(0).getVectorScore());
    }

    /**
     * 验证 weighted 融合：高 dense 权重时向量强命中更靠前
     */
    @Test
    void fuseWeightedAndConvert_respectsDenseWeight() {
        List<HybridSearchFusion.FusionCandidate> bm25 = List.of(
                HybridSearchFusion.FusionCandidate.of("bm25-top", 1L, "t1", "a", null, null, 100.0),
                HybridSearchFusion.FusionCandidate.of("overlap", 2L, "t2", "b", null, null, 10.0)
        );
        List<HybridSearchFusion.FusionCandidate> knn = List.of(
                HybridSearchFusion.FusionCandidate.of("overlap", 2L, "t2", "b", null, null, 0.99),
                HybridSearchFusion.FusionCandidate.of("dense-top", 3L, "t3", "c", null, null, 0.5)
        );

        List<RagSearchResultVO> fused = HybridSearchFusion.fuseWeightedAndConvert(
                bm25, knn, 3, 0.1, 0.9);

        assertEquals(3, fused.size());
        assertEquals("overlap", fused.get(0).getChunkId());
        assertTrue(fused.get(0).getScore() > fused.get(1).getScore());
    }
}
