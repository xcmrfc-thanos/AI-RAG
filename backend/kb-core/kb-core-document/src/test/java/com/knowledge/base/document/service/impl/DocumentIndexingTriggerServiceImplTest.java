package com.knowledge.base.document.service.impl;

import com.knowledge.base.document.config.DocumentIndexingMode;
import com.knowledge.base.document.config.DocumentIndexingProperties;
import com.knowledge.base.document.entity.Document;
import com.knowledge.base.document.event.DocumentLifecycleEventPublisher;
import com.knowledge.base.document.legacy.LegacyDocumentIndexFeignTrigger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.test.util.ReflectionTestUtils;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/**
 * DocumentIndexingTriggerServiceImpl 模式单选定向单测。
 */
class DocumentIndexingTriggerServiceImplTest {

    private DocumentIndexingProperties properties;
    private DocumentLifecycleEventPublisher publisher;
    private LegacyDocumentIndexFeignTrigger legacy;
    private DocumentIndexingTriggerServiceImpl service;

    /**
     * 使用同步执行器，避免异步等待
     */
    @BeforeEach
    void setUp() {
        properties = new DocumentIndexingProperties();
        publisher = mock(DocumentLifecycleEventPublisher.class);
        legacy = mock(LegacyDocumentIndexFeignTrigger.class);
        service = new DocumentIndexingTriggerServiceImpl();
        ReflectionTestUtils.setField(service, "indexingProperties", properties);
        ReflectionTestUtils.setField(service, "lifecycleEventPublisher", publisher);
        ReflectionTestUtils.setField(service, "legacyFeignTrigger", legacy);

        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor() {
            @Override
            public void execute(Runnable task) {
                task.run();
            }
        };
        ReflectionTestUtils.setField(service, "asyncTaskExecutor", executor);
    }

    /**
     * event 模式只发 MQ，不走 Feign
     */
    @Test
    void eventModePublishesOnly() {
        properties.setMode(DocumentIndexingMode.EVENT);
        Document doc = new Document();
        doc.setId(1L);
        doc.setTitle("t");

        service.onPublished(doc, "body");

        verify(publisher).publishPublished(doc, "body");
        verify(legacy, never()).onPublished(any(), anyString());
    }

    /**
     * legacy-feign 模式只走 Feign，不发 MQ
     */
    @Test
    void legacyFeignModeUsesFeignOnly() {
        properties.setMode(DocumentIndexingMode.LEGACY_FEIGN);
        Document doc = new Document();
        doc.setId(2L);

        service.onPublished(doc, "body");

        verify(legacy).onPublished(doc, "body");
        verify(publisher, never()).publishPublished(any(), anyString());
    }

    /**
     * disabled 模式两者都不执行
     */
    @Test
    void disabledModeNoSideEffects() {
        properties.setMode(DocumentIndexingMode.DISABLED);

        service.onRemoved(9L, "t");

        verify(publisher, never()).publishRemoved(anyLong(), anyString());
        verify(legacy, never()).onRemoved(anyLong());
    }
}
