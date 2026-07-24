package com.knowledge.base.document.service.impl;

import com.knowledge.base.document.config.DocumentIndexingProperties;
import com.knowledge.base.document.entity.Document;
import com.knowledge.base.document.event.DocumentLifecycleEventPublisher;
import com.knowledge.base.document.legacy.LegacyDocumentIndexFeignTrigger;
import com.knowledge.base.document.service.DocumentIndexingTriggerService;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Service;

import java.util.concurrent.CompletableFuture;

/**
 * 文档索引副作用触发服务实现
 *
 * <p>按 {@code document.indexing.mode} 单选：event / legacy-feign / disabled。</p>
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
    private LegacyDocumentIndexFeignTrigger legacyFeignTrigger;

    @Resource
    private ThreadPoolTaskExecutor asyncTaskExecutor;

    /** {@inheritDoc} */
    /**
     * onPublished 方法。
     */
    @Override
    public void onPublished(Document document, String content) {
        CompletableFuture.runAsync(() -> {
            if (indexingProperties.isEventMode()) {
                try {
                    lifecycleEventPublisher.publishPublished(document, content);
                } catch (Exception e) {
                    log.error("INDEXING_PUBLISH_FAILED action=published documentId={} error={}",
                            document.getId(), e.getMessage());
                }
            } else if (indexingProperties.isLegacyFeignMode()) {
                legacyFeignTrigger.onPublished(document, content);
            }
        }, asyncTaskExecutor);
    }

    /** {@inheritDoc} */
    /**
     * onRemoved 方法。
     */
    @Override
    public void onRemoved(Long documentId, String title) {
        CompletableFuture.runAsync(() -> {
            if (indexingProperties.isEventMode()) {
                try {
                    lifecycleEventPublisher.publishRemoved(documentId, title);
                } catch (Exception e) {
                    log.error("INDEXING_PUBLISH_FAILED action=removed documentId={} error={}",
                            documentId, e.getMessage());
                }
            } else if (indexingProperties.isLegacyFeignMode()) {
                legacyFeignTrigger.onRemoved(documentId);
            }
        }, asyncTaskExecutor);
    }

    /** {@inheritDoc} */
    /**
     * onGraphRebuild 方法。
     */
    @Override
    public void onGraphRebuild(Long documentId, String title) {
        CompletableFuture.runAsync(() -> {
            if (indexingProperties.isEventMode()) {
                try {
                    lifecycleEventPublisher.publishGraphRebuild(documentId, title);
                } catch (Exception e) {
                    log.error("INDEXING_PUBLISH_FAILED action=graph_rebuild documentId={} error={}",
                            documentId, e.getMessage());
                }
            } else if (indexingProperties.isLegacyFeignMode()) {
                legacyFeignTrigger.onGraphRebuild(documentId);
            }
        }, asyncTaskExecutor);
    }
}
