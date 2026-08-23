package com.knowledge.base.common.model;

import lombok.Data;

import java.io.Serializable;
import java.util.Map;

/**
 * 模型库条目（模型视角）。
 *
 * @author 苏三
 * @since 1.1.0
 */
@Data
public class ModelLibraryItem implements Serializable {

    private static final long serialVersionUID = 1L;

    /** 物理模型名（qwen3-max/BAAI-bge-m3/qwen3-rerank） */
    private String modelKey;

    /** 类型：chat/embedding/rerank/tts/stt/image/other */
    private String modelType;

    /** 下拉显示名 */
    private String displayName;

    /** 是否该类型默认：0-否，1-是 */
    private Integer isDefault;

    /** embedding 维度 */
    private Integer dimension;

    /** 预留参数（max_tokens/temperature/top_p 等） */
    private Map<String, Object> modelConfig;
}
