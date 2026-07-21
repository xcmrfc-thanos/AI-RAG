package com.knowledge.base.ai.rag.rerank;

/**
 * 解析后的重排端点配置。
 *
 * @param usable       是否可走 HTTP API（mode=api 且凭证/URL 齐全）
 * @param provider     有效提供商：qwen | siliconflow | custom
 * @param model        模型名
 * @param apiKey       API Key（可空，内网 custom）
 * @param baseUrl      不含尾斜杠的 API 根（已含 /v1 等）
 * @param endpointPath 相对路径，如 /rerank 或 /reranks
 * @author knowledge-base-team
 * @since 1.0.0
 */
public record ResolvedRerank(
        boolean usable,
        String provider,
        String model,
        String apiKey,
        String baseUrl,
        String endpointPath
) {
}
