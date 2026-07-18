package com.knowledge.base.ai.rag.support;

import com.knowledge.base.ai.vo.RagSearchResultVO;
import com.knowledge.base.common.config.IntelligenceIndexingProperties;
import com.knowledge.base.common.utils.UserContextUtil;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * RAG ACL 过滤单测（嵌入字段路径，不依赖 ES）
 *
 * @author AI-RAG
 * @since 1.0.0
 */
class RagAclFilterTest {

    private RagAclFilter filter;
    private RagAclContextResolver resolver;

    @BeforeEach
    void setUp() {
        resolver = mock(RagAclContextResolver.class);
        when(resolver.resolve()).thenReturn(RagAclContext.of(100L, List.of()));
        IntelligenceIndexingProperties indexing = new IntelligenceIndexingProperties();
        @SuppressWarnings("unchecked")
        ObjectProvider<co.elastic.clients.elasticsearch.ElasticsearchClient> es =
                mock(ObjectProvider.class);
        when(es.getIfAvailable()).thenReturn(null);
        filter = new RagAclFilter(resolver, indexing, es);
        UserContextUtil.setUserId(100L);
    }

    @AfterEach
    void tearDown() {
        UserContextUtil.clear();
    }

    /**
     * 公开文档对任意用户可见；私有文档仅作者可见
     */
    @Test
    void keepsPublicAndOwnPrivateDocs() {
        List<RagSearchResultVO> input = List.of(
                RagSearchResultVO.builder().chunkId("c1").documentId(1L)
                        .content("public").isPublic(true).authorId(9L).build(),
                RagSearchResultVO.builder().chunkId("c2").documentId(2L)
                        .content("mine").isPublic(false).authorId(100L).build(),
                RagSearchResultVO.builder().chunkId("c3").documentId(3L)
                        .content("secret").isPublic(false).authorId(200L).build()
        );

        List<RagSearchResultVO> visible = filter.filterVisible(input);
        assertEquals(List.of("c1", "c2"), visible.stream().map(RagSearchResultVO::getChunkId).toList());
    }

    /**
     * 匿名用户仅见公开文档
     */
    @Test
    void anonymousSeesOnlyPublic() {
        when(resolver.resolve()).thenReturn(RagAclContext.anonymous());
        UserContextUtil.clear();
        List<RagSearchResultVO> input = List.of(
                RagSearchResultVO.builder().chunkId("c1").documentId(1L)
                        .isPublic(true).authorId(1L).build(),
                RagSearchResultVO.builder().chunkId("c2").documentId(2L)
                        .isPublic(false).authorId(1L).build()
        );
        List<RagSearchResultVO> visible = filter.filterVisible(input);
        assertEquals(List.of("c1"), visible.stream().map(RagSearchResultVO::getChunkId).toList());
    }
}
