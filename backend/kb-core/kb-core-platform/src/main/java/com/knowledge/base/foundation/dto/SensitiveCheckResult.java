package com.knowledge.base.foundation.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * 敏感词检测结果 DTO。
 */
@Data
@Builder
@Schema(description = "敏感词检测结果")
public class SensitiveCheckResult {

    /** 是否存在 block 策略命中（应拦截） */
    @Schema(description = "是否命中需拦截（含 block）")
    private boolean blocked;

    /** 是否有任意命中（含 audit/replace） */
    @Schema(description = "是否有任意命中")
    private boolean hit;

    /** 应用 replace 策略后的文本 */
    @Schema(description = "处理后的文本（替换策略已应用）")
    private String filteredText;

    /** 命中明细列表 */
    @Schema(description = "命中明细")
    @Builder.Default
    private List<HitItem> hits = new ArrayList<>();

    /**
     * 单条命中明细。
     */
    @Data
    @Builder
    @Schema(description = "命中项")
    public static class HitItem {

        /** 命中类型：word（词库）或 regex（正则） */
        @Schema(description = "命中类型：word/regex")
        private String type;

        /** 命中内容（词条或「规则名:匹配串」） */
        @Schema(description = "命中内容")
        private String word;

        /** 分类 */
        @Schema(description = "分类")
        private String category;

        /** 策略：block/replace/audit */
        @Schema(description = "策略")
        private String action;

        /** 命中起始下标（含，基于检测用文本） */
        @Schema(description = "起始下标（含）")
        private int start;

        /** 命中结束下标（不含） */
        @Schema(description = "结束下标（不含）")
        private int end;
    }
}
