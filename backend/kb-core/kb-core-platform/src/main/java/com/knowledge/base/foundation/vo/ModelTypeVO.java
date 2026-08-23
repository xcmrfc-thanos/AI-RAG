package com.knowledge.base.foundation.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 模型类型枚举项（下拉）。
 *
 * @author 苏三
 * @since 1.1.0
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "模型类型枚举项")
public class ModelTypeVO {

    @Schema(description = "类型值：chat/embedding/rerank/tts/stt/image/other")
    private String value;

    @Schema(description = "中文名")
    private String label;
}
