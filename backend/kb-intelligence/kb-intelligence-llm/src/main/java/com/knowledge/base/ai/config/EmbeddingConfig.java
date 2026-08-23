package com.knowledge.base.ai.config;

import com.knowledge.base.common.config.ModelLibraryClient;
import com.knowledge.base.common.model.ModelLibraryEntry;
import com.knowledge.base.common.model.ModelLibraryItem;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.openai.OpenAiEmbeddingModel;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

/**
 * 嵌入模型配置（OpenAI 兼容接口，第8阶段：模型库优先）。
 *
 * <p>凭证与模型解析顺序：</p>
 * <ol>
 *   <li><b>模型库</b>（embedding 类型默认条目）：base_url / api_key（解密）/ model；</li>
 *   <li>{@code rag.embedding.api-key}/{@code base-url}/{@code model}（可选覆盖）；</li>
 *   <li>当 {@code rag.embedding.provider=siliconflow} 时 → 根节点 {@code siliconflow.*}；</li>
 *   <li>否则回退根节点 {@code qwen.*}（历史「对话与向量共用通义」）。</li>
 * </ol>
 *
 * @author 苏三
 * @since 1.0.0
 */
@Slf4j
@Configuration
public class EmbeddingConfig {

    private static final String PROVIDER_SILICONFLOW = "siliconflow";
    private static final String DEFAULT_QWEN_BASE_URL =
            "https://dashscope.aliyuncs.com/compatible-mode/v1";
    private static final String DEFAULT_SILICONFLOW_BASE_URL = "https://api.siliconflow.cn/v1";

    @Value("${qwen.api-key:}")
    private String qwenApiKey;

    @Value("${qwen.base-url:https://dashscope.aliyuncs.com/compatible-mode/v1}")
    private String qwenBaseUrl;

    @Value("${siliconflow.api-key:}")
    private String siliconflowApiKey;

    @Value("${siliconflow.base-url:https://api.siliconflow.cn/v1}")
    private String siliconflowBaseUrl;

    @Autowired
    private RagProperties ragProperties;

    /** 模型库客户端（可选注入：单测/无 Redis 场景为 null） */
    @Autowired(required = false)
    private ModelLibraryClient modelLibraryClient;

    /**
     * 创建 EmbeddingModel Bean。
     *
     * <p>条件：rag.enabled=true，且 embedding / siliconflow / qwen 任一 api-key 非空，
     * 或模型库已配置 embedding 类型条目。</p>
     *
     * @return OpenAI 兼容嵌入模型
     */
    /**
     * embeddingModel 方法。
     */
    @Bean
    @ConditionalOnProperty(name = "rag.enabled", havingValue = "true", matchIfMissing = true)
    @ConditionalOnExpression(
            "T(org.springframework.util.StringUtils).hasText('${rag.embedding.api-key:}') "
                    + "|| T(org.springframework.util.StringUtils).hasText('${siliconflow.api-key:}') "
                    + "|| T(org.springframework.util.StringUtils).hasText('${qwen.api-key:}') "
                    + "|| @modelLibraryClient.hasLibraryType('embedding')")
    public EmbeddingModel embeddingModel() {
        String apiKey = resolveApiKey();
        String baseUrl = resolveBaseUrl();
        String model = resolveModel();
        String provider = ragProperties.getEmbedding().getProvider();
        log.info("✅ 创建 EmbeddingModel：provider={}, model={}, baseUrl={}",
                provider, model, baseUrl);
        return OpenAiEmbeddingModel.builder()
                .apiKey(apiKey)
                .baseUrl(baseUrl)
                .modelName(model)
                .build();
    }

    /**
     * 启动时打印嵌入就绪状态（不输出完整 Key）。
     */
    /**
     * 初始化。
     */
    @PostConstruct
    public void init() {
        String apiKey = resolveApiKey();
        if (StringUtils.hasText(apiKey)) {
            log.info("✅ RAG嵌入已配置：provider={}, model={}, dimension={}, keyLen={}",
                    ragProperties.getEmbedding().getProvider(),
                    resolveModel(),
                    ragProperties.getEmbedding().getDimension(),
                    apiKey.length());
        } else {
            log.warn("⚠️ RAG嵌入不可用：未配置 SILICONFLOW_API_KEY / RAG_EMBEDDING_API_KEY / QWEN_API_KEY，且模型库无 embedding 条目");
        }
    }

    /**
     * 解析嵌入 API Key：模型库默认条目 → embedding 覆盖 → siliconflow 根节点 → qwen 根节点。
     *
     * @return 非空 Key，或空字符串
     */
    String resolveApiKey() {
        ModelLibraryEntry entry = libraryEmbeddingEntry();
        if (entry != null && StringUtils.hasText(entry.getApiKey())) {
            return entry.getApiKey().trim();
        }
        String fromEmbedding = ragProperties.getEmbedding().getApiKey();
        if (StringUtils.hasText(fromEmbedding)) {
            return fromEmbedding.trim();
        }
        if (isSiliconflowProvider()) {
            return siliconflowApiKey != null ? siliconflowApiKey.trim() : "";
        }
        return qwenApiKey != null ? qwenApiKey.trim() : "";
    }

    /**
     * 解析嵌入 base-url：模型库默认条目 → embedding 覆盖 → siliconflow 根节点 → qwen 根节点。
     *
     * @return OpenAI 兼容 base-url
     */
    String resolveBaseUrl() {
        ModelLibraryEntry entry = libraryEmbeddingEntry();
        if (entry != null && StringUtils.hasText(entry.getBaseUrl())) {
            return entry.getBaseUrl().trim();
        }
        String fromEmbedding = ragProperties.getEmbedding().getBaseUrl();
        if (StringUtils.hasText(fromEmbedding)) {
            return fromEmbedding.trim();
        }
        if (isSiliconflowProvider()) {
            return StringUtils.hasText(siliconflowBaseUrl)
                    ? siliconflowBaseUrl.trim()
                    : DEFAULT_SILICONFLOW_BASE_URL;
        }
        return StringUtils.hasText(qwenBaseUrl) ? qwenBaseUrl.trim() : DEFAULT_QWEN_BASE_URL;
    }

    /**
     * 解析嵌入模型名：模型库默认条目优先，否则 rag.embedding.model。
     *
     * @return 模型名
     */
    String resolveModel() {
        ModelLibraryItem item = libraryEmbeddingItem();
        if (item != null && StringUtils.hasText(item.getModelKey())) {
            return item.getModelKey().trim();
        }
        return ragProperties.getEmbedding().getModel();
    }

    /**
     * 模型库 embedding 类型默认条目（提供方，含解密 apiKey / baseUrl）。
     */
    private ModelLibraryEntry libraryEmbeddingEntry() {
        if (modelLibraryClient == null) {
            return null;
        }
        return modelLibraryClient.getDefaultEntryByType(ModelLibraryClient.TYPE_EMBEDDING);
    }

    /**
     * 模型库 embedding 类型默认条目（模型）。
     */
    private ModelLibraryItem libraryEmbeddingItem() {
        if (modelLibraryClient == null) {
            return null;
        }
        return modelLibraryClient.getDefaultByType(ModelLibraryClient.TYPE_EMBEDDING);
    }

    /**
     * 判断当前嵌入提供商是否为硅基流动。
     *
     * @return true 表示 provider=siliconflow
     */
    private boolean isSiliconflowProvider() {
        String provider = ragProperties.getEmbedding().getProvider();
        return StringUtils.hasText(provider)
                && PROVIDER_SILICONFLOW.equalsIgnoreCase(provider.trim());
    }
}
