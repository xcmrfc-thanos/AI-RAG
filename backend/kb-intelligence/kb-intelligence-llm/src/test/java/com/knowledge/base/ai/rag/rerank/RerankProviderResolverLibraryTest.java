package com.knowledge.base.ai.rag.rerank;

import com.knowledge.base.ai.config.RagProperties;
import com.knowledge.base.common.config.ModelLibraryClient;
import com.knowledge.base.common.model.ModelLibraryEntry;
import com.knowledge.base.common.model.ModelLibraryItem;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * {@link RerankProviderResolver} 模型库优先 + legacy 兜底单测（第8阶段）。
 */
class RerankProviderResolverLibraryTest {

    private RagProperties properties;
    private ModelLibraryClient library;
    private RerankProviderResolver resolver;

    @BeforeEach
    void setUp() {
        properties = new RagProperties();
        properties.getRerank().setEnabled(true);
        properties.getRerank().setMode("api");
        properties.getRerank().setProvider("auto");
        library = mock(ModelLibraryClient.class);
        resolver = new RerankProviderResolver(properties, null);
        ReflectionTestUtils.setField(resolver, "modelLibraryClient", library);
    }

    private ModelLibraryEntry rerankEntry(String providerKey, String model, String apiKey) {
        ModelLibraryEntry e = new ModelLibraryEntry();
        e.setProviderKey(providerKey);
        e.setBaseUrl("https://rerank.local/v1");
        e.setApiKey(apiKey);
        ModelLibraryItem item = new ModelLibraryItem();
        item.setModelKey(model);
        item.setModelType(ModelLibraryClient.TYPE_RERANK);
        item.setIsDefault(1);
        e.setModels(List.of(item));
        return e;
    }

    /** 模型库 rerank 条目 → provider/model/apiKey/baseUrl 一体解析。 */
    @Test
    void libraryPresent_usesLibraryEntry() {
        when(library.getDefaultEntryByType(ModelLibraryClient.TYPE_RERANK))
                .thenReturn(rerankEntry("custom", "my-reranker", "sk-lib"));
        when(library.getDefaultByType(ModelLibraryClient.TYPE_RERANK)).thenAnswer(inv ->
                rerankEntry("custom", "my-reranker", "sk-lib").getModels().get(0));

        ResolvedRerank resolved = resolver.resolve();

        assertTrue(resolved.usable());
        assertEquals("custom", resolved.provider());
        assertEquals("my-reranker", resolved.model());
        assertEquals("sk-lib", resolved.apiKey());
        assertEquals("https://rerank.local/v1", resolved.baseUrl());
        assertEquals("/rerank", resolved.endpointPath());
    }

    /** 模型库无条目 → 回退 legacy（auto 跟随 embedding）。 */
    @Test
    void libraryEmpty_fallsBackToLegacy() {
        when(library.getDefaultEntryByType(ModelLibraryClient.TYPE_RERANK)).thenReturn(null);

        ResolvedRerank resolved = resolver.resolve();

        // embedding provider 默认 qwen → legacy qwen（无 Key → unusable）
        assertFalse(resolved.usable());
        assertEquals(RerankProviderResolver.PROVIDER_QWEN, resolved.provider());
    }

    /** 模型库条目缺 Key → 标记不可用但不抛异常（服务不崩）。 */
    @Test
    void libraryEntryMissingKey_markedUnusable() {
        when(library.getDefaultEntryByType(ModelLibraryClient.TYPE_RERANK))
                .thenReturn(rerankEntry("custom", "my-reranker", ""));

        ResolvedRerank resolved = resolver.resolve();

        assertFalse(resolved.usable());
        assertEquals("custom", resolved.provider());
    }

    /** mode=off 时即使模型库有条目也禁用。 */
    @Test
    void modeOff_disablesEvenWithLibrary() {
        properties.getRerank().setMode("off");
        when(library.getDefaultEntryByType(ModelLibraryClient.TYPE_RERANK))
                .thenReturn(rerankEntry("custom", "my-reranker", "sk-lib"));

        ResolvedRerank resolved = resolver.resolve();

        assertFalse(resolved.usable());
    }
}
