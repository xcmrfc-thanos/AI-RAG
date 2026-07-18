package com.knowledge.base.ai.config.localdev;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * LocalDevResponseSynthesizer 单元测试。
 */
class LocalDevResponseSynthesizerTest {

    /**
     * RAG Prompt 应合成带 [1] 引用的 stub 回答。
     */
    @Test
    void synthesizeFromRagPromptIncludesCitation() {
        String prompt = """
                你是一个企业知识库助手。
                === 参考资料 ===
                [1] 来源文档：测试文档
                E2EAccept body for chunk index.

                === 用户问题 ===
                请根据知识库简要说明：E2EAccept
                """;

        String answer = LocalDevResponseSynthesizer.synthesize(prompt);

        assertTrue(answer.contains("[1]"));
        assertTrue(answer.contains("E2EAccept"));
        assertTrue(answer.contains("chunk index"));
    }
}
