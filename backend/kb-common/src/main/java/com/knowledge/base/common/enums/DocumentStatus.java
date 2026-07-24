package com.knowledge.base.common.enums;

import lombok.Getter;

/**
 * 文档状态枚举
 *
 * <p>与 kb_foundation.kb_dict（dict_code=document_status）及 kb_document.status 字段对齐：</p>
 * <ul>
 *   <li>0 — 草稿（DRAFT）</li>
 *   <li>1 — 已发布（PUBLISHED）</li>
 *   <li>2 — 已归档（ARCHIVED）</li>
 *   <li>3 — 待审核（PENDING_REVIEW）</li>
 * </ul>
 * <p>审核驳回不单独占文档状态，业务回退为 DRAFT(0)。</p>
 *
 * @author 苏三
 * @since 1.0.0
 */
@Getter
public enum DocumentStatus {

    /**
     * 草稿
     */
    DRAFT(0, "草稿"),

    /**
     * 已发布
     */
    PUBLISHED(1, "已发布"),

    /**
     * 已归档
     */
    ARCHIVED(2, "已归档"),

    /**
     * 待审核
     */
    PENDING_REVIEW(3, "待审核");

    private final Integer code;
    private final String name;

    DocumentStatus(Integer code, String name) {
        this.code = code;
        this.name = name;
    }

    /**
     * 获取ByCode。
     */
    public static DocumentStatus getByCode(Integer code) {
        for (DocumentStatus status : values()) {
            if (status.getCode().equals(code)) {
                return status;
            }
        }
        return null;
    }
}
