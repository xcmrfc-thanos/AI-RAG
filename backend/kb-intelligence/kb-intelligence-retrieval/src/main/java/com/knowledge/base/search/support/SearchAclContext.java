package com.knowledge.base.search.support;

import java.util.Collections;
import java.util.List;

/**
 * 检索请求的 ACL 上下文（显式传递，避免异步线程丢失 ThreadLocal）
 *
 * @param userId  当前用户 ID（可空，仅公开可见）
 * @param teamIds 用户所属团队 ID
 * @author knowledge-base-team
 * @since 1.0.0
 */
public record SearchAclContext(Long userId, List<Long> teamIds) {

    /**
     * 空上下文（仅公开文档）
     *
     * @return ACL 上下文
     */
    public static SearchAclContext anonymous() {
        return new SearchAclContext(null, Collections.emptyList());
    }

    /**
     * 规范化团队列表
     *
     * @param userId  用户 ID
     * @param teamIds 团队列表
     * @return ACL 上下文
     */
    public static SearchAclContext of(Long userId, List<Long> teamIds) {
        return new SearchAclContext(
                userId,
                teamIds != null ? List.copyOf(teamIds) : Collections.emptyList());
    }
}
