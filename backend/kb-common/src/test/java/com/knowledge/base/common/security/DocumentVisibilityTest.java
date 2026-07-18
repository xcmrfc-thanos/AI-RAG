package com.knowledge.base.common.security;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 文档可见性规则单测
 */
class DocumentVisibilityTest {

    /**
     * 公开文档对任意用户可见
     */
    @Test
    void publicDocVisibleToAnyone() {
        assertTrue(DocumentVisibility.isVisible(1, 100L, 9L, 200L, List.of()));
        assertTrue(DocumentVisibility.isVisible(true, 100L, null, null, null));
    }

    /**
     * 私有文档仅作者可见
     */
    @Test
    void privateDocVisibleOnlyToAuthor() {
        assertTrue(DocumentVisibility.isVisible(0, 100L, null, 100L, List.of()));
        assertFalse(DocumentVisibility.isVisible(0, 100L, null, 200L, List.of()));
    }

    /**
     * 团队文档对团队成员可见
     */
    @Test
    void teamDocVisibleToTeamMember() {
        assertTrue(DocumentVisibility.isVisible(0, 100L, 7L, 200L, List.of(7L, 8L)));
        assertFalse(DocumentVisibility.isVisible(0, 100L, 7L, 200L, List.of(8L)));
    }
}
