package com.knowledge.base.ai.mq;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ReindexConsumerTest {

    @Test
    void resolveIndexableContentFallsBackToSummary() {
        String content = ReindexConsumer.resolveIndexableContent(
                "Golden title", "Golden summary", null);

        assertEquals("Golden summary", content);
    }
}
