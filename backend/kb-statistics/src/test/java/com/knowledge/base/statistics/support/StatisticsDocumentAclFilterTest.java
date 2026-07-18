package com.knowledge.base.statistics.support;

import com.knowledge.base.common.security.DocumentVisibility;
import com.knowledge.base.common.utils.UserContextUtil;
import com.knowledge.base.statistics.vo.HotDocumentVO;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * 统计热门文档 ACL 过滤单测
 *
 * @author AI-RAG
 * @since 1.0.0
 */
class StatisticsDocumentAclFilterTest {

    private StatisticsDocumentAclFilter filter;

    @BeforeEach
    void setUp() {
        filter = new StatisticsDocumentAclFilter();
        UserContextUtil.setUserId(10L);
    }

    @AfterEach
    void tearDown() {
        UserContextUtil.clear();
    }

    /**
     * 公开与本人私有可见，他人私有不可见
     */
    @Test
    void filtersByDocumentVisibility() {
        List<HotDocumentVO> source = List.of(
                HotDocumentVO.builder().documentId(1L).title("pub").isPublic(1).authorId(99L).build(),
                HotDocumentVO.builder().documentId(2L).title("mine").isPublic(0).authorId(10L).build(),
                HotDocumentVO.builder().documentId(3L).title("secret").isPublic(0).authorId(20L).build()
        );
        List<HotDocumentVO> visible = filter.filterVisible(source, 10);
        assertEquals(List.of(1L, 2L), visible.stream().map(HotDocumentVO::getDocumentId).toList());
        assertEquals(true, DocumentVisibility.isVisible(1, 99L, null, 10L, List.of()));
    }
}
