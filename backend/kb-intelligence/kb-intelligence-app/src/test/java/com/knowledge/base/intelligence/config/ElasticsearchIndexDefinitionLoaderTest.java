package com.knowledge.base.intelligence.config;

import com.knowledge.base.common.elasticsearch.ElasticsearchIndexDefinitionLoader;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * ES 索引定义加载器单测（standard 分词回落）
 */
class ElasticsearchIndexDefinitionLoaderTest {

    @Test
    void adaptAnalyzersShouldReplaceIkWhenDisabled() {
        String raw = "{\"mappings\":{\"properties\":{\"title\":{\"analyzer\":\"ik_max_word\"}}}}";
        String adapted = ElasticsearchIndexDefinitionLoader.adaptAnalyzers(raw, false);
        assertFalse(adapted.contains("ik_max_word"));
        assertTrue(adapted.contains("standard"));
    }

    @Test
    void adaptAnalyzersShouldKeepIkWhenEnabled() {
        String raw = "{\"analyzer\":\"ik_max_word\"}";
        String adapted = ElasticsearchIndexDefinitionLoader.adaptAnalyzers(raw, true);
        assertTrue(adapted.contains("ik_max_word"));
    }
}
