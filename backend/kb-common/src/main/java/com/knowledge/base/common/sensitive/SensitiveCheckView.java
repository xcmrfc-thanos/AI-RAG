package com.knowledge.base.common.sensitive;

import java.util.Collections;
import java.util.List;

/**
 * 敏感词检测视图（跨模块通用，避免 Intelligence 依赖 platform）。
 */
public class SensitiveCheckView {

    /** 是否应拦截 */
    private boolean blocked;
    /** 是否有命中 */
    private boolean hit;
    /** 替换后文本 */
    private String filteredText;
    /** 命中词摘要（便于错误提示） */
    private List<String> hitWords = Collections.emptyList();

    /**
     * 空结果（未命中）。
     *
     * @param text 原文
     * @return 视图
     */
    public static SensitiveCheckView pass(String text) {
        SensitiveCheckView v = new SensitiveCheckView();
        v.blocked = false;
        v.hit = false;
        v.filteredText = text == null ? "" : text;
        v.hitWords = Collections.emptyList();
        return v;
    }

    public boolean isBlocked() {
        return blocked;
    }

    public void setBlocked(boolean blocked) {
        this.blocked = blocked;
    }

    public boolean isHit() {
        return hit;
    }

    public void setHit(boolean hit) {
        this.hit = hit;
    }

    public String getFilteredText() {
        return filteredText;
    }

    public void setFilteredText(String filteredText) {
        this.filteredText = filteredText;
    }

    public List<String> getHitWords() {
        return hitWords;
    }

    public void setHitWords(List<String> hitWords) {
        this.hitWords = hitWords == null ? Collections.emptyList() : hitWords;
    }
}
