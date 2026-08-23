package com.knowledge.base.ai.config;

import com.knowledge.base.ai.vo.ModelVO;
import com.knowledge.base.common.config.ModelLibraryClient;
import com.knowledge.base.common.model.ModelLibraryEntry;
import com.knowledge.base.common.model.ModelLibraryItem;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * {@link ModelProvider} 模型库优先 + legacy 兜底单测（第8阶段）。
 */
class ModelProviderLibraryTest {

    private ModelProvider provider;
    private ModelLibraryClient library;

    /**
     * 初始化：legacy qwen/deepseek 无 Key（dev-stub 关），模型库 mock。
     */
    @BeforeEach
    void setUp() {
        provider = new ModelProvider();
        ReflectionTestUtils.setField(provider, "qwenApiKey", "");
        ReflectionTestUtils.setField(provider, "qwenBaseUrl", "https://qwen.local/v1");
        ReflectionTestUtils.setField(provider, "qwenModel", "qwen-max");
        ReflectionTestUtils.setField(provider, "deepseekApiKey", "");
        ReflectionTestUtils.setField(provider, "deepseekBaseUrl", "https://deepseek.local/v1");
        ReflectionTestUtils.setField(provider, "deepseekModel", "deepseek-chat");
        ReflectionTestUtils.setField(provider, "defaultModel", "qwen");
        ReflectionTestUtils.setField(provider, "devStubEnabled", true);
        library = mock(ModelLibraryClient.class);
        ReflectionTestUtils.setField(provider, "modelLibraryClient", library);
    }

    private ModelLibraryEntry entry(String providerKey, String baseUrl, String apiKey, String modelKey,
                                    boolean isDefault) {
        ModelLibraryEntry e = new ModelLibraryEntry();
        e.setProviderKey(providerKey);
        e.setProviderName(providerKey);
        e.setBaseUrl(baseUrl);
        e.setApiKey(apiKey);
        ModelLibraryItem item = new ModelLibraryItem();
        item.setModelKey(modelKey);
        item.setModelType(ModelLibraryClient.TYPE_CHAT);
        item.setIsDefault(isDefault ? 1 : 0);
        e.setModels(List.of(item));
        return e;
    }

    /** 模型库存在 chat 条目 → 下拉/默认模型来自模型库。 */
    @Test
    void libraryPresent_availableModelsAndDefaultFromLibrary() {
        when(library.getByType(ModelLibraryClient.TYPE_CHAT))
                .thenReturn(List.of(entry("qwen", "https://lib-qwen.local/v1", "sk-lib", "qwen3-max", true)));

        provider.init();
        assertEquals("qwen3-max", provider.getDefaultModelName());
        List<ModelVO> models = provider.getAvailableModels();
        assertTrue(models.stream().anyMatch(m -> m.getKey().equals("qwen3-max") && Boolean.TRUE.equals(m.getIsDefault())));
        // legacy qwen（无 Key + stub 开）仍保留为兜底条目
        assertTrue(models.stream().anyMatch(m -> m.getKey().equals("qwen")));
    }

    /** 模型库为空 → 完全回退 legacy（行为与升级前一致）。 */
    @Test
    void libraryEmpty_fallsBackToLegacy() {
        when(library.getByType(ModelLibraryClient.TYPE_CHAT)).thenReturn(List.of());
        provider.init();
        assertEquals("qwen", provider.getDefaultModelName());
        assertTrue(provider.getAvailableModels().stream().anyMatch(m -> m.getKey().equals("qwen")));
        assertTrue(provider.getAvailableModels().stream().anyMatch(m -> m.getKey().equals("deepseek")));
        // legacy 无 Key + stub 开 → getModel 可用（LocalDev）
        assertTrue(provider.getModel("qwen").getClass().getSimpleName().contains("LocalDev"));
    }

    /** 模型库条目 key 精确匹配（大小写敏感），legacy 小写兜底。 */
    @Test
    void libraryKey_exactMatch() {
        when(library.getByType(ModelLibraryClient.TYPE_CHAT))
                .thenReturn(List.of(entry("openai", "https://openai.local/v1", "sk-oa", "gpt-4o", true)));
        provider.init();
        assertEquals("gpt-4o", provider.getDefaultModelName());
        // 未知模型（模型库/legacy 均无）→ 抛异常
        assertThrows(IllegalStateException.class, () -> provider.getModel("unknown-model"));
    }

    /** 模型库 client 缺失（单测 context）→ 回退 legacy。 */
    @Test
    void libraryClientMissing_fallsBackToLegacy() {
        ReflectionTestUtils.setField(provider, "modelLibraryClient", null);
        provider.init();
        assertEquals("qwen", provider.getDefaultModelName());
    }
}
