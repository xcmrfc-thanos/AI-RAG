package com.knowledge.base.ai.rag.support;

import com.knowledge.base.ai.vo.CitationVO;
import com.knowledge.base.ai.vo.RagSearchResultVO;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * RAG 接地辅助单测：短主题改写与拒答清引用
 *
 * @author AI-RAG
 * @since 1.0.0
 */
class RagGroundingSupportTest {

    /**
     * 短主题应改写为「介绍要点」问法
     */
    @Test
    void resolveEffectiveQueryRewritesTopic() {
        String effective = RagGroundingSupport.resolveEffectiveQuery("React 18");
        assertTrue(effective.contains("React 18"));
        assertTrue(effective.contains("简要介绍"));
        assertTrue(RagGroundingSupport.isTopicLikeQuery("React 18"));
    }

    /**
     * 明确问句不改写
     */
    @Test
    void resolveEffectiveQueryKeepsQuestion() {
        String q = "React 18 有哪些核心特性？";
        assertEquals(q, RagGroundingSupport.resolveEffectiveQuery(q));
        assertFalse(RagGroundingSupport.isTopicLikeQuery(q));
    }

    /**
     * 含「介绍」意图的短句不改写
     */
    @Test
    void resolveEffectiveQueryKeepsIntroIntent() {
        String q = "请介绍 React 18";
        assertEquals(q, RagGroundingSupport.resolveEffectiveQuery(q));
        assertFalse(RagGroundingSupport.isTopicLikeQuery(q));
    }

    /**
     * 拒答时引用列表为空
     */
    @Test
    void buildCitationsClearsOnRefusal() {
        List<RagSearchResultVO> context = List.of(chunk(1L, "标题A", "正文A"));
        List<CitationVO> citations = RagGroundingSupport.buildCitationsForAnswer(
                context, RagGroundingSupport.REFUSAL_PHRASE);
        assertTrue(citations.isEmpty());
    }

    /**
     * 回答含 [1] 时只保留对应引用
     */
    @Test
    void buildCitationsKeepsMentionedOnly() {
        List<RagSearchResultVO> context = List.of(
                chunk(1L, "标题A", "正文A"),
                chunk(2L, "标题B", "正文B"));
        List<CitationVO> citations = RagGroundingSupport.buildCitationsForAnswer(
                context, "根据资料 [1] 可知……");
        assertEquals(1, citations.size());
        assertEquals(1, citations.get(0).getIndex());
        assertEquals("标题A", citations.get(0).getDocumentTitle());
    }

    /**
     * 正常回答未标编号时保留全部命中
     */
    @Test
    void buildCitationsKeepsAllWhenNoMarkers() {
        List<RagSearchResultVO> context = List.of(
                chunk(1L, "标题A", "正文A"),
                chunk(2L, "标题B", "正文B"));
        List<CitationVO> citations = RagGroundingSupport.buildCitationsForAnswer(
                context, "以下是根据知识库的总结。");
        assertEquals(2, citations.size());
    }

    /**
     * 构造测试用检索结果
     */
    private static RagSearchResultVO chunk(Long docId, String title, String content) {
        return RagSearchResultVO.builder()
                .documentId(docId)
                .documentTitle(title)
                .content(content)
                .score(0.9)
                .build();
    }
}
