package com.knowledge.base.foundation.entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.extension.handlers.JacksonTypeHandler;
import com.knowledge.base.common.config.BaseEntity;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.Map;

/**
 * 模型条目实体（第8阶段模型库）
 *
 * @author 苏三
 * @since 1.1.0
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName(value = "kb_model", autoResultMap = true)
@Schema(description = "模型条目实体")
public class ModelItem extends BaseEntity {

    @Schema(description = "提供方ID（关联 kb_model_provider.id）")
    @TableField("provider_id")
    private Long providerId;

    @Schema(description = "物理模型名（qwen3-max/BAAI-bge-m3/qwen3-rerank）")
    @TableField("model_key")
    private String modelKey;

    @Schema(description = "类型：chat/embedding/rerank/tts/stt/image/other")
    @TableField("model_type")
    private String modelType;

    @Schema(description = "下拉显示名")
    @TableField("display_name")
    private String displayName;

    @Schema(description = "是否该类型默认：0-否，1-是（每类型至多一个）")
    @TableField("is_default")
    private Integer isDefault;

    @Schema(description = "embedding 维度（供检索对齐）")
    @TableField("dimension")
    private Integer dimension;

    @Schema(description = "预留参数（max_tokens/temperature/top_p 等）")
    @TableField(value = "model_config", typeHandler = JacksonTypeHandler.class)
    private Map<String, Object> modelConfig;

    @Schema(description = "状态：0-禁用，1-启用")
    @TableField("status")
    private Integer status;
}
