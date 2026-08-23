package com.knowledge.base.foundation.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * 模型提供方管理视图（含掩码提示，不含明文密钥）。
 *
 * @author 苏三
 * @since 1.1.0
 */
@Data
@Schema(description = "模型提供方管理视图")
public class ModelProviderVO {

    @Schema(description = "主键ID")
    private Long id;

    @Schema(description = "提供方标识")
    private String providerKey;

    @Schema(description = "显示名")
    private String providerName;

    @Schema(description = "OpenAI 兼容基址")
    private String baseUrl;

    @Schema(description = "掩码提示（sk-****abcd）")
    private String apiKeyHint;

    @Schema(description = "预留参数")
    private Map<String, Object> extraParams;

    @Schema(description = "状态：0-禁用，1-启用")
    private Integer status;

    @Schema(description = "模型条目列表")
    private List<ModelItemVO> models;
}
