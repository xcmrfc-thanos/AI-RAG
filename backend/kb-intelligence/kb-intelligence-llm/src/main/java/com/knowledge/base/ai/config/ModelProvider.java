package com.knowledge.base.ai.config;

import com.knowledge.base.ai.config.localdev.LocalDevChatLanguageModel;
import com.knowledge.base.ai.config.localdev.LocalDevStreamingChatLanguageModel;
import com.knowledge.base.ai.vo.ModelVO;
import com.knowledge.base.common.config.ModelLibraryClient;
import com.knowledge.base.common.model.ModelLibraryEntry;
import com.knowledge.base.common.model.ModelLibraryItem;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.chat.StreamingChatLanguageModel;
import dev.langchain4j.model.openai.OpenAiChatModel;
import dev.langchain4j.model.openai.OpenAiStreamingChatModel;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * AI模型提供器（第8阶段：模型库优先 + 旧 Nacos 兜底）
 *
 * <p>模型来源优先级：</p>
 * <ol>
 *   <li><b>模型库</b>（kb_model，chat 类型）：key=物理模型名（qwen3-max…），
 *       base_url / api_key（解密）/ model 来自模型库条目，构建 OpenAI 兼容实例；</li>
 *   <li><b>旧 Nacos 配置</b>（qwen / deepseek）：模型库为空时的兜底，行为与升级前一致；</li>
 *   <li><b>dev-stub</b>：无 API Key 且 {@code ai.dev-stub-enabled=true} 时本地回答。</li>
 * </ol>
 *
 * <p>模型库快照本地懒加载（约 60s TTL，与 {@link ModelLibraryClient} 双层缓存），
 * 模型库变更后最多 60s 生效，无需重启。</p>
 *
 * @author 苏三
 * @since 1.0.0
 */
@Slf4j
@Component
public class ModelProvider {

    // ==================== 通义千问配置（legacy 兜底） ====================

    @Value("${qwen.api-key}")
    private String qwenApiKey;

    @Value("${qwen.base-url}")
    private String qwenBaseUrl;

    @Value("${qwen.chat.options.model}")
    private String qwenModel;

    @Value("${qwen.chat.options.max-tokens}")
    private Integer qwenMaxTokens;

    @Value("${qwen.chat.options.temperature}")
    private Double qwenTemperature;

    // ==================== DeepSeek配置（legacy 兜底） ====================

    @Value("${deepseek.api-key}")
    private String deepseekApiKey;

    @Value("${deepseek.base-url}")
    private String deepseekBaseUrl;

    @Value("${deepseek.model}")
    private String deepseekModel;

    @Value("${deepseek.max-tokens}")
    private Integer deepseekMaxTokens;

    @Value("${deepseek.temperature}")
    private Double deepseekTemperature;

    // ==================== 内部状态 ====================

    @Value("${ai.default-model:qwen}")
    private String defaultModel;

    @Value("${ai.dev-stub-enabled:false}")
    private boolean devStubEnabled;

    /** 模型库客户端（可选注入：单测/无 Redis 场景下为 null，回退 legacy） */
    @Autowired(required = false)
    private ModelLibraryClient modelLibraryClient;

    /** 模型实例缓存（懒加载） */
    private final Map<String, ChatLanguageModel> instanceCache = new ConcurrentHashMap<>();

    /** 流式模型实例缓存（懒加载） */
    private final Map<String, StreamingChatLanguageModel> streamingInstanceCache = new ConcurrentHashMap<>();

    /** legacy 模型的可用性（基于API Key是否配置） */
    private final Map<String, Boolean> modelAvailable = new LinkedHashMap<>();

    /** legacy 模型元信息（init 时固定） */
    private final Map<String, ModelVO> legacyModelInfoMap = new LinkedHashMap<>();

    /** 模型库快照：模型 key → 提供方条目（懒加载，60s TTL） */
    private volatile Map<String, ModelLibraryEntry> libraryEntryByKey = Collections.emptyMap();

    /** 模型库快照：模型 key → 模型条目 */
    private volatile Map<String, ModelLibraryItem> libraryItemByKey = Collections.emptyMap();

    /** 模型库快照加载时间 */
    private volatile long libraryLoadedAt = 0;

    /** 模型库快照 TTL（毫秒），与 ModelLibraryClient 本地缓存一致 */
    private static final long LIBRARY_TTL_MS = 60_000;

    /**
     * 初始化（注册 legacy 兜底模型）。
     */
    @PostConstruct
    public void init() {
        checkAndRegister("qwen", "通义千问", "阿里云大语言模型，支持多轮对话、文本生成等", qwenApiKey);
        checkAndRegister("deepseek", "DeepSeek", "深度求索大语言模型，擅长代码生成和深度推理", deepseekApiKey);

        if (modelAvailable.isEmpty()) {
            log.error("❌ 所有AI模型均未配置API Key！请至少设置 QWEN_API_KEY 或 DEEPSEEK_API_KEY 环境变量，或启用 ai.dev-stub-enabled");
        } else if (devStubEnabled) {
            log.warn("⚠️ AI 本地开发 Stub 已启用（ai.dev-stub-enabled=true），未配置 Key 的模型将使用本地回答");
        }

        if (modelAvailable.containsKey(defaultModel) && modelAvailable.get(defaultModel)) {
            log.info("✅ 默认模型 '{}' 已就绪（legacy 兜底）", defaultModel);
        } else {
            log.warn("⚠️ 默认模型 '{}' API Key 未配置，请设置对应的环境变量后重启（模型库可覆盖）", defaultModel);
        }
    }

    private void checkAndRegister(String key, String displayName, String description, String apiKey) {
        boolean hasKey = apiKey != null && !apiKey.isEmpty();
        boolean available = hasKey || devStubEnabled;
        modelAvailable.put(key, available);
        if (available) {
            legacyModelInfoMap.put(key, ModelVO.builder()
                    .key(key)
                    .displayName(displayName)
                    .description(description)
                    .isDefault(key.equals(defaultModel))
                    .build());
            if (hasKey) {
                log.info("✅ 模型 '{}' ({}) 已注册（legacy，API Key 已配置）", key, displayName);
            } else {
                log.info("✅ 模型 '{}' ({}) 已注册（legacy，本地 Stub 模式）", key, displayName);
            }
        } else {
            log.warn("⚠️ 模型 '{}' ({}) API Key 未配置，该模型不可用（legacy）", key, displayName);
        }
    }

    /**
     * 懒加载模型库快照（60s TTL），返回 chat 类型模型 key → 提供方条目。
     */
    private Map<String, ModelLibraryEntry> ensureLibraryLoaded() {
        long now = System.currentTimeMillis();
        if (now - libraryLoadedAt <= LIBRARY_TTL_MS && !libraryEntryByKey.isEmpty()) {
            return libraryEntryByKey;
        }
        if (modelLibraryClient == null) {
            return libraryEntryByKey;
        }
        synchronized (this) {
            if (now - libraryLoadedAt <= LIBRARY_TTL_MS && !libraryEntryByKey.isEmpty()) {
                return libraryEntryByKey;
            }
            List<ModelLibraryEntry> entries = modelLibraryClient.getByType(ModelLibraryClient.TYPE_CHAT);
            Map<String, ModelLibraryEntry> entryMap = new LinkedHashMap<>();
            Map<String, ModelLibraryItem> itemMap = new LinkedHashMap<>();
            for (ModelLibraryEntry entry : entries) {
                if (entry.getModels() == null) {
                    continue;
                }
                for (ModelLibraryItem item : entry.getModels()) {
                    if (!ModelLibraryClient.TYPE_CHAT.equals(item.getModelType())) {
                        continue;
                    }
                    entryMap.put(item.getModelKey(), entry);
                    itemMap.put(item.getModelKey(), item);
                }
            }
            this.libraryEntryByKey = entryMap;
            this.libraryItemByKey = itemMap;
            this.libraryLoadedAt = System.currentTimeMillis();
            if (!entryMap.isEmpty()) {
                log.info("✅ 模型库加载完成：{} 个 chat 模型", entryMap.size());
            }
            return entryMap;
        }
    }

    /**
     * 懒加载构建 ChatLanguageModel 实例（阻塞式）。
     * 优先级：模型库条目 → legacy switch → dev-stub。
     */
    private ChatLanguageModel buildModel(String modelName) {
        ModelLibraryEntry entry = ensureLibraryLoaded().get(modelName);
        if (entry != null) {
            if (shouldStub(entry)) {
                return new LocalDevChatLanguageModel();
            }
            ModelLibraryItem item = libraryItemByKey.get(modelName);
            Double temperature = configDouble(item, "temperature", qwenTemperature);
            Integer maxTokens = configInt(item, "max_tokens", qwenMaxTokens);
            return OpenAiChatModel.builder()
                    .baseUrl(entry.getBaseUrl())
                    .apiKey(entry.getApiKey())
                    .modelName(modelName)
                    .maxTokens(maxTokens)
                    .temperature(temperature)
                    .build();
        }
        if (shouldUseDevStub(modelName)) {
            return new LocalDevChatLanguageModel();
        }
        switch (modelName) {
            case "qwen":
                return OpenAiChatModel.builder()
                        .baseUrl(qwenBaseUrl)
                        .apiKey(qwenApiKey)
                        .modelName(qwenModel)
                        .maxTokens(qwenMaxTokens)
                        .temperature(qwenTemperature)
                        .build();
            case "deepseek":
                return OpenAiChatModel.builder()
                        .baseUrl(deepseekBaseUrl)
                        .apiKey(deepseekApiKey)
                        .modelName(deepseekModel)
                        .maxTokens(deepseekMaxTokens)
                        .temperature(deepseekTemperature)
                        .build();
            default:
                throw new IllegalStateException("未知模型：" + modelName);
        }
    }

    /**
     * 懒加载构建 StreamingChatLanguageModel 实例（流式输出）。
     */
    private StreamingChatLanguageModel buildStreamingModel(String modelName) {
        ModelLibraryEntry entry = ensureLibraryLoaded().get(modelName);
        if (entry != null) {
            if (shouldStub(entry)) {
                return new LocalDevStreamingChatLanguageModel();
            }
            ModelLibraryItem item = libraryItemByKey.get(modelName);
            Double temperature = configDouble(item, "temperature", qwenTemperature);
            Integer maxTokens = configInt(item, "max_tokens", qwenMaxTokens);
            return OpenAiStreamingChatModel.builder()
                    .baseUrl(entry.getBaseUrl())
                    .apiKey(entry.getApiKey())
                    .modelName(modelName)
                    .maxTokens(maxTokens)
                    .temperature(temperature)
                    .build();
        }
        if (shouldUseDevStub(modelName)) {
            return new LocalDevStreamingChatLanguageModel();
        }
        switch (modelName) {
            case "qwen":
                return OpenAiStreamingChatModel.builder()
                        .baseUrl(qwenBaseUrl)
                        .apiKey(qwenApiKey)
                        .modelName(qwenModel)
                        .maxTokens(qwenMaxTokens)
                        .temperature(qwenTemperature)
                        .build();
            case "deepseek":
                return OpenAiStreamingChatModel.builder()
                        .baseUrl(deepseekBaseUrl)
                        .apiKey(deepseekApiKey)
                        .modelName(deepseekModel)
                        .maxTokens(deepseekMaxTokens)
                        .temperature(deepseekTemperature)
                        .build();
            default:
                throw new IllegalStateException("未知模型：" + modelName);
        }
    }

    /**
     * 根据模型名称获取ChatLanguageModel实例（懒加载）。
     *
     * @param modelName 模型 key（模型库模型名，或 legacy qwen/deepseek）
     * @return ChatLanguageModel实例
     * @throws IllegalStateException 如果请求的模型不可用
     */
    public ChatLanguageModel getModel(String modelName) {
        String key = resolveModelKey(modelName);
        if (!isAvailable(key)) {
            throw new IllegalStateException(
                    "模型 '" + key + "' 不可用。请先在模型库或部署配置中配置 API Key 后重试。");
        }
        return instanceCache.computeIfAbsent(key, k -> {
            log.info("🔄 首次调用，构建 ChatLanguageModel：{}", k);
            return buildModel(k);
        });
    }

    /**
     * 根据模型名称获取 StreamingChatLanguageModel 实例（流式输出，懒加载）。
     */
    public StreamingChatLanguageModel getStreamingModel(String modelName) {
        String key = resolveModelKey(modelName);
        if (!isAvailable(key)) {
            throw new IllegalStateException(
                    "模型 '" + key + "' 不可用。请先在模型库或部署配置中配置 API Key 后重试。");
        }
        return streamingInstanceCache.computeIfAbsent(key, k -> {
            log.info("🔄 首次调用，构建 StreamingChatLanguageModel：{}", k);
            return buildStreamingModel(k);
        });
    }

    /**
     * 获取默认模型。
     *
     * @throws IllegalStateException 如果没有任何可用模型
     */
    public ChatLanguageModel getDefaultModel() {
        return getModel(getDefaultModelName());
    }

    /**
     * 获取默认模型名称。
     *
     * <p>模型库 chat 默认条目优先（is_default=1）；无模型库时返回
     * {@code ai.default-model}（legacy 行为不变）。</p>
     */
    public String getDefaultModelName() {
        Map<String, ModelLibraryItem> items = ensureLibraryLoadedItems();
        if (!items.isEmpty()) {
            for (ModelLibraryItem item : items.values()) {
                if (item.getIsDefault() != null && item.getIsDefault() == 1) {
                    return item.getModelKey();
                }
            }
            return items.values().iterator().next().getModelKey();
        }
        return defaultModel;
    }

    /**
     * 获取所有可用的模型信息列表（模型库优先，legacy 兜底，同 key 去重）。
     */
    public List<ModelVO> getAvailableModels() {
        Map<String, ModelVO> merged = new LinkedHashMap<>();
        for (ModelLibraryItem item : ensureLibraryLoadedItems().values()) {
            ModelLibraryEntry entry = libraryEntryByKey.get(item.getModelKey());
            merged.put(item.getModelKey(), ModelVO.builder()
                    .key(item.getModelKey())
                    .displayName(item.getDisplayName() != null ? item.getDisplayName() : item.getModelKey())
                    .description(entry != null ? entry.getProviderName() : null)
                    .isDefault(item.getIsDefault() != null && item.getIsDefault() == 1)
                    .build());
        }
        for (Map.Entry<String, ModelVO> e : legacyModelInfoMap.entrySet()) {
            merged.putIfAbsent(e.getKey(), e.getValue());
        }
        return new ArrayList<>(merged.values());
    }

    /**
     * 模型是否可用：模型库条目存在（有 key 或 stub）或 legacy 已注册。
     */
    private boolean isAvailable(String key) {
        if (ensureLibraryLoaded().containsKey(key)) {
            return true;
        }
        return modelAvailable.containsKey(key) && modelAvailable.get(key);
    }

    private Map<String, ModelLibraryItem> ensureLibraryLoadedItems() {
        ensureLibraryLoaded();
        return libraryItemByKey;
    }

    private boolean shouldStub(ModelLibraryEntry entry) {
        return devStubEnabled && (entry.getApiKey() == null || entry.getApiKey().isEmpty());
    }

    private String resolveModelKey(String modelName) {
        if (modelName == null || modelName.isEmpty()) {
            return getDefaultModelName();
        }
        // 模型库 key 精确匹配（模型名可能含大小写）；legacy 小写兜底
        if (ensureLibraryLoaded().containsKey(modelName)) {
            return modelName;
        }
        return modelName.toLowerCase();
    }

    /**
     * 判断指定模型是否应使用本地 Stub（legacy：无 API Key 且 dev-stub 开启）。
     */
    private boolean shouldUseDevStub(String modelName) {
        if (!devStubEnabled) {
            return false;
        }
        return switch (modelName) {
            case "qwen" -> qwenApiKey == null || qwenApiKey.isEmpty();
            case "deepseek" -> deepseekApiKey == null || deepseekApiKey.isEmpty();
            default -> true;
        };
    }

    private Double configDouble(ModelLibraryItem item, String key, Double fallback) {
        if (item == null || item.getModelConfig() == null || item.getModelConfig().get(key) == null) {
            return fallback;
        }
        Object v = item.getModelConfig().get(key);
        return v instanceof Number n ? n.doubleValue() : fallback;
    }

    private Integer configInt(ModelLibraryItem item, String key, Integer fallback) {
        if (item == null || item.getModelConfig() == null || item.getModelConfig().get(key) == null) {
            return fallback;
        }
        Object v = item.getModelConfig().get(key);
        return v instanceof Number n ? n.intValue() : fallback;
    }
}
