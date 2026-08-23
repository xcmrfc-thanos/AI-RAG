package com.knowledge.base.foundation.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 模型提供方新增/更新请求（第8阶段模型库）。
 *
 * <p>apiKey 为空表示不修改（更新场景）；新增时必填。</p>
 *
 * @author 苏三
 * @since 1.1.0
 */
@Data
@Schema(description = "模型提供方请求")
public class ModelProviderDTO {

    @NotBlank(message = "提供方标识不能为空")
    @Size(max = 50, message = "提供方标识最长 50 字符")
    @Schema(description = "提供方标识：qwen/siliconflow/deepseek/custom/openai/ollama")
    private String providerKey;

    @NotBlank(message = "显示名不能为空")
    @Size(max = 100, message = "显示名最长 100 字符")
    @Schema(description = "显示名（通义千问/硅基流动…）")
    private String providerName;

    @Size(max = 500, message = "基址最长 500 字符")
    @Schema(description = "OpenAI 兼容基址（custom 必填）")
    private String baseUrl;

    @Schema(description = "API Key（新增必填；更新为空表示不修改）")
    private String apiKey;

    @Schema(description = "预留参数（超时/代理等）")
    private Map<String, Object> extraParams;

    @Schema(description = "状态：0-禁用，1-启用")
    private Integer status = 1;

    @NotNull(message = "模型列表不能为空")
    @Schema(description = "该提供方下的模型条目")
    private List<ModelItemDTO> models = new ArrayList<>();
}
