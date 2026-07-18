package com.knowledge.base.document.service.impl;

import com.knowledge.base.document.config.DocumentIndexingProperties;
import com.knowledge.base.document.entity.Document;
import com.knowledge.base.document.event.DocumentLifecycleEventPublisher;
import com.knowledge.base.document.feign.GraphFeignClient;
import com.knowledge.base.document.feign.KAGFeignClient;
import com.knowledge.base.document.feign.RagFeignClient;
import com.knowledge.base.document.feign.SearchIndexFeignClient;
import com.knowledge.base.document.service.DocumentIndexingTriggerService;
import com.knowledge.base.document.support.DocumentSearchIndexPayloadBuilder;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * 文档索引副作用触发服务实现
 *
 * <p>Phase 0：事件驱动为主，Feign 可选兜底。</p>
 *
 * @author knowledge-base-team
 * @since 1.0.0
 */
@Slf4j
@Service
public class DocumentIndexingTriggerServiceImpl implements DocumentIndexingTriggerService {

    @Resource
    private DocumentIndexingProperties indexingProperties;

    @Resource
    private DocumentLifecycleEventPublisher lifecycleEventPublisher;

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

    @Resource
    private ThreadPoolTaskExecutor asyncTaskExecutor;

    /** {@inheritDoc} */
    @Override
    public void onPublished(Document document, String content) {
        CompletableFuture.runAsync(() -> {
            if (indexingProperties.isEventEnabled()) {
                try {
                    lifecycleEventPublisher.publishPublished(document, content);
                } catch (Exception e) {
                    log.warn("发布文档 PUBLISHED 事件失败：documentId={}, error={}",
                            document.getId(), e.getMessage());
                }
            }
            if (indexingProperties.isFeignFallbackEnabled()) {
                feignPublished(document, content);
            }
        }, asyncTaskExecutor);
    }

    /** {@inheritDoc} */
    @Override
    public void onRemoved(Long documentId, String title) {
        CompletableFuture.runAsync(() -> {
            if (indexingProperties.isEventEnabled()) {
                try {
                    lifecycleEventPublisher.publishRemoved(documentId, title);
                } catch (Exception e) {
                    log.warn("发布文档 REMOVED 事件失败：documentId={}, error={}",
                            documentId, e.getMessage());
                }
            }
            if (indexingProperties.isFeignFallbackEnabled()) {
                feignRemoved(documentId);
            }
        }, asyncTaskExecutor);
    }

    /** {@inheritDoc} */
    @Override
    public void onGraphRebuild(Long documentId, String title) {
        CompletableFuture.runAsync(() -> {
            if (indexingProperties.isEventEnabled()) {
                try {
                    lifecycleEventPublisher.publishGraphRebuild(documentId, title);
                } catch (Exception e) {
                    log.warn("发布文档 GRAPH_REBUILD 事件失败：documentId={}, error={}",
                            documentId, e.getMessage());
                }
            }
            if (indexingProperties.isFeignFallbackEnabled()) {
                feignKagBuild(documentId);
            }
        }, asyncTaskExecutor);
    }

    private void feignPublished(Document document, String content) {
        Long docId = document.getId();
        feignRagReindex(docId);
        feignKagBuild(docId);
        feignSearchIndex(document, content);
    }

    private void feignRemoved(Long documentId) {
        feignRagDelete(documentId);
        feignKagDelete(documentId);
        feignGraphDelete(documentId);
        feignSearchDelete(documentId);
    }

    private void feignRagReindex(Long docId) {
        try {
            ragFeignClient.reindexDocument(docId);
            log.info("[Feign兜底] 已触发RAG重建索引：documentId={}", docId);
        } catch (Exception e) {
            log.warn("[Feign兜底] RAG重建失败：documentId={}, error={}", docId, e.getMessage());
        }
    }

    private void feignRagDelete(Long docId) {
        try {
            ragFeignClient.removeFromIndex(docId);
            log.info("[Feign兜底] 已触发RAG删除索引：documentId={}", docId);
        } catch (Exception e) {
            log.warn("[Feign兜底] RAG删除失败：documentId={}, error={}", docId, e.getMessage());
        }
    }

    private void feignKagBuild(Long docId) {
        try {
            kagFeignClient.buildGraph(docId);
            log.info("[Feign兜底] 已触发KAG图谱构建：documentId={}", docId);
        } catch (Exception e) {
            log.warn("[Feign兜底] KAG构建失败：documentId={}, error={}", docId, e.getMessage());
        }
    }

    private void feignKagDelete(Long docId) {
        try {
            kagFeignClient.deleteGraph(docId);
            log.info("[Feign兜底] 已触发KAG图谱删除：documentId={}", docId);
        } catch (Exception e) {
            log.warn("[Feign兜底] KAG删除失败：documentId={}, error={}", docId, e.getMessage());
        }
    }

    private void feignGraphDelete(Long docId) {
        try {
            graphFeignClient.deleteDocumentGraph(docId);
            log.info("[Feign兜底] 已触发Neo4j图谱删除：documentId={}", docId);
        } catch (Exception e) {
            log.warn("[Feign兜底] Neo4j图谱删除失败：documentId={}, error={}", docId, e.getMessage());
        }
    }

    private void feignSearchIndex(Document document, String content) {
        try {
            Map<String, Object> docData = searchIndexPayloadBuilder.build(document, content);
            searchIndexFeignClient.indexDocument(docData);
            log.info("[Feign兜底] 已同步ES搜索索引：documentId={}", document.getId());
        } catch (Exception e) {
            log.warn("[Feign兜底] ES索引失败：documentId={}, error={}", document.getId(), e.getMessage());
        }
    }

    private void feignSearchDelete(Long docId) {
        try {
            searchIndexFeignClient.deleteDocumentIndex(docId);
            log.info("[Feign兜底] 已从ES搜索索引删除：documentId={}", docId);
        } catch (Exception e) {
            log.warn("[Feign兜底] ES删除失败：documentId={}, error={}", docId, e.getMessage());
        }
    }
}
