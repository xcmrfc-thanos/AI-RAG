package com.knowledge.base.ai.rag.support;

import java.util.Collections;
import java.util.List;

/**
 * RAG 检索 ACL 上下文（显式传递，便于查询期 filter 与后置过滤对齐）
 *
 * @param userId  当前用户 ID（可空，仅公开可见）
 * @param teamIds 用户所属团队 ID
 * @author AI-RAG
 * @since 1.0.0
 */
public record RagAclContext(Long userId, List<Long> teamIds) {

    /**
     * 匿名上下文（仅公开文档）
     *
     * @return ACL 上下文
     */
    public static RagAclContext anonymous() {
        return new RagAclContext(null, Collections.emptyList());
    }

    /**
     * 规范化团队列表
     *
     * @param userId  用户 ID
     * @param teamIds 团队列表
     * @return ACL 上下文
     */
    public static RagAclContext of(Long userId, List<Long> teamIds) {
        return new RagAclContext(
                userId,
                teamIds != null ? List.copyOf(teamIds) : Collections.emptyList());
    }
}
