package com.knowledge.base.ai.rag.retriever.milvus;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 确保 Milvus 关键词腿源码不再包含 VARCHAR like。
 */
class MilvusKeywordRetrieverNoLikeTest {

    /**
     * 源文件不得再出现 content like 路径。
     *
     * @throws Exception IO
     */
    @Test
    void sourceMustNotContainLikeExpr() throws Exception {
        Path src = Path.of("src/main/java/com/knowledge/base/ai/rag/retriever/milvus/MilvusKeywordRetriever.java");
        assertTrue(Files.exists(src), "源文件应存在: " + src.toAbsolutePath());
        String text = Files.readString(src, StandardCharsets.UTF_8).toLowerCase();
        assertFalse(text.contains("content like"), "禁止 content like");
        assertFalse(text.contains("document_title like"), "禁止 document_title like");
        assertTrue(text.contains("sparse"), "应使用 sparse 检索");
    }
}
