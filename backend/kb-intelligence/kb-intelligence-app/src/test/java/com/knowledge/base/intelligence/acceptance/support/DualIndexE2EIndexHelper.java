package com.knowledge.base.intelligence.acceptance.support;

import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch._types.ElasticsearchException;
import co.elastic.clients.elasticsearch.indices.CreateIndexRequest;
import co.elastic.clients.elasticsearch.indices.DeleteIndexRequest;
import co.elastic.clients.elasticsearch.indices.ExistsRequest;

import java.io.StringReader;

/**
 * E2E 测试用 ES 双索引初始化（标准分词器，不依赖 IK 插件）。
 */
public final class DualIndexE2EIndexHelper {

    public static final String DOCUMENT_INDEX = "kb_document";
    public static final String CHUNK_INDEX = "kb_chunk";

    private DualIndexE2EIndexHelper() {
    }

    /**
     * 删除并重建 kb_document / kb_chunk 测试索引。
     *
     * @param esClient           ES 客户端
     * @param embeddingDimension 向量维度
     */
    public static void recreateIndexes(ElasticsearchClient esClient, int embeddingDimension) {
        dropIfExists(esClient, DOCUMENT_INDEX);
        dropIfExists(esClient, CHUNK_INDEX);
        createDocumentIndex(esClient);
        createChunkIndex(esClient, embeddingDimension);
        refresh(esClient, DOCUMENT_INDEX, CHUNK_INDEX);
    }

    /**
     * 刷新索引使写入立即可搜。
     *
     * @param esClient ES 客户端
     * @param indexes  索引名
     */
    public static void refresh(ElasticsearchClient esClient, String... indexes) {
        try {
            esClient.indices().refresh(r -> r.index(java.util.Arrays.asList(indexes)));
        } catch (Exception ignored) {
            // 测试环境刷新失败不阻断
        }
    }

    private static void dropIfExists(ElasticsearchClient esClient, String index) {
        try {
            if (esClient.indices().exists(ExistsRequest.of(e -> e.index(index))).value()) {
                esClient.indices().delete(DeleteIndexRequest.of(d -> d.index(index)));
            }
        } catch (Exception ignored) {
            // 忽略删除失败
        }
    }

    private static void createDocumentIndex(ElasticsearchClient esClient) {
        String body = """
                {
                  "settings": {
                    "number_of_shards": 1,
                    "number_of_replicas": 0,
                    "refresh_interval": "1s"
                  },
                  "mappings": {
                    "properties": {
                      "title": {
                        "type": "text",
                        "fields": {
                          "standard": { "type": "text", "analyzer": "standard" },
                          "keyword": { "type": "keyword" }
                        }
                      },
                      "summary": {
                        "type": "text",
                        "fields": {
                          "standard": { "type": "text", "analyzer": "standard" }
                        }
                      },
                      "tagNames": {
                        "type": "keyword",
                        "fields": {
                          "text": { "type": "text", "analyzer": "standard" }
                        }
                      },
                      "categoryId": { "type": "long" },
                      "docStatus": { "type": "integer" }
                    }
                  }
                }
                """;
        createIndex(esClient, DOCUMENT_INDEX, body);
    }

    private static void createChunkIndex(ElasticsearchClient esClient, int embeddingDimension) {
        String body = """
                {
                  "settings": {
                    "number_of_shards": 1,
                    "number_of_replicas": 0,
                    "refresh_interval": "1s"
                  },
                  "mappings": {
                    "properties": {
                      "chunk_id": { "type": "keyword" },
                      "document_id": { "type": "long" },
                      "document_title": {
                        "type": "text",
                        "fields": {
                          "standard": { "type": "text", "analyzer": "standard" },
                          "keyword": { "type": "keyword" }
                        }
                      },
                      "content": {
                        "type": "text",
                        "fields": {
                          "standard": { "type": "text", "analyzer": "standard" },
                          "keyword": { "type": "keyword" }
                        }
                      },
                      "heading": { "type": "keyword" },
                      "chunk_index": { "type": "integer" },
                      "total_chunks": { "type": "integer" },
                      "category_id": { "type": "long" },
                      "author_id": { "type": "long" },
                      "team_id": { "type": "long" },
                      "doc_status": { "type": "integer" },
                      "publish_time": { "type": "date" },
                      "indexed_at": { "type": "date" },
                      "embedding": {
                        "type": "dense_vector",
                        "dims": %d,
                        "index": true,
                        "similarity": "cosine"
                      }
                    }
                  }
                }
                """.formatted(embeddingDimension);
        createIndex(esClient, CHUNK_INDEX, body);
    }

    private static void createIndex(ElasticsearchClient esClient, String index, String body) {
        try {
            CreateIndexRequest request = CreateIndexRequest.of(c -> c
                    .index(index)
                    .withJson(new StringReader(body)));
            esClient.indices().create(request);
        } catch (ElasticsearchException e) {
            if (e.getMessage() == null || !e.getMessage().contains("resource_already_exists_exception")) {
                throw e;
            }
        } catch (Exception e) {
            throw new IllegalStateException("创建 ES 测试索引失败：" + index, e);
        }
    }
}
