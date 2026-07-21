package com.knowledge.base.ai.rag.rerank;

import com.knowledge.base.ai.vo.RagSearchResultVO;
import org.springframework.util.StringUtils;

/**
 * 重排文档文本组装：标题 + 正文，避免仅看 chunk 正文导致标题全匹配被压低。
 *
 * @author knowledge-base-team
 * @since 1.0.0
 */
public final class RerankDocumentText {

    private RerankDocumentText() {
    }

    /**
     * 组装送入重排模型的文档文本。
     *
     * @param candidate 检索候选
     * @return 含标题前缀的文本；无标题时仅正文
     */
    public static String compose(RagSearchResultVO candidate) {
        if (candidate == null) {
            return "";
        }
        String content = candidate.getContent() != null ? candidate.getContent() : "";
        String title = candidate.getDocumentTitle();
        if (!StringUtils.hasText(title)) {
            return content;
        }
        return "标题：" + title.trim() + "\n" + content;
    }

    /**
     * 截断过长重排文本。
     *
     * @param text   原文
     * @param maxLen 最大长度
     * @return 截断结果
     */
    public static String truncate(String text, int maxLen) {
        if (text == null) {
            return "";
        }
        if (maxLen <= 0 || text.length() <= maxLen) {
            return text;
        }
        return text.substring(0, maxLen);
    }
}
