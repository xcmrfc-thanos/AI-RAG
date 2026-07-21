package com.knowledge.base.ai.config;

import io.qdrant.client.QdrantClient;
import io.qdrant.client.QdrantGrpcClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

/**
 * Qdrant 客户端装配（es-qdrant / qdrant-qdrant；显式 es-es / es-milvus / milvus-milvus 时不装配）。
 */
@Slf4j
@Configuration
@ConditionalOnExpression("${rag.qdrant.enabled:false} "
        + "&& !'${rag.retrieval.profile:}'.equalsIgnoreCase('es-es') "
        + "&& !'${rag.retrieval.profile:}'.equalsIgnoreCase('es-milvus') "
        + "&& !'${rag.retrieval.profile:}'.equalsIgnoreCase('milvus-milvus')")
public class QdrantConfig {

    /**
     * 创建 Qdrant gRPC 客户端
     *
     * @param ragProperties RAG 配置
     * @return QdrantClient
     */
    @Bean(destroyMethod = "close")
    public QdrantClient qdrantClient(RagProperties ragProperties) {
        RagProperties.Qdrant qdrant = ragProperties.getQdrant();
        QdrantGrpcClient.Builder builder = QdrantGrpcClient.newBuilder(qdrant.getHost(), qdrant.getPort(), false);
        if (StringUtils.hasText(qdrant.getApiKey())) {
            builder.withApiKey(qdrant.getApiKey());
        }
        log.info("初始化 Qdrant 客户端：host={}, port={}, collection={}",
                qdrant.getHost(), qdrant.getPort(), qdrant.getCollection());
        return new QdrantClient(builder.build());
    }
}
