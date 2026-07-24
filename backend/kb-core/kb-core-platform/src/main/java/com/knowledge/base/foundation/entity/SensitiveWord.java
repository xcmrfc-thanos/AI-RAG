package com.knowledge.base.foundation.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.knowledge.base.common.config.BaseEntity;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 敏感词词条实体（L1，对应表 kb_sensitive_word）。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("kb_sensitive_word")
@Schema(description = "敏感词词条")
public class SensitiveWord extends BaseEntity {

    /** 词条原文 */
    @Schema(description = "词条原文")
    @TableField("word")
    private String word;

    /** 分类：spam/abuse/porn/gambling/ad/privacy/custom */
    @Schema(description = "分类：spam/abuse/porn/gambling/ad/privacy/custom")
    @TableField("category")
    private String category;

    /** 策略：block 拦截 / replace 替换 / audit 仅审计 */
    @Schema(description = "策略：block/replace/audit")
    @TableField("action")
    private String action;

    /** 替换文本（action=replace 时生效） */
    @Schema(description = "替换文本")
    @TableField("replace_to")
    private String replaceTo;

    /** 是否启用：0 否，1 是 */
    @Schema(description = "是否启用：0否1是")
    @TableField("enabled")
    private Integer enabled;

    /** 备注 */
    @Schema(description = "备注")
    @TableField("remark")
    private String remark;
}
