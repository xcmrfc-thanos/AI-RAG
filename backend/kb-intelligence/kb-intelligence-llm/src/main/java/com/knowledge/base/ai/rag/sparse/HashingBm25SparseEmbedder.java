package com.knowledge.base.ai.rag.sparse;

import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Hashing BM25-lite 稀疏向量生成（本迭代单库关键词腿兜底）。
 *
 * <p>约定见 docs/superpowers/specs/2026-07-21-rag-sparse-hashing-bm25-lock.md。
 * 与 ES 真 BM25 质量不对等，仅用于 Qdrant/Milvus 单库跑通混合检索。</p>
 *
 * @author AI-RAG
 * @since 1.0.0
 */
@Component
public class HashingBm25SparseEmbedder {

    /** 默认稀疏维度（哈希桶数） */
    public static final int DEFAULT_DIMENSION = 30_000;

    private final int dimension;

    /**
     * 使用默认维度构造。
     */
    public HashingBm25SparseEmbedder() {
        this(DEFAULT_DIMENSION);
    }

    /**
     * 指定稀疏维度。
     *
     * @param dimension 哈希桶数，至少 1024
     */
    public HashingBm25SparseEmbedder(int dimension) {
        this.dimension = Math.max(1024, dimension);
    }

    /**
     * 将文本编码为稀疏向量（index → weight）。
     *
     * @param text 原文
     * @return 非空稀疏图；空文本返回 empty
     */
    public Map<Integer, Float> embed(String text) {
        Map<Integer, Float> tf = new LinkedHashMap<>();
        if (!StringUtils.hasText(text)) {
            return tf;
        }
        String normalized = text.toLowerCase(Locale.ROOT);
        StringBuilder token = new StringBuilder();
        for (int i = 0; i < normalized.length(); i++) {
            char c = normalized.charAt(i);
            if (isTokenChar(c)) {
                token.append(c);
                if (isCjk(c)) {
                    // CJK：单字立即吐出，并与下一字组成 bigram（若存在）
                    flushToken(tf, token.toString());
                    token.setLength(0);
                    if (i + 1 < normalized.length() && isCjk(normalized.charAt(i + 1))) {
                        flushToken(tf, "" + c + normalized.charAt(i + 1));
                    }
                }
            } else {
                if (token.length() > 0) {
                    flushToken(tf, token.toString());
                    token.setLength(0);
                }
            }
        }
        if (token.length() > 0) {
            flushToken(tf, token.toString());
        }
        // log(1+tf) + L2
        double sumSq = 0;
        for (Map.Entry<Integer, Float> e : tf.entrySet()) {
            float w = (float) Math.log1p(e.getValue());
            e.setValue(w);
            sumSq += (double) w * w;
        }
        if (sumSq <= 0) {
            return tf;
        }
        float norm = (float) Math.sqrt(sumSq);
        for (Map.Entry<Integer, Float> e : tf.entrySet()) {
            e.setValue(e.getValue() / norm);
        }
        return tf;
    }

    /**
     * 稀疏维度。
     *
     * @return 桶数
     */
    public int dimension() {
        return dimension;
    }

    private void flushToken(Map<Integer, Float> tf, String raw) {
        if (!StringUtils.hasText(raw)) {
            return;
        }
        // 跳过过短拉丁噪声；CJK 单字保留
        if (raw.length() == 1 && !isCjk(raw.charAt(0))) {
            return;
        }
        int idx = Math.floorMod(raw.hashCode(), dimension);
        tf.merge(idx, 1f, Float::sum);
    }

    private static boolean isTokenChar(char c) {
        return Character.isLetterOrDigit(c) || isCjk(c);
    }

    private static boolean isCjk(char c) {
        Character.UnicodeBlock block = Character.UnicodeBlock.of(c);
        return block == Character.UnicodeBlock.CJK_UNIFIED_IDEOGRAPHS
                || block == Character.UnicodeBlock.CJK_COMPATIBILITY_IDEOGRAPHS
                || block == Character.UnicodeBlock.CJK_UNIFIED_IDEOGRAPHS_EXTENSION_A;
    }
}
