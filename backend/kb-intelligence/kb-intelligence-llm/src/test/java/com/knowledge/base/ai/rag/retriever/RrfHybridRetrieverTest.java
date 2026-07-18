package com.knowledge.base.ai.rag.retriever;

import com.knowledge.base.ai.config.RagProperties;
import com.knowledge.base.ai.rag.support.HybridSearchFusion;
import com.knowledge.base.ai.vo.RagSearchResultVO;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * RrfHybridRetriever 编排单测
 */
@ExtendWith(MockitoExtension.class)
class RrfHybridRetrieverTest {

    @Mock
    private KeywordRetriever keywordRetriever;

    @Mock
    private DenseRetriever denseRetriever;

    private ThreadPoolTaskExecutor executor;
    private RrfHybridRetriever hybridRetriever;
    private RagProperties ragProperties;

    /**
     * 初始化线程池与被测对象
     */
    @BeforeEach
    void setUp() {
        executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(2);
        executor.initialize();
        ragProperties = new RagProperties();
        hybridRetriever = new RrfHybridRetriever(keywordRetriever, denseRetriever, ragProperties);
        ReflectionTestUtils.setField(hybridRetriever, "ragTaskExecutor", executor);
    }

    /**
     * 关闭线程池
     */
    @AfterEach
    void tearDown() {
        executor.shutdown();
    }

    /**
     * 验证并行调用 Keyword/Dense 并返回融合结果
     */
    @Test
    void retrieve_fusesKeywordAndDense() {
        when(keywordRetriever.retrieveCandidates(eq("spring"), eq(10))).thenReturn(List.of(
                HybridSearchFusion.FusionCandidate.of("c1", 1L, "Spring", "boot", null, null, 8.0)
        ));
        when(denseRetriever.retrieve(org.mockito.ArgumentMatchers.any(), eq(10))).thenReturn(List.of(
                HybridSearchFusion.FusionCandidate.of("c1", 1L, "Spring", "boot", null, null, 0.95)
        ));

        List<RagSearchResultVO> result = hybridRetriever.retrieve(
                "spring", new float[]{0.1f, 0.2f}, 5, 10, 60);

        assertEquals(1, result.size());
        assertEquals("c1", result.get(0).getChunkId());
        verify(keywordRetriever).retrieveCandidates("spring", 10);
        verify(denseRetriever).retrieve(org.mockito.ArgumentMatchers.any(), eq(10));
    }

    /**
     * 验证 embedding 为空时不调用 Dense
     */
    @Test
    void retrieve_skipsDenseWhenEmbeddingNull() {
        when(keywordRetriever.retrieveCandidates(eq("q"), anyInt())).thenReturn(List.of(
                HybridSearchFusion.FusionCandidate.of("c2", 2L, "t", "x", null, null, 1.0)
        ));

        List<RagSearchResultVO> result = hybridRetriever.retrieve("q", null, 3, 5, 60);

        assertEquals(1, result.size());
        assertEquals("c2", result.get(0).getChunkId());
    }

    /**
     * 向量候选只有在关键词检索也确认相关时才允许进入最终结果。
     */
    @Test
    void retrieve_excludesDenseOnlyCandidates() {
        when(keywordRetriever.retrieveCandidates(eq("quantum"), eq(10))).thenReturn(List.of());
        when(denseRetriever.retrieve(org.mockito.ArgumentMatchers.any(), eq(10))).thenReturn(List.of(
                HybridSearchFusion.FusionCandidate.of("dense-only", 99L, "Unrelated", "noise", null, null, 0.99)
        ));

        List<RagSearchResultVO> result = hybridRetriever.retrieve(
                "quantum", new float[]{0.1f, 0.2f}, 5, 10, 60);

        assertEquals(List.of(), result);
    }
}
