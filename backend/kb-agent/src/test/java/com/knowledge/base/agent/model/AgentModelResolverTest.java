package com.knowledge.base.agent.model;

import com.knowledge.base.agent.config.AgentProperties;
import com.knowledge.base.common.config.ModelLibraryClient;
import com.knowledge.base.common.model.ModelLibraryEntry;
import com.knowledge.base.common.model.ModelLibraryItem;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * {@link AgentModelResolver} 模型库优先 + legacy 兜底单测（第8阶段）。
 */
class AgentModelResolverTest {

    private AgentProperties properties;
    private ModelLibraryClient library;
    private AgentModelResolver resolver;

    @BeforeEach
    void setUp() {
        properties = new AgentProperties();
        properties.setDefaultModel("qwen");
        properties.getLlm().getQwen().setApiKey("sk-legacy-qwen");
        properties.getLlm().getQwen().setBaseUrl("https://qwen.local/v1");
        properties.getLlm().getQwen().setModel("qwen-max");
        properties.getLlm().getDeepseek().setApiKey("sk-legacy-ds");
        properties.getLlm().getDeepseek().setBaseUrl("https://deepseek.local/v1");
        properties.getLlm().getDeepseek().setModel("deepseek-chat");
        library = mock(ModelLibraryClient.class);
        resolver = new AgentModelResolver(properties, library);
    }

    private ModelLibraryEntry chatEntry(String providerKey, String model, boolean isDefault) {
        ModelLibraryEntry e = new ModelLibraryEntry();
        e.setProviderKey(providerKey);
        e.setBaseUrl("https://lib.local/v1");
        e.setApiKey("sk-lib");
        ModelLibraryItem item = new ModelLibraryItem();
        item.setModelKey(model);
        item.setModelType(ModelLibraryClient.TYPE_CHAT);
        item.setIsDefault(isDefault ? 1 : 0);
        e.setModels(List.of(item));
        return e;
    }

    /** 模型库精确命中 → library 来源。 */
    @Test
    void libraryExactHit_usesLibrary() {
        when(library.getByType(ModelLibraryClient.TYPE_CHAT))
                .thenReturn(List.of(chatEntry("custom", "my-agent-llm", true)));

        AgentModelResolver.Resolved resolved = resolver.resolve("my-agent-llm");

        assertEquals("library", resolved.source());
        assertEquals("https://lib.local/v1", resolved.baseUrl());
        assertEquals("sk-lib", resolved.apiKey());
        assertEquals("my-agent-llm", resolved.model());
        assertTrue(resolved.usable());
    }

    /** 模型库未命中 → legacy qwen/deepseek。 */
    @Test
    void libraryMiss_fallsBackToLegacy() {
        when(library.getByType(ModelLibraryClient.TYPE_CHAT)).thenReturn(List.of());

        AgentModelResolver.Resolved qwen = resolver.resolve("qwen");
        assertEquals("legacy", qwen.source());
        assertEquals("sk-legacy-qwen", qwen.apiKey());
        assertEquals("qwen-max", qwen.model());

        AgentModelResolver.Resolved deepseek = resolver.resolve("deepseek");
        assertEquals("legacy", deepseek.source());
        assertEquals("sk-legacy-ds", deepseek.apiKey());
    }

    /** 模型库存在但 key 未命中 → 使用模型库默认 chat 条目。 */
    @Test
    void libraryPresentButKeyMiss_usesLibraryDefault() {
        when(library.getByType(ModelLibraryClient.TYPE_CHAT))
                .thenReturn(List.of(chatEntry("custom", "default-llm", true)));
        when(library.getDefaultEntryByType(ModelLibraryClient.TYPE_CHAT))
                .thenReturn(chatEntry("custom", "default-llm", true));
        when(library.getDefaultByType(ModelLibraryClient.TYPE_CHAT))
                .thenReturn(chatEntry("custom", "default-llm", true).getModels().get(0));

        AgentModelResolver.Resolved resolved = resolver.resolve("not-in-library");

        assertEquals("library", resolved.source());
        assertEquals("default-llm", resolved.model());
    }

    /** 默认 key 空 → 使用 agent.default-model。 */
    @Test
    void emptyKey_usesDefaultModel() {
        when(library.getByType(ModelLibraryClient.TYPE_CHAT)).thenReturn(List.of());

        AgentModelResolver.Resolved resolved = resolver.resolve(null);

        assertEquals("legacy", resolved.source());
        assertEquals("sk-legacy-qwen", resolved.apiKey());
    }
}
