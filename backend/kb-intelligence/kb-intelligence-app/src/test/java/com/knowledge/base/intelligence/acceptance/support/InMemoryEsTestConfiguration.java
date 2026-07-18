package com.knowledge.base.intelligence.acceptance.support;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch.indices.ElasticsearchIndicesClient;
import co.elastic.clients.elasticsearch.indices.ExistsRequest;
import co.elastic.clients.transport.endpoints.BooleanResponse;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * 进程内 ES Mock 配置：配合 {@link InMemoryElasticsearchSupport} 运行双索引 E2E。
 */
@SpringBootConfiguration
@Import(DualIndexE2ETestConfiguration.class)
public class InMemoryEsTestConfiguration {

    /**
     * 内存索引存储。
     */
    @Bean
    InMemoryElasticsearchSupport inMemoryElasticsearchSupport() {
        return new InMemoryElasticsearchSupport();
    }

    /**
     * 替身 ElasticsearchClient。
     */
    @Bean
    @Primary
    ElasticsearchClient inMemoryElasticsearchClient(InMemoryElasticsearchSupport store) throws Exception {
        ElasticsearchClient client = mock(ElasticsearchClient.class);
        ElasticsearchIndicesClient indicesClient = mock(ElasticsearchIndicesClient.class);
        when(client.indices()).thenReturn(indicesClient);
        when(indicesClient.exists(any(ExistsRequest.class)))
                .thenReturn(new BooleanResponse(true));
        store.wireElasticsearchClient(client);
        return client;
    }

    /**
     * 替身 ElasticsearchOperations。
     */
    @Bean
    @Primary
    ElasticsearchOperations inMemoryElasticsearchOperations(InMemoryElasticsearchSupport store) {
        ElasticsearchOperations operations = mock(ElasticsearchOperations.class);
        store.wireElasticsearchOperations(operations);
        return operations;
    }
}
