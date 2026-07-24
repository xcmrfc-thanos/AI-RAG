package com.knowledge.base.foundation.sensitive;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Queue;

/**
 * Aho-Corasick 多模式匹配器（L1 词库扫描，时间复杂度 O(文本长度)）。
 */
public final class AhoCorasickMatcher {

    private final Node root = new Node();

    /**
     * 根据模式串集合构建自动机。
     *
     * @param words 敏感词模式串（建议已做归一化）
     */
    public AhoCorasickMatcher(Collection<String> words) {
        if (words != null) {
            for (String word : words) {
                if (word == null || word.isEmpty()) {
                    continue;
                }
                insert(word);
            }
        }
        buildFail();
    }

    /**
     * 在文本中查找全部命中。
     *
     * @param text 已归一化文本
     * @return 命中列表（startInclusive, endExclusive, word）
     */
    public List<Hit> findAll(String text) {
        List<Hit> hits = new ArrayList<>();
        if (text == null || text.isEmpty()) {
            return hits;
        }
        Node cur = root;
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            while (cur != root && !cur.next.containsKey(c)) {
                cur = cur.fail;
            }
            cur = cur.next.getOrDefault(c, root);
            Node out = cur;
            while (out != root) {
                if (out.word != null) {
                    int start = i - out.word.length() + 1;
                    hits.add(new Hit(start, i + 1, out.word));
                }
                out = out.fail;
            }
        }
        return hits;
    }

    /**
     * 向 Trie 插入一条模式串。
     *
     * @param word 模式串
     */
    private void insert(String word) {
        Node cur = root;
        for (int i = 0; i < word.length(); i++) {
            char c = word.charAt(i);
            cur = cur.next.computeIfAbsent(c, k -> new Node());
        }
        cur.word = word;
    }

    /**
     * 构建失败指针（fail 链），支持多模式输出。
     */
    private void buildFail() {
        Queue<Node> q = new LinkedList<>();
        root.fail = root;
        for (Node child : root.next.values()) {
            child.fail = root;
            q.offer(child);
        }
        while (!q.isEmpty()) {
            Node cur = q.poll();
            for (Map.Entry<Character, Node> e : cur.next.entrySet()) {
                char c = e.getKey();
                Node child = e.getValue();
                Node f = cur.fail;
                while (f != root && !f.next.containsKey(c)) {
                    f = f.fail;
                }
                child.fail = f.next.getOrDefault(c, root);
                if (child.fail == child) {
                    child.fail = root;
                }
                q.offer(child);
            }
        }
    }

    /**
     * 一次命中结果。
     *
     * @param start 起始下标（含）
     * @param end   结束下标（不含）
     * @param word  命中的模式串
     */
    public record Hit(int start, int end, String word) {
    }

    /**
     * AC 自动机节点。
     */
    private static final class Node {
        /** 子节点边 */
        private final Map<Character, Node> next = new HashMap<>();
        /** 失败指针 */
        private Node fail;
        /** 若为本词终点则为模式串，否则为 null */
        private String word;
    }
}
