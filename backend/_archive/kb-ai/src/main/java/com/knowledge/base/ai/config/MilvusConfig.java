package com.knowledge.base.ai.config;

import com.knowledge.base.common.config.SystemConfigCache;
import io.milvus.client.MilvusServiceClient;
import io.milvus.param.ConnectParam;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

/**
 * Milvus 向量数据库配置
 *
 * <p>当 {@code rag.vector-store=milvus} 时启用，连接参数优先读取 SystemConfigCache 中的 milvus.host/port。</p>
 *
 * @author knowledge-base-team
 * @since 1.0.0
 */
@Slf4j
@Configuration
@ConditionalOnProperty(name = "rag.vector-store", havingValue = "milvus")
public class MilvusConfig {

    /**
     * 创建 Milvus 客户端
     *
     * @param ragProperties      RAG 配置
     * @param systemConfigCache  系统配置缓存（可选）
     * @return MilvusServiceClient
     */
    @Bean(destroyMethod = "close")
    public MilvusServiceClient milvusServiceClient(RagProperties ragProperties,
                                                  @Autowired(required = false) SystemConfigCache systemConfigCache) {
        RagProperties.Milvus milvus = ragProperties.getMilvus();
        String host = milvus.getHost();
        int port = milvus.getPort();

        if (systemConfigCache != null) {
            host = systemConfigCache.getConfig("milvus.host", host);
            String portValue = systemConfigCache.getConfig("milvus.port");
            if (portValue != null && !portValue.isBlank()) {
                port = Integer.parseInt(portValue);
            }
        }

        log.info("初始化 Milvus 客户端：host={}, port={}, database={}, collection={}",
                host, port, milvus.getDatabase(), milvus.getCollection());

        ConnectParam connectParam = ConnectParam.newBuilder()
                .withHost(host)
                .withPort(port)
                .withDatabaseName(milvus.getDatabase())
                .withConnectTimeout(milvus.getConnectTimeoutMs(), TimeUnit.MILLISECONDS)
                .build();
        return new MilvusServiceClient(connectParam);
    }
}
