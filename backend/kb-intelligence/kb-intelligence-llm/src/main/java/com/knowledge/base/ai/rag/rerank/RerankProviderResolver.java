package com.knowledge.base.ai.rag.rerank;

import com.knowledge.base.ai.config.RagProperties;
import com.knowledge.base.ai.config.RagRuntimeSettings;
import com.knowledge.base.common.config.ModelLibraryClient;
import com.knowledge.base.common.model.ModelLibraryEntry;
import com.knowledge.base.common.model.ModelLibraryItem;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * 解析重排 provider / 模型 / 凭证（auto 跟随 embedding）。
 *
 * <p>优先级（第8阶段）：</p>
 * <ol>
 *   <li><b>模型库</b>（rerank 类型默认条目）：provider / model / apiKey（解密）/ baseUrl；</li>
 *   <li>热读 {@link RagRuntimeSettings} 的 provider/model；</li>
 *   <li>yml/Nacos 兜底（enabled/mode 始终热读）。</li>
 * </ol>
 *
 * @author knowledge-base-team
 * @since 1.0.0
 */
@Component
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
    @Nullable
    private final RagRuntimeSettings runtimeSettings;

    @Value("${qwen.api-key:}")
    private String qwenApiKey;

    @Value("${siliconflow.api-key:}")
    private String siliconflowApiKey;

    @Value("${siliconflow.base-url:https://api.siliconflow.cn/v1}")
    private String siliconflowBaseUrl;

    /** 模型库客户端（可选注入：单测/无 Redis 场景为 null） */
    @Autowired(required = false)
    private ModelLibraryClient modelLibraryClient;

    /**
     * Spring 构造（runtimeSettings 可选）。
     *
     * @param ragProperties   yml 兜底
     * @param runtimeSettings 热读（可 null）
     */
    @Autowired
    public RerankProviderResolver(RagProperties ragProperties,
                                  @Autowired(required = false) RagRuntimeSettings runtimeSettings) {
        this.ragProperties = ragProperties;
        this.runtimeSettings = runtimeSettings;
    }

    /**
     * 解析当前有效重排配置。
     *
     * @return 解析结果；mode 非 api 或凭证不足时 usable=false
     */
    public ResolvedRerank resolve() {
        RagProperties.Rerank rerank = ragProperties.getRerank();
        if (rerank == null) {
            return unusable();
        }
        if (!isRerankEnabled(rerank)) {
            return unusable();
        }
        String mode = normalize(resolveModeRaw(rerank), MODE_API);
        if (MODE_OFF.equals(mode) || MODE_LLM.equals(mode)) {
            return unusable(mode);
        }
        if (!MODE_API.equals(mode)) {
            return unusable();
        }

        // 第8阶段：模型库 rerank 默认条目优先（provider/model/凭证/baseUrl 一体）
        ResolvedRerank library = resolveFromLibrary();
        if (library != null) {
            return library;
        }

        String provider = resolveProvider(resolveProviderRaw(rerank));
        String modelCfg = resolveModelRaw(rerank);
        String model = StringUtils.hasText(modelCfg)
                ? modelCfg.trim()
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
     * 从模型库解析 rerank 默认条目；无条目返回 null（走旧配置）。
     */
    private ResolvedRerank resolveFromLibrary() {
        if (modelLibraryClient == null) {
            return null;
        }
        ModelLibraryEntry entry = modelLibraryClient.getDefaultEntryByType(ModelLibraryClient.TYPE_RERANK);
        if (entry == null) {
            return null;
        }
        ModelLibraryItem item = modelLibraryClient.getDefaultByType(ModelLibraryClient.TYPE_RERANK);
        String model = item != null && StringUtils.hasText(item.getModelKey())
                ? item.getModelKey().trim()
                : DEFAULT_SILICONFLOW_MODEL;
        String apiKey = entry.getApiKey();
        String baseUrl = entry.getBaseUrl();
        if (!StringUtils.hasText(apiKey) || !StringUtils.hasText(baseUrl)) {
            return new ResolvedRerank(false, entry.getProviderKey(), model,
                    StringUtils.hasText(apiKey) ? apiKey : "", StringUtils.hasText(baseUrl) ? baseUrl : "", "/rerank");
        }
        return new ResolvedRerank(true, entry.getProviderKey(), model, apiKey, trimSlash(baseUrl), "/rerank");
    }

    /**
     * 读取规范化后的 mode（off/api/llm）。
     *
     * @return mode 小写
     */
    public String resolveMode() {
        RagProperties.Rerank rerank = ragProperties.getRerank();
        if (rerank == null || !isRerankEnabled(rerank)) {
            return MODE_OFF;
        }
        return normalize(resolveModeRaw(rerank), MODE_API);
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

    private boolean isRerankEnabled(RagProperties.Rerank rerank) {
        if (runtimeSettings != null) {
            return runtimeSettings.resolveRerankEnabled();
        }
        return rerank.isEnabled();
    }

    private String resolveModeRaw(RagProperties.Rerank rerank) {
        if (runtimeSettings != null) {
            return runtimeSettings.resolveRerankMode();
        }
        return rerank.getMode();
    }

    private String resolveProviderRaw(RagProperties.Rerank rerank) {
        if (runtimeSettings != null) {
            String hot = runtimeSettings.resolveRerankProvider();
            if (StringUtils.hasText(hot)) {
                return hot;
            }
        }
        return rerank.getProvider();
    }

    private String resolveModelRaw(RagProperties.Rerank rerank) {
        if (runtimeSettings != null) {
            String hot = runtimeSettings.resolveRerankModel();
            if (StringUtils.hasText(hot)) {
                return hot;
            }
        }
        return StringUtils.hasText(rerank.getModel()) ? rerank.getModel() : "";
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
