package com.knowledge.base.document.legacy;

import com.knowledge.base.document.entity.Document;
import com.knowledge.base.document.feign.GraphFeignClient;
import com.knowledge.base.document.feign.KAGFeignClient;
import com.knowledge.base.document.feign.RagFeignClient;
import com.knowledge.base.document.feign.SearchIndexFeignClient;
import com.knowledge.base.document.support.DocumentSearchIndexPayloadBuilder;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * 索引型 Feign 应急触发（{@code document.indexing.mode=legacy-feign}）
 *
 * <p>正式路径为 MQ 事件；本类仅作回退，禁止与事件模式同时开启。</p>
 *
 * @author AI-RAG
 * @since 1.0.0
 * @deprecated 生产终态请使用 event 模式
 */
@Slf4j
@Component
@Deprecated
public class LegacyDocumentIndexFeignTrigger {

    @Resource
    private DocumentSearchIndexPayloadBuilder searchIndexPayloadBuilder;

    @Resource
    private RagFeignClient ragFeignClient;

    @Resource
    private KAGFeignClient kagFeignClient;

    @Resource
    private SearchIndexFeignClient searchIndexFeignClient;

    @Resource
    private GraphFeignClient graphFeignClient;

    /**
     * Feign 触发发布后索引副作用
     *
     * @param document 文档
     * @param content  正文
     */
    public void onPublished(Document document, String content) {
        Long docId = document.getId();
        feignRagReindex(docId);
        feignKagBuild(docId);
        feignSearchIndex(document, content);
    }

    /**
     * Feign 触发移除后索引副作用
     *
     * @param documentId 文档 ID
     */
    public void onRemoved(Long documentId) {
        feignRagDelete(documentId);
        feignKagDelete(documentId);
        feignGraphDelete(documentId);
        feignSearchDelete(documentId);
    }

    /**
     * Feign 触发图谱重建
     *
     * @param documentId 文档 ID
     */
    public void onGraphRebuild(Long documentId) {
        feignKagBuild(documentId);
    }

    private void feignRagReindex(Long docId) {
        try {
            ragFeignClient.reindexDocument(docId);
            log.info("[legacy-feign] RAG重建索引：documentId={}", docId);
        } catch (Exception e) {
            log.warn("[legacy-feign] RAG重建失败：documentId={}, error={}", docId, e.getMessage());
        }
    }

    private void feignRagDelete(Long docId) {
        try {
            ragFeignClient.removeFromIndex(docId);
            log.info("[legacy-feign] RAG删除索引：documentId={}", docId);
        } catch (Exception e) {
            log.warn("[legacy-feign] RAG删除失败：documentId={}, error={}", docId, e.getMessage());
        }
    }

    private void feignKagBuild(Long docId) {
        try {
            kagFeignClient.buildGraph(docId);
            log.info("[legacy-feign] KAG图谱构建：documentId={}", docId);
        } catch (Exception e) {
            log.warn("[legacy-feign] KAG构建失败：documentId={}, error={}", docId, e.getMessage());
        }
    }

    private void feignKagDelete(Long docId) {
        try {
            kagFeignClient.deleteGraph(docId);
            log.info("[legacy-feign] KAG图谱删除：documentId={}", docId);
        } catch (Exception e) {
            log.warn("[legacy-feign] KAG删除失败：documentId={}, error={}", docId, e.getMessage());
        }
    }

    private void feignGraphDelete(Long docId) {
        try {
            graphFeignClient.deleteDocumentGraph(docId);
            log.info("[legacy-feign] Neo4j图谱删除：documentId={}", docId);
        } catch (Exception e) {
            log.warn("[legacy-feign] Neo4j图谱删除失败：documentId={}, error={}", docId, e.getMessage());
        }
    }

    private void feignSearchIndex(Document document, String content) {
        try {
            Map<String, Object> docData = searchIndexPayloadBuilder.build(document, content);
            searchIndexFeignClient.indexDocument(docData);
            log.info("[legacy-feign] ES搜索索引：documentId={}", document.getId());
        } catch (Exception e) {
            log.warn("[legacy-feign] ES索引失败：documentId={}, error={}", document.getId(), e.getMessage());
        }
    }

    private void feignSearchDelete(Long docId) {
        try {
            searchIndexFeignClient.deleteDocumentIndex(docId);
            log.info("[legacy-feign] ES删除索引：documentId={}", docId);
        } catch (Exception e) {
            log.warn("[legacy-feign] ES删除失败：documentId={}, error={}", docId, e.getMessage());
        }
    }
}
