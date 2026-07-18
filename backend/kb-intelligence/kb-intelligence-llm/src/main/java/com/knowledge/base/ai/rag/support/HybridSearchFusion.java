package com.knowledge.base.ai.rag.support;

import com.knowledge.base.ai.vo.RagSearchResultVO;
import lombok.Getter;
import lombok.Setter;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * 混合检索 RRF 融合工具
 *
 * <p>供 {@code RrfHybridRetriever} 及各存储后端复用。</p>
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
        return toSortedVos(fused, topK);
    }

    /**
     * 对 BM25 与向量两路结果做线性权重融合（各自 min-max 归一）
     *
     * @param bm25Results BM25 结果
     * @param knnResults  向量检索结果
     * @param topK        最终返回数量
     * @param bm25Weight  BM25 权重
     * @param denseWeight dense 权重
     * @return 融合后的搜索结果
     */
    public static List<RagSearchResultVO> fuseWeightedAndConvert(List<FusionCandidate> bm25Results,
                                                                 List<FusionCandidate> knnResults,
                                                                 int topK,
                                                                 double bm25Weight,
                                                                 double denseWeight) {
        Map<String, FusionCandidate> fused = weightedFuse(bm25Results, knnResults, bm25Weight, denseWeight);
        return toSortedVos(fused, topK);
    }

    private static List<RagSearchResultVO> toSortedVos(Map<String, FusionCandidate> fused, int topK) {
        return fused.values().stream()
                .sorted(Comparator.comparingDouble(FusionCandidate::getScore).reversed())
                .limit(topK)
                .map(HybridSearchFusion::toVo)
                .collect(Collectors.toList());
    }

    /**
     * 线性权重融合：两路 score 分别 min-max 到 [0,1] 后加权求和
     */
    private static Map<String, FusionCandidate> weightedFuse(List<FusionCandidate> bm25Results,
                                                             List<FusionCandidate> knnResults,
                                                             double bm25Weight,
                                                             double denseWeight) {
        double[] weights = normalizeWeights(bm25Weight, denseWeight);
        Map<String, Double> bm25Norm = minMaxNormalize(bm25Results);
        Map<String, Double> knnNorm = minMaxNormalize(knnResults);

        Map<String, FusionCandidate> fused = new ConcurrentHashMap<>();
        for (FusionCandidate candidate : bm25Results) {
            FusionCandidate copy = copyCandidate(candidate);
            double norm = bm25Norm.getOrDefault(candidate.getChunkId(), 0.0);
            copy.setBm25Score(candidate.getScore());
            copy.setVectorScore(0);
            copy.setScore(weights[0] * norm);
            fused.put(copy.getChunkId(), copy);
        }
        for (FusionCandidate candidate : knnResults) {
            double norm = knnNorm.getOrDefault(candidate.getChunkId(), 0.0);
            FusionCandidate existing = fused.get(candidate.getChunkId());
            if (existing == null) {
                FusionCandidate copy = copyCandidate(candidate);
                copy.setBm25Score(0);
                copy.setVectorScore(candidate.getScore());
                copy.setScore(weights[1] * norm);
                fused.put(copy.getChunkId(), copy);
            } else {
                existing.setVectorScore(candidate.getScore());
                existing.setScore(existing.getScore() + weights[1] * norm);
            }
        }
        return fused;
    }

    private static double[] normalizeWeights(double bm25Weight, double denseWeight) {
        double b = Math.max(0, bm25Weight);
        double d = Math.max(0, denseWeight);
        double sum = b + d;
        if (sum <= 0) {
            return new double[]{0.5, 0.5};
        }
        return new double[]{b / sum, d / sum};
    }

    private static Map<String, Double> minMaxNormalize(List<FusionCandidate> results) {
        Map<String, Double> norms = new ConcurrentHashMap<>();
        if (results == null || results.isEmpty()) {
            return norms;
        }
        double min = results.stream().mapToDouble(FusionCandidate::getScore).min().orElse(0);
        double max = results.stream().mapToDouble(FusionCandidate::getScore).max().orElse(0);
        double range = max - min;
        for (FusionCandidate candidate : results) {
            double norm = range <= 1e-12 ? 1.0 : (candidate.getScore() - min) / range;
            norms.put(candidate.getChunkId(), norm);
        }
        return norms;
    }

    private static FusionCandidate copyCandidate(FusionCandidate source) {
        FusionCandidate copy = FusionCandidate.of(
                source.getChunkId(),
                source.getDocumentId(),
                source.getDocumentTitle(),
                source.getContent(),
                source.getHeading(),
                source.getPublishTime(),
                source.getScore()
        );
        copy.setIsPublic(source.getIsPublic());
        copy.setAuthorId(source.getAuthorId());
        copy.setTeamId(source.getTeamId());
        return copy;
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
                .isPublic(candidate.getIsPublic())
                .authorId(candidate.getAuthorId())
                .teamId(candidate.getTeamId())
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
        private Boolean isPublic;
        private Long authorId;
        private Long teamId;

        /**
         * 构建融合候选
         *
         * @param chunkId        块 ID
         * @param documentId     文档 ID
         * @param documentTitle  标题
         * @param content        正文
         * @param heading        章节
         * @param publishTime    发布时间
         * @param score          得分
         * @return 候选
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

        /**
         * 构建带 ACL 字段的融合候选
         *
         * @param chunkId       块 ID
         * @param documentId    文档 ID
         * @param documentTitle 标题
         * @param content       正文
         * @param heading       章节
         * @param publishTime   发布时间
         * @param score         得分
         * @param isPublic      是否公开
         * @param authorId      作者
         * @param teamId        团队
         * @return 候选
         */
        public static FusionCandidate of(String chunkId, Long documentId, String documentTitle,
                                         String content, String heading, String publishTime, double score,
                                         Boolean isPublic, Long authorId, Long teamId) {
            FusionCandidate candidate = of(chunkId, documentId, documentTitle, content, heading, publishTime, score);
            candidate.isPublic = isPublic;
            candidate.authorId = authorId;
            candidate.teamId = teamId;
            return candidate;
        }
    }
}
