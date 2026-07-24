package com.knowledge.base.foundation.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.knowledge.base.common.config.BaseEntity;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 敏感词正则规则实体（L1.5，对应表 kb_sensitive_regex）。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("kb_sensitive_regex")
@Schema(description = "敏感词正则规则")
public class SensitiveRegex extends BaseEntity {

    /** 规则名称 */
    @Schema(description = "规则名称")
    @TableField("name")
    private String name;

    /** Java 正则表达式 */
    @Schema(description = "Java 正则表达式")
    @TableField("pattern")
    private String pattern;

    /** 分类，如 privacy */
    @Schema(description = "分类")
    @TableField("category")
    private String category;

    /** 策略：block/replace/audit */
    @Schema(description = "策略：block/replace/audit")
    @TableField("action")
    private String action;

    /** 替换文本 */
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
