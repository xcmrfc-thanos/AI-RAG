package com.knowledge.base.ai.rag.rerank;

import com.knowledge.base.ai.config.RagProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * 解析重排 provider / 模型 / 凭证（auto 跟随 embedding）。
 *
 * @author knowledge-base-team
 * @since 1.0.0
 */
@Component
@RequiredArgsConstructor
public class RerankProviderResolver {

    public static final String PROVIDER_QWEN = "qwen";
    public static final String PROVIDER_SILICONFLOW = "siliconflow";
    public static final String PROVIDER_CUSTOM = "custom";
    public static final String MODE_OFF = "off";
    public static final String MODE_API = "api";
    public static final String MODE_LLM = "llm";

    public static final String DEFAULT_SILICONFLOW_MODEL = "BAAI/bge-reranker-v2-m3";
    public static final String DEFAULT_QWEN_MODEL = "qwen3-rerank";
    /** 通义重排兼容端（与 chat 的 compatible-mode 不同） */
    public static final String DEFAULT_QWEN_RERANK_BASE =
            "https://dashscope.aliyuncs.com/compatible-api/v1";
    public static final String DEFAULT_SILICONFLOW_BASE = "https://api.siliconflow.cn/v1";

    private final RagProperties ragProperties;

    @Value("${qwen.api-key:}")
    private String qwenApiKey;

    @Value("${siliconflow.api-key:}")
    private String siliconflowApiKey;

    @Value("${siliconflow.base-url:https://api.siliconflow.cn/v1}")
    private String siliconflowBaseUrl;

    /**
     * 解析当前有效重排配置。
     *
     * @return 解析结果；mode 非 api 或凭证不足时 usable=false
     */
    public ResolvedRerank resolve() {
        RagProperties.Rerank rerank = ragProperties.getRerank();
        if (rerank == null || !rerank.isEnabled()) {
            return unusable();
        }
        String mode = normalize(rerank.getMode(), MODE_API);
        if (MODE_OFF.equals(mode) || MODE_LLM.equals(mode)) {
            return unusable(mode);
        }
        if (!MODE_API.equals(mode)) {
            return unusable();
        }

        String provider = resolveProvider(rerank.getProvider());
        String model = StringUtils.hasText(rerank.getModel())
                ? rerank.getModel().trim()
                : defaultModel(provider);
        String apiKey = resolveApiKey(rerank, provider);
        String baseUrl = resolveBaseUrl(rerank, provider);
        String path = PROVIDER_QWEN.equals(provider) ? "/reranks" : "/rerank";

        if (PROVIDER_CUSTOM.equals(provider) && !StringUtils.hasText(baseUrl)) {
            return new ResolvedRerank(false, provider, model, apiKey, "", path);
        }
        if (!PROVIDER_CUSTOM.equals(provider) && !StringUtils.hasText(apiKey)) {
            return new ResolvedRerank(false, provider, model, "", baseUrl, path);
        }
        return new ResolvedRerank(true, provider, model, apiKey, trimSlash(baseUrl), path);
    }

    /**
     * 读取规范化后的 mode（off/api/llm）。
     *
     * @return mode 小写
     */
    public String resolveMode() {
        RagProperties.Rerank rerank = ragProperties.getRerank();
        if (rerank == null || !rerank.isEnabled()) {
            return MODE_OFF;
        }
        return normalize(rerank.getMode(), MODE_API);
    }

    /**
     * 解析有效 provider 名称。
     *
     * @param configured 配置值（可为 auto）
     * @return qwen | siliconflow | custom
     */
    String resolveProvider(String configured) {
        String p = normalize(configured, "auto");
        if (PROVIDER_CUSTOM.equals(p) || PROVIDER_QWEN.equals(p) || PROVIDER_SILICONFLOW.equals(p)) {
            return p;
        }
        // auto
        String emb = ragProperties.getEmbedding() != null
                ? ragProperties.getEmbedding().getProvider()
                : PROVIDER_QWEN;
        if (StringUtils.hasText(emb) && PROVIDER_SILICONFLOW.equalsIgnoreCase(emb.trim())) {
            return PROVIDER_SILICONFLOW;
        }
        return PROVIDER_QWEN;
    }

    private String defaultModel(String provider) {
        if (PROVIDER_SILICONFLOW.equals(provider)) {
            return DEFAULT_SILICONFLOW_MODEL;
        }
        if (PROVIDER_CUSTOM.equals(provider)) {
            return DEFAULT_SILICONFLOW_MODEL;
        }
        return DEFAULT_QWEN_MODEL;
    }

    private String resolveApiKey(RagProperties.Rerank rerank, String provider) {
        if (StringUtils.hasText(rerank.getApiKey())) {
            return rerank.getApiKey().trim();
        }
        if (PROVIDER_SILICONFLOW.equals(provider)) {
            return siliconflowApiKey != null ? siliconflowApiKey.trim() : "";
        }
        if (PROVIDER_QWEN.equals(provider)) {
            return qwenApiKey != null ? qwenApiKey.trim() : "";
        }
        return "";
    }

    private String resolveBaseUrl(RagProperties.Rerank rerank, String provider) {
        if (StringUtils.hasText(rerank.getBaseUrl())) {
            return rerank.getBaseUrl().trim();
        }
        if (PROVIDER_SILICONFLOW.equals(provider)) {
            return StringUtils.hasText(siliconflowBaseUrl)
                    ? siliconflowBaseUrl.trim()
                    : DEFAULT_SILICONFLOW_BASE;
        }
        if (PROVIDER_QWEN.equals(provider)) {
            return DEFAULT_QWEN_RERANK_BASE;
        }
        return "";
    }

    private static ResolvedRerank unusable() {
        return new ResolvedRerank(false, "", "", "", "", "");
    }

    private static ResolvedRerank unusable(String ignoredMode) {
        return unusable();
    }

    private static String normalize(String value, String defaultValue) {
        if (!StringUtils.hasText(value)) {
            return defaultValue;
        }
        return value.trim().toLowerCase();
    }

    private static String trimSlash(String url) {
        if (!StringUtils.hasText(url)) {
            return "";
        }
        String u = url.trim();
        while (u.endsWith("/")) {
            u = u.substring(0, u.length() - 1);
        }
        return u;
    }
}
