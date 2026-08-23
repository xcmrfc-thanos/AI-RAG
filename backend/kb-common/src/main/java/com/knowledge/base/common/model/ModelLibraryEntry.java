package com.knowledge.base.common.model;

import lombok.Data;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

/**
 * 模型库条目（提供方视角，Redis kb:model:cache 缓存载体）。
 *
 * <p>{@code apiKey} 为解密后明文，仅存在于进程内存与专用 Redis Key
 * （{@code kb:model:cache}）；禁止写入日志、MQ 或 {@code kb:system:config}。</p>
 *
 * @author 苏三
 * @since 1.1.0
 */
@Data
public class ModelLibraryEntry implements Serializable {

    private static final long serialVersionUID = 1L;

    /** 提供方标识（qwen/siliconflow/deepseek/custom/openai/ollama） */
    private String providerKey;

    /** 提供方显示名 */
    private String providerName;

    /** OpenAI 兼容基址 */
    private String baseUrl;

    /** API Key 明文（仅内存/专用 Redis Key） */
    private String apiKey;

    /** 该提供方下的模型条目 */
    private List<ModelLibraryItem> models = new ArrayList<>();
}
