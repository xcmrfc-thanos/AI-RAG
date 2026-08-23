package com.knowledge.base.foundation.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 模型连通性测试请求。
 *
 * @author 苏三
 * @since 1.1.0
 */
@Data
@Schema(description = "模型连通性测试请求")
public class ModelTestDTO {

    @NotBlank(message = "基址不能为空")
    @Size(max = 500, message = "基址最长 500 字符")
    @Schema(description = "OpenAI 兼容基址")
    private String baseUrl;

    @NotBlank(message = "API Key 不能为空")
    @Schema(description = "API Key（临时明文，仅本次测试使用）")
    private String apiKey;

    @NotBlank(message = "模型名不能为空")
    @Size(max = 100, message = "模型名最长 100 字符")
    @Schema(description = "物理模型名")
    private String modelKey;

    @NotBlank(message = "模型类型不能为空")
    @Schema(description = "类型：chat/embedding 等")
    private String modelType;
}
