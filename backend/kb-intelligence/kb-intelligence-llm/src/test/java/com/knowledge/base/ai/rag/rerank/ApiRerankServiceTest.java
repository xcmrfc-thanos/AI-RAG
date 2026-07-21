package com.knowledge.base.ai.rag.rerank;

import com.knowledge.base.ai.vo.RagSearchResultVO;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * {@link ApiRerankService} / {@link RerankDocumentText} 单测。
 */
class ApiRerankServiceTest {

    @Test
    void parseAndApplySiliconflowStyleResults() throws Exception {
        String json = """
                {"results":[
                  {"index":1,"relevance_score":0.9},
                  {"index":0,"relevance_score":0.2}
                ]}
                """;
        List<ApiRerankService.ScoredIndex> scored = ApiRerankService.parseResults(json);
        assertEquals(2, scored.size());
        assertEquals(1, scored.get(0).index());

        List<RagSearchResultVO> candidates = List.of(
                RagSearchResultVO.builder().chunkId("a").content("aaa").score(0.1).build(),
                RagSearchResultVO.builder().chunkId("b").content("bbb").score(0.1).build()
        );
        List<RagSearchResultVO> out = ApiRerankService.applyScores(candidates, scored, 2);
        assertEquals("b", out.get(0).getChunkId());
        assertEquals(0.9, out.get(0).getRerankScore());
        assertEquals("a", out.get(1).getChunkId());
    }

    @Test
    void parseDashScopeNestedOutput() throws Exception {
        String json = """
                {"output":{"results":[{"index":0,"relevance_score":0.88}]}}
                """;
        List<ApiRerankService.ScoredIndex> scored = ApiRerankService.parseResults(json);
        assertEquals(1, scored.size());
        assertEquals(0.88, scored.get(0).score());
    }

    @Test
    void composeRerankDocumentPrefersTitlePlusContent() {
        RagSearchResultVO vo = RagSearchResultVO.builder()
                .documentTitle("React 18 + TypeScript 最佳实践")
                .content("const App = () => null;")
                .build();
        String text = RerankDocumentText.compose(vo);
        assertTrue(text.startsWith("标题：React 18 + TypeScript 最佳实践"));
        assertTrue(text.contains("const App"));
    }
}
