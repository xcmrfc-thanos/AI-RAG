package com.knowledge.base.agent.model;

import com.knowledge.base.agent.config.AgentProperties;
import com.knowledge.base.common.config.ModelLibraryClient;
import com.knowledge.base.common.model.ModelLibraryEntry;
import com.knowledge.base.common.model.ModelLibraryItem;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Agent 模型解析器（第8阶段：模型库优先）。
 *
 * <p>优先级：</p>
 * <ol>
 *   <li><b>模型库</b>（chat 类型）：按模型 key 精确匹配（或默认条目），
 *       直连 base_url + 解密 api_key，不再限定 qwen/deepseek 两家；</li>
 *   <li><b>旧配置</b>：qwen / deepseek 的 {@code agent.llm.*}（行为与升级前一致）。</li>
 * </ol>
 *
 * @author AI-RAG
 * @since 1.1.0
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AgentModelResolver {

    private final AgentProperties agentProperties;

    /** 模型库客户端（可选注入：单测/无 Redis 场景为 null） */
    private final ModelLibraryClient modelLibraryClient;

    /**
     * 解析后的模型连接信息。
     */
    public record Resolved(String baseUrl, String apiKey, String model, String source) {
        public boolean usable() {
            return StringUtils.hasText(baseUrl) && StringUtils.hasText(apiKey);
        }
    }

    /**
     * 解析模型连接信息：模型库 chat 条目优先，回退旧 qwen/deepseek 配置。
     *
     * @param modelKey 模型 key（模型库物理模型名，或 legacy qwen/deepseek）
     * @return 解析结果（可能不可用）
     */
    public Resolved resolve(String modelKey) {
        String key = StringUtils.hasText(modelKey) ? modelKey.trim() : agentProperties.getDefaultModel();
        Resolved fromLibrary = resolveFromLibrary(key);
        if (fromLibrary != null) {
            return fromLibrary;
        }
        return resolveFromLegacy(key);
    }

    /**
     * 模型库 chat 条目解析。
     */
    private Resolved resolveFromLibrary(String key) {
        if (modelLibraryClient == null) {
            return null;
        }
        ModelLibraryEntry entry = null;
        ModelLibraryItem item = null;
        for (ModelLibraryEntry e : modelLibraryClient.getByType(ModelLibraryClient.TYPE_CHAT)) {
            if (e.getModels() == null) {
                continue;
            }
            for (ModelLibraryItem m : e.getModels()) {
                if (key.equalsIgnoreCase(m.getModelKey())) {
                    entry = e;
                    item = m;
                    break;
                }
            }
            if (entry != null) {
                break;
            }
        }
        if (entry == null) {
            // 未精确命中：使用模型库默认 chat 条目（key 仅作 legacy 兜底）
            entry = modelLibraryClient.getDefaultEntryByType(ModelLibraryClient.TYPE_CHAT);
            item = modelLibraryClient.getDefaultByType(ModelLibraryClient.TYPE_CHAT);
        }
        if (entry == null) {
            return null;
        }
        String model = item != null && StringUtils.hasText(item.getModelKey()) ? item.getModelKey() : key;
        return new Resolved(entry.getBaseUrl(), entry.getApiKey(), model, "library");
    }

    /**
     * 旧配置解析（qwen/deepseek）。
     */
    private Resolved resolveFromLegacy(String key) {
        AgentProperties.Provider provider;
        String model;
        if ("deepseek".equalsIgnoreCase(key)) {
            provider = agentProperties.getLlm().getDeepseek();
            model = provider.getModel();
        } else {
            provider = agentProperties.getLlm().getQwen();
            model = StringUtils.hasText(provider.getModel()) ? provider.getModel() : key;
        }
        return new Resolved(provider.getBaseUrl(), provider.getApiKey(), model, "legacy");
    }
}
