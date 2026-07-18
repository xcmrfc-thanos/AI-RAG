package com.knowledge.base.ai.rag.support;

import io.qdrant.client.grpc.Points.Filter;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 查询期 ACL filter 结构单测
 *
 * @author AI-RAG
 * @since 1.0.0
 */
class RagAclQuerySupportTest {

    /**
     * 匿名仅 should is_public=true，minShould=1
     */
    @Test
    void qdrantAnonymousOnlyPublic() {
        Filter filter = RagAclQuerySupport.buildQdrantChunkAclFilter(RagAclContext.anonymous());
        assertEquals(1, filter.getMinShould().getMinCount());
        assertEquals(1, filter.getShouldCount());
        assertEquals("is_public", filter.getShould(0).getField().getKey());
        assertTrue(filter.getShould(0).getField().getMatch().getBoolean());
    }

    /**
     * 登录用户含作者与团队 should
     */
    @Test
    void qdrantLoggedInIncludesAuthorAndTeam() {
        Filter filter = RagAclQuerySupport.buildQdrantChunkAclFilter(
                RagAclContext.of(42L, List.of(7L, 8L)));
        assertEquals(1, filter.getMinShould().getMinCount());
        assertEquals(4, filter.getShouldCount());
        assertEquals("author_id", filter.getShould(1).getField().getKey());
        assertEquals(42L, filter.getShould(1).getField().getMatch().getInteger());
        assertEquals("team_id", filter.getShould(2).getField().getKey());
        assertEquals(7L, filter.getShould(2).getField().getMatch().getInteger());
        assertEquals(8L, filter.getShould(3).getField().getMatch().getInteger());
    }
}
