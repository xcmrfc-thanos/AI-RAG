package com.knowledge.base.ai.mq;

import com.knowledge.base.ai.rag.kag.graph.GraphBuildService;
import com.knowledge.base.common.config.IntelligenceExecutorNames;
import com.rabbitmq.client.Channel;
import jakarta.annotation.Resource;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Component;

import java.util.concurrent.CompletableFuture;

/**
 * KAG 图谱构建消费者
 *
 * <p>监听 KAG 队列，在独立图谱线程池中执行构建，避免阻塞 RAG/搜索异步任务。</p>
 *
 * @author 苏三
 * @since 1.0.0
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class KAGReindexConsumer {

    private final GraphBuildService graphBuildService;

    @Resource(name = IntelligenceExecutorNames.GRAPH)
    private ThreadPoolTaskExecutor graphTaskExecutor;

    /**
     * 消费 KAG 图谱构建消息并在 graph 线程池执行。
     */
    /**
     * handleBuild 方法。
     */
    @RabbitListener(queues = "#{@kagGraphBuildQueue.name}", ackMode = "MANUAL")
    public void handleBuild(@Payload KAGReindexMessage message, Channel channel,
                            @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) {
        try {
            log.info("KAG build task received: taskId={}, type={}", message.getTaskId(), message.getType());
            CompletableFuture.runAsync(() -> executeBuild(message), graphTaskExecutor).join();
            channel.basicAck(deliveryTag, false);
            log.info("KAG build task completed: taskId={}", message.getTaskId());
        } catch (Exception e) {
            log.error("KAG build task failed: taskId={}, error={}", message.getTaskId(), e.getMessage(), e);
            try {
                channel.basicNack(deliveryTag, false, false);
            } catch (Exception ex) {
                log.error("Failed to nack KAG message", ex);
            }
        }
    }

    /**
     * 按消息类型执行图谱构建或删除。
     */
    private void executeBuild(KAGReindexMessage message) {
        switch (message.getType()) {
            case DELETE_BY_DOC_IDS -> {
                if (message.getDocumentIds() != null) {
                    for (Long docId : message.getDocumentIds()) {
                        graphBuildService.deleteForDocument(docId);
                        log.info("KAG graph deleted for documentId={}", docId);
                    }
                }
            }
            case BUILD_BY_DOC_IDS -> {
                if (message.getDocumentIds() != null) {
                    graphBuildService.buildBatch(message.getDocumentIds());
                }
            }
            case BUILD_ALL -> graphBuildService.buildAll();
        }
    }
}
