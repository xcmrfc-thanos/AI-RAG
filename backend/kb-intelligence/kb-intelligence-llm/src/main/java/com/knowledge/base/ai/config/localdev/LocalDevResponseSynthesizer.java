package com.knowledge.base.ai.config.localdev;

/**
 * 本地开发 Stub 回答合成器：无 LLM Key 时基于 RAG 参考资料生成带引用编号的回答。
 *
 * @author 苏三
 * @since 1.0.0
 */
public final class LocalDevResponseSynthesizer {

    private static final String REF_MARKER = "=== 参考资料 ===";
    private static final String QUERY_MARKER = "=== 用户问题 ===";

    private LocalDevResponseSynthesizer() {
    }

    /**
     * 基于 RAG Prompt 或纯文本生成本地 stub 回答。
     */
    public static String synthesize(String prompt) {
        if (prompt == null || prompt.isBlank()) {
            return "【本地开发模式】暂无可用回答。";
        }
        if (prompt.contains(REF_MARKER)) {
            return synthesizeFromRagPrompt(prompt);
        }
        return "【本地开发模式】" + prompt.trim();
    }

    /**
     * 从 RAG Prompt 中提取首条参考资料与用户问题，合成带 [1] 引用的回答。
     */
    private static String synthesizeFromRagPrompt(String prompt) {
        String query = extractSection(prompt, QUERY_MARKER);
        if (query.isBlank()) {
            query = "您的问题";
        }

        String excerpt = extractFirstReferenceExcerpt(prompt);
        if (excerpt.isBlank()) {
            return "根据知识库检索，暂未找到足够相关的参考资料来回答：" + query.trim();
        }
        if (excerpt.length() > 280) {
            excerpt = excerpt.substring(0, 280) + "...";
        }

        return String.format(
                "根据知识库参考资料，针对「%s」的简要说明如下：%s [1]",
                query.trim(),
                excerpt);
    }

    /**
     * 提取 [1] 参考资料正文（跳过标题行）。
     */
    private static String extractFirstReferenceExcerpt(String prompt) {
        int refStart = prompt.indexOf(REF_MARKER);
        if (refStart < 0) {
            return "";
        }
        int firstRef = prompt.indexOf("[1]", refStart);
        if (firstRef < 0) {
            return "";
        }
        int lineBreak = prompt.indexOf('\n', firstRef);
        if (lineBreak < 0) {
            return "";
        }
        int end = prompt.indexOf("\n\n", lineBreak);
        if (end < 0) {
            int queryIdx = prompt.indexOf(QUERY_MARKER, lineBreak);
            end = queryIdx > 0 ? queryIdx : prompt.length();
        }
        return prompt.substring(lineBreak + 1, end).trim();
    }

    /**
     * 提取指定标记后的文本段落。
     */
    private static String extractSection(String prompt, String marker) {
        int idx = prompt.indexOf(marker);
        if (idx < 0) {
            return "";
        }
        return prompt.substring(idx + marker.length()).trim();
    }
}
