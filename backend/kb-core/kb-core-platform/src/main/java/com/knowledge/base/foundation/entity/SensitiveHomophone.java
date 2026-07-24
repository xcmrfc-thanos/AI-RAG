package com.knowledge.base.foundation.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.knowledge.base.common.config.BaseEntity;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 谐音/形近映射实体（L1.5 归一化，对应表 kb_sensitive_homophone）。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("kb_sensitive_homophone")
@Schema(description = "敏感词谐音映射")
public class SensitiveHomophone extends BaseEntity {

    /** 源字符或短串 */
    @Schema(description = "源字符或短串")
    @TableField("src")
    private String src;

    /** 归一目标 */
    @Schema(description = "归一目标")
    @TableField("dst")
    private String dst;

    /** 是否启用：0 否，1 是 */
    @Schema(description = "是否启用：0否1是")
    @TableField("enabled")
    private Integer enabled;

    /** 备注 */
    @Schema(description = "备注")
    @TableField("remark")
    private String remark;
}
