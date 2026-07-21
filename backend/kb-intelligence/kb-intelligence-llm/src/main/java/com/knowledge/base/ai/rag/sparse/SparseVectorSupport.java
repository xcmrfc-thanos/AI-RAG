package com.knowledge.base.ai.rag.sparse;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.SortedMap;
import java.util.TreeMap;

/**
 * 稀疏向量格式转换（Hashing BM25-lite → Milvus / Qdrant）。
 *
 * @author AI-RAG
 * @since 1.0.0
 */
public final class SparseVectorSupport {

    private SparseVectorSupport() {
    }

    /**
     * 转为 Milvus SparseFloatVector 所需的 SortedMap（index → weight）。
     *
     * @param sparse hashing 稀疏图
     * @return 有序稀疏图；空输入返回 empty
     */
    public static SortedMap<Long, Float> toMilvusSortedMap(Map<Integer, Float> sparse) {
        SortedMap<Long, Float> map = new TreeMap<>();
        if (sparse == null || sparse.isEmpty()) {
            return map;
        }
        for (Map.Entry<Integer, Float> e : sparse.entrySet()) {
            if (e.getKey() == null || e.getValue() == null) {
                continue;
            }
            map.put(e.getKey().longValue(), e.getValue());
        }
        return map;
    }

    /**
     * 抽出稀疏下标列表（Qdrant SparseIndices）。
     *
     * @param sparse hashing 稀疏图
     * @return 下标列表
     */
    public static List<Integer> toIndexList(Map<Integer, Float> sparse) {
        List<Integer> indices = new ArrayList<>();
        if (sparse == null || sparse.isEmpty()) {
            return indices;
        }
        for (Map.Entry<Integer, Float> e : sparse.entrySet()) {
            if (e.getKey() != null && e.getValue() != null) {
                indices.add(e.getKey());
            }
        }
        return indices;
    }

    /**
     * 抽出稀疏权重列表（与 {@link #toIndexList} 同序）。
     *
     * @param sparse hashing 稀疏图
     * @return 权重列表
     */
    public static List<Float> toValueList(Map<Integer, Float> sparse) {
        List<Float> values = new ArrayList<>();
        if (sparse == null || sparse.isEmpty()) {
            return values;
        }
        for (Map.Entry<Integer, Float> e : sparse.entrySet()) {
            if (e.getKey() != null && e.getValue() != null) {
                values.add(e.getValue());
            }
        }
        return values;
    }

    /**
     * 拼接用于 sparse 编码的文本（标题 + 正文）。
     *
     * @param title   标题
     * @param content 正文
     * @return 拼接文本
     */
    public static String joinText(String title, String content) {
        String t = title != null ? title.trim() : "";
        String c = content != null ? content.trim() : "";
        if (t.isEmpty()) {
            return c;
        }
        if (c.isEmpty()) {
            return t;
        }
        return t + " " + c;
    }
}
