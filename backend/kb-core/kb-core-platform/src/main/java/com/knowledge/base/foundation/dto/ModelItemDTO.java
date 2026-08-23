package com.knowledge.base.foundation.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.Map;

/**
 * 模型条目请求（第8阶段模型库）。
 *
 * @author 苏三
 * @since 1.1.0
 */
@Data
@Schema(description = "模型条目请求")
public class ModelItemDTO {

    @NotBlank(message = "模型名不能为空")
    @Size(max = 100, message = "模型名最长 100 字符")
    @Schema(description = "物理模型名（qwen3-max/BAAI-bge-m3/qwen3-rerank）")
    private String modelKey;

    @NotBlank(message = "模型类型不能为空")
    @Size(max = 20, message = "模型类型最长 20 字符")
    @Schema(description = "类型：chat/embedding/rerank/tts/stt/image/other")
    private String modelType;

    @Size(max = 100, message = "显示名最长 100 字符")
    @Schema(description = "下拉显示名")
    private String displayName;

    @Schema(description = "是否该类型默认：0-否，1-是（每类型至多一个）")
    private Integer isDefault = 0;

    @Schema(description = "embedding 维度（供检索对齐）")
    private Integer dimension;

    @Schema(description = "预留参数（max_tokens/temperature/top_p 等）")
    private Map<String, Object> modelConfig;

    @Schema(description = "状态：0-禁用，1-启用")
    private Integer status = 1;
}
