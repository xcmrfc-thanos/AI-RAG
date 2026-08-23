package com.knowledge.base.foundation.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.Map;

/**
 * 模型条目管理视图。
 *
 * @author 苏三
 * @since 1.1.0
 */
@Data
@Schema(description = "模型条目管理视图")
public class ModelItemVO {

    @Schema(description = "主键ID")
    private Long id;

    @Schema(description = "物理模型名")
    private String modelKey;

    @Schema(description = "类型：chat/embedding/rerank/tts/stt/image/other")
    private String modelType;

    @Schema(description = "下拉显示名")
    private String displayName;

    @Schema(description = "是否该类型默认")
    private Integer isDefault;

    @Schema(description = "embedding 维度")
    private Integer dimension;

    @Schema(description = "预留参数")
    private Map<String, Object> modelConfig;

    @Schema(description = "状态：0-禁用，1-启用")
    private Integer status;
}
