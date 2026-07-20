package com.knowledge.base.ai.config;

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
 * 嵌入模型配置（OpenAI 兼容接口）。
 *
 * <p>优先使用 {@code rag.embedding.api-key}/{@code base-url}；为空时回退
 * {@code qwen.api-key}/{@code qwen.base-url}，从而支持：</p>
 * <ul>
 *   <li>公网：通义 text-embedding-v3，或硅基 BAAI/bge-m3（独立 Key/URL）</li>
 *   <li>内网：Ollama / TEI 上的 bge-m3，与对话 qwen2.5 可同机或分端口</li>
 * </ul>
 *
 * @author 苏三
 * @since 1.0.0
 */
@Slf4j
@Configuration
public class EmbeddingConfig {

    @Value("${qwen.api-key:}")
    private String qwenApiKey;

    @Value("${qwen.base-url:https://dashscope.aliyuncs.com/compatible-mode/v1}")
    private String qwenBaseUrl;

    @Autowired
    private RagProperties ragProperties;

    /**
     * 创建 EmbeddingModel Bean。
     *
     * <p>条件：rag.enabled=true，且 {@code rag.embedding.api-key} 或 {@code qwen.api-key} 非空。</p>
     *
     * @return OpenAI 兼容嵌入模型
     */
    @Bean
    @ConditionalOnProperty(name = "rag.enabled", havingValue = "true", matchIfMissing = true)
    @ConditionalOnExpression(
            "T(org.springframework.util.StringUtils).hasText('${rag.embedding.api-key:}') "
                    + "|| T(org.springframework.util.StringUtils).hasText('${qwen.api-key:}')")
    public EmbeddingModel embeddingModel() {
        String apiKey = resolveApiKey();
        String baseUrl = resolveBaseUrl();
        String model = ragProperties.getEmbedding().getModel();
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
    @PostConstruct
    public void init() {
        String apiKey = resolveApiKey();
        if (StringUtils.hasText(apiKey)) {
            log.info("✅ RAG嵌入已配置：provider={}, model={}, dimension={}, keyLen={}",
                    ragProperties.getEmbedding().getProvider(),
                    ragProperties.getEmbedding().getModel(),
                    ragProperties.getEmbedding().getDimension(),
                    apiKey.length());
        } else {
            log.warn("⚠️ RAG嵌入不可用：未配置 RAG_EMBEDDING_API_KEY / QWEN_API_KEY");
        }
    }

    /**
     * 解析嵌入 API Key：embedding 配置优先，否则回退 qwen。
     *
     * @return 非空 Key，或空字符串
     */
    String resolveApiKey() {
        String fromEmbedding = ragProperties.getEmbedding().getApiKey();
        if (StringUtils.hasText(fromEmbedding)) {
            return fromEmbedding.trim();
        }
        return qwenApiKey != null ? qwenApiKey.trim() : "";
    }

    /**
     * 解析嵌入 base-url：embedding 配置优先，否则回退 qwen。
     *
     * @return OpenAI 兼容 base-url
     */
    String resolveBaseUrl() {
        String fromEmbedding = ragProperties.getEmbedding().getBaseUrl();
        if (StringUtils.hasText(fromEmbedding)) {
            return fromEmbedding.trim();
        }
        return StringUtils.hasText(qwenBaseUrl)
                ? qwenBaseUrl.trim()
                : "https://dashscope.aliyuncs.com/compatible-mode/v1";
    }
}
