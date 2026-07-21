package com.knowledge.base.ai.config;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * {@link RetrievalEngineProfile} 白名单与旧配置映射单测。
 */
class RetrievalEngineProfileTest {

    @Test
    void fromLegacy_esOnly() {
        assertEquals(RetrievalEngineProfile.ES_ES,
                RetrievalEngineProfile.fromLegacy("elasticsearch", false));
    }

    @Test
    void fromLegacy_esQdrant() {
        assertEquals(RetrievalEngineProfile.ES_QDRANT,
                RetrievalEngineProfile.fromLegacy("elasticsearch", true));
    }

    @Test
    void fromLegacy_milvus() {
        assertEquals(RetrievalEngineProfile.MILVUS_MILVUS,
                RetrievalEngineProfile.fromLegacy("milvus", false));
    }

    @Test
    void fromLegacy_qdrantStore() {
        assertEquals(RetrievalEngineProfile.QDRANT_QDRANT,
                RetrievalEngineProfile.fromLegacy("qdrant", false));
    }

    @Test
    void fromEngines_whitelistOk() {
        assertEquals(RetrievalEngineProfile.ES_MILVUS,
                RetrievalEngineProfile.fromEngines("elasticsearch", "milvus"));
        assertEquals(RetrievalEngineProfile.QDRANT_QDRANT,
                RetrievalEngineProfile.fromEngines("qdrant", "qdrant"));
    }

    @Test
    void fromEngines_illegalRejected() {
        assertThrows(IllegalArgumentException.class,
                () -> RetrievalEngineProfile.fromEngines("milvus", "qdrant"));
    }

    @Test
    void fromId_andFlags() {
        RetrievalEngineProfile p = RetrievalEngineProfile.fromId("es-qdrant");
        assertTrue(p.needsQdrant());
        assertTrue(p.needsElasticsearchChunk());
        assertFalse(p.needsMilvus());
        assertTrue(p.legacyQdrantBypassEnabled());
        assertEquals("elasticsearch", p.legacyVectorStore());
    }
}
