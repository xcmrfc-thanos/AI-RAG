package com.knowledge.base.common.elasticsearch;

import com.alibaba.fastjson2.JSONObject;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.util.StreamUtils;

import java.io.IOException;
import java.io.InputStream;
import java.io.StringReader;
import java.nio.charset.StandardCharsets;

/**
 * Elasticsearch 索引定义加载器（P1-5c）
 *
 * <p>从 classpath {@code elasticsearch/*.json} 读取索引 settings + mappings，
 * 与 {@code backend/sql/es/} 保持内容同步，供 Java createIndex 与运维脚本单源对齐。</p>
 *
 * @author 苏三
 * @since 1.0.0
 */
@Slf4j
public final class ElasticsearchIndexDefinitionLoader {

    /** 文档级 BM25 索引定义 */
    public static final String DOCUMENT_INDEX_RESOURCE = "elasticsearch/kb_document_index.json";

    /** 分块向量索引定义 */
    public static final String CHUNK_INDEX_RESOURCE = "elasticsearch/kb_chunk_index.json";

    private ElasticsearchIndexDefinitionLoader() {
    }

    /**
     * 加载文档索引 JSON 正文（settings + mappings）
     *
     * @return ES create index 请求体 JSON 字符串
     */
    public static String loadDocumentIndexBody() {
        return loadDocumentIndexBody(true);
    }

    /**
     * 加载文档索引 JSON，可按运行时环境回落 standard 分词
     *
     * @param useIkAnalyzer true 保留 ik 分词；false 替换为 standard（与 rebuild-es-indices.ps1 一致）
     * @return ES create index 请求体 JSON 字符串
     */
    public static String loadDocumentIndexBody(boolean useIkAnalyzer) {
        return adaptAnalyzers(loadRawJson(DOCUMENT_INDEX_RESOURCE), useIkAnalyzer);
    }

    /**
     * 加载分块索引 JSON 正文，并按运行时 embedding 维度覆盖 {@code embedding.dims}
     *
     * @param embeddingDimension 向量维度，与 {@code rag.embedding.dimension} 一致
     * @return ES create index 请求体 JSON 字符串
     */
    public static String loadChunkIndexBody(int embeddingDimension) {
        return loadChunkIndexBody(embeddingDimension, true);
    }

    /**
     * 加载分块索引 JSON，并按 embedding 维度与分词策略生成 create index 请求体
     *
     * @param embeddingDimension 向量维度
     * @param useIkAnalyzer        是否保留 IK 分词
     * @return ES create index 请求体 JSON 字符串
     */
    public static String loadChunkIndexBody(int embeddingDimension, boolean useIkAnalyzer) {
        String raw = adaptAnalyzers(loadRawJson(CHUNK_INDEX_RESOURCE), useIkAnalyzer);
        JSONObject root = JSONObject.parseObject(raw);
        JSONObject embedding = root.getJSONObject("mappings")
                .getJSONObject("properties")
                .getJSONObject("embedding");
        if (embedding != null) {
            embedding.put("dims", embeddingDimension);
        }
        return root.toJSONString();
    }

    /**
     * 无 IK 插件时将 ik_max_word / ik_smart 替换为 standard，避免 createIndex 失败
     *
     * @param indexJson     原始索引 JSON
     * @param useIkAnalyzer 是否保留 IK 分词
     * @return 适配后的 JSON
     */
    public static String adaptAnalyzers(String indexJson, boolean useIkAnalyzer) {
        if (useIkAnalyzer || indexJson == null) {
            return indexJson;
        }
        return indexJson
                .replace("ik_max_word", "standard")
                .replace("ik_smart", "standard");
    }

    /**
     * 将 JSON 正文转为 {@link StringReader}，供 ES Java Client {@code withJson} 使用
     *
     * @param indexBody create index 请求体 JSON
     * @return StringReader 实例
     */
    public static StringReader toReader(String indexBody) {
        return new StringReader(indexBody);
    }

    /**
     * 从 classpath 读取 JSON 文件内容
     *
     * @param classpathResource 资源路径，如 {@code elasticsearch/kb_chunk_index.json}
     * @return 文件 UTF-8 文本
     */
    private static String loadRawJson(String classpathResource) {
        ClassPathResource resource = new ClassPathResource(classpathResource);
        try (InputStream in = resource.getInputStream()) {
            return StreamUtils.copyToString(in, StandardCharsets.UTF_8);
        } catch (IOException e) {
            log.error("加载 ES 索引定义失败：resource={}", classpathResource, e);
            throw new IllegalStateException("无法加载 ES 索引定义：" + classpathResource, e);
        }
    }
}
