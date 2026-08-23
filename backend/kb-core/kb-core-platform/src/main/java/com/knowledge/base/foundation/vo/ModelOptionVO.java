package com.knowledge.base.foundation.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * 场景下拉选项（不含任何密钥信息）。
 *
 * @author 苏三
 * @since 1.1.0
 */
@Data
@Schema(description = "模型场景下拉选项")
public class ModelOptionVO {

    @Schema(description = "选项值（物理模型名）")
    private String value;

    @Schema(description = "模型 key")
    private String key;

    @Schema(description = "显示名")
    private String label;

    @Schema(description = "是否该类型默认")
    private Boolean isDefault;

    @Schema(description = "所属提供方标识")
    private String providerKey;
}
