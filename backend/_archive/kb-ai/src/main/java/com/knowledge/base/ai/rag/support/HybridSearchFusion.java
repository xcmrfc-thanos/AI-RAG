package com.knowledge.base.ai.rag.support;

import com.knowledge.base.ai.vo.RagSearchResultVO;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * 混合检索 RRF 融合工具
 *
 * <p>供 Elasticsearch / Milvus 等 {@code VectorIndexService} 实现复用。</p>
 *
 * @author knowledge-base-team
 * @since 1.0.0
 */
public final class HybridSearchFusion {

    private HybridSearchFusion() {
    }

    /**
     * 对 BM25 与向量两路结果做 RRF 融合并转换为 VO
     *
     * @param bm25Results BM25 结果
     * @param knnResults  向量检索结果
     * @param topK        最终返回数量
     * @param rrfC        RRF 常数 C
     * @return 融合后的搜索结果
     */
    public static List<RagSearchResultVO> fuseAndConvert(List<FusionCandidate> bm25Results,
                                                         List<FusionCandidate> knnResults,
                                                         int topK,
                                                         int rrfC) {
        Map<String, FusionCandidate> fused = rrfFuse(bm25Results, knnResults, rrfC);
        return fused.values().stream()
                .sorted(Comparator.comparingDouble(FusionCandidate::getScore).reversed())
                .limit(topK)
                .map(HybridSearchFusion::toVo)
                .collect(Collectors.toList());
    }

    /**
     * Reciprocal Rank Fusion
     */
    private static Map<String, FusionCandidate> rrfFuse(List<FusionCandidate> bm25Results,
                                                        List<FusionCandidate> knnResults,
                                                        int c) {
        Map<String, FusionCandidate> fused = new ConcurrentHashMap<>();

        List<FusionCandidate> sortedBm25 = bm25Results.stream()
                .sorted(Comparator.comparingDouble(FusionCandidate::getScore).reversed())
                .collect(Collectors.toList());
        List<FusionCandidate> sortedKnn = knnResults.stream()
                .sorted(Comparator.comparingDouble(FusionCandidate::getScore).reversed())
                .collect(Collectors.toList());

        for (int rank = 0; rank < sortedBm25.size(); rank++) {
            FusionCandidate candidate = sortedBm25.get(rank);
            double originalScore = candidate.getScore();
            double rrfScore = 1.0 / (c + rank + 1);
            FusionCandidate existing = fused.get(candidate.getChunkId());
            if (existing == null) {
                candidate.setScore(rrfScore);
                candidate.setBm25Score(originalScore);
                candidate.setVectorScore(0);
                fused.put(candidate.getChunkId(), candidate);
            } else {
                existing.setScore(existing.getScore() + rrfScore);
                existing.setBm25Score(originalScore);
            }
        }

        for (int rank = 0; rank < sortedKnn.size(); rank++) {
            FusionCandidate candidate = sortedKnn.get(rank);
            double originalScore = candidate.getScore();
            double rrfScore = 1.0 / (c + rank + 1);
            FusionCandidate existing = fused.get(candidate.getChunkId());
            if (existing == null) {
                candidate.setScore(rrfScore);
                candidate.setBm25Score(0);
                candidate.setVectorScore(originalScore);
                fused.put(candidate.getChunkId(), candidate);
            } else {
                existing.setScore(existing.getScore() + rrfScore);
                existing.setVectorScore(originalScore);
            }
        }

        return fused;
    }

    private static RagSearchResultVO toVo(FusionCandidate candidate) {
        return RagSearchResultVO.builder()
                .chunkId(candidate.getChunkId())
                .documentId(candidate.getDocumentId())
                .documentTitle(candidate.getDocumentTitle())
                .content(candidate.getContent())
                .heading(candidate.getHeading())
                .publishTime(candidate.getPublishTime())
                .score(candidate.getScore())
                .bm25Score(candidate.getBm25Score())
                .vectorScore(candidate.getVectorScore())
                .build();
    }

    /**
     * RRF 融合候选结果
     */
    @Getter
    @Setter
    public static class FusionCandidate {
        private String chunkId;
        private Long documentId;
        private String documentTitle;
        private String content;
        private String heading;
        private String publishTime;
        private double score;
        private double bm25Score;
        private double vectorScore;

        /**
         * 构建融合候选
         */
        public static FusionCandidate of(String chunkId, Long documentId, String documentTitle,
                                         String content, String heading, String publishTime, double score) {
            FusionCandidate candidate = new FusionCandidate();
            candidate.chunkId = chunkId;
            candidate.documentId = documentId;
            candidate.documentTitle = documentTitle;
            candidate.content = content;
            candidate.heading = heading;
            candidate.publishTime = publishTime;
            candidate.score = score;
            return candidate;
        }
    }
}
