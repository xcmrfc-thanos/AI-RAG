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
 * 模型提供方实体（第8阶段模型库）
 *
 * <p>{@code api_key} 为 AES-GCM 密文（{@code enc:v1:...}），列表回显仅 {@code apiKeyHint}；
 * 明文不落库、不入缓存，禁止日志输出。</p>
 *
 * @author 苏三
 * @since 1.1.0
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName(value = "kb_model_provider", autoResultMap = true)
@Schema(description = "模型提供方实体")
public class ModelProvider extends BaseEntity {

    @Schema(description = "提供方标识：qwen/siliconflow/deepseek/custom/openai/ollama")
    @TableField("provider_key")
    private String providerKey;

    @Schema(description = "显示名（通义千问/硅基流动…）")
    @TableField("provider_name")
    private String providerName;

    @Schema(description = "OpenAI 兼容基址（custom 必填）")
    @TableField("base_url")
    private String baseUrl;

    @Schema(description = "API Key 密文（enc:v1:...，AES-GCM），不回显")
    @TableField("api_key")
    private String apiKey;

    @Schema(description = "掩码提示（sk-****abcd）")
    @TableField("api_key_hint")
    private String apiKeyHint;

    @Schema(description = "预留参数（超时/代理等）")
    @TableField(value = "extra_params", typeHandler = JacksonTypeHandler.class)
    private Map<String, Object> extraParams;

    @Schema(description = "状态：0-禁用，1-启用")
    @TableField("status")
    private Integer status;
}
