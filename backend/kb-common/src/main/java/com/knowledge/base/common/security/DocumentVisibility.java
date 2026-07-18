package com.knowledge.base.common.security;

import java.util.Collection;

/**
 * 文档可见性判定（Search / Document / Agent 工具共用）
 *
 * <p>用户可见当且仅当：公开，或作者本人，或所属团队包含文档 teamId。</p>
 *
 * @author knowledge-base-team
 * @since 1.0.0
 */
public final class DocumentVisibility {

    private DocumentVisibility() {
    }

    /**
     * 判断文档对指定用户是否可见
     *
     * @param isPublic 是否公开（1/true 为公开；null 视为非公开）
     * @param authorId 作者/创建者 ID
     * @param teamId   文档所属团队 ID（可空）
     * @param userId   当前用户 ID（可空；空则仅公开可见）
     * @param userTeamIds 当前用户所属团队 ID 列表（可空）
     * @return 是否可见
     */
    public static boolean isVisible(Boolean isPublic,
                                    Long authorId,
                                    Long teamId,
                                    Long userId,
                                    Collection<Long> userTeamIds) {
        if (Boolean.TRUE.equals(isPublic)) {
            return true;
        }
        if (userId != null && userId.equals(authorId)) {
            return true;
        }
        if (userId != null && teamId != null && userTeamIds != null && userTeamIds.contains(teamId)) {
            return true;
        }
        return false;
    }

    /**
     * 将整型 isPublic（0/1）转为布尔后判定可见性
     *
     * @param isPublicInt 0-私有，1-公开
     * @param authorId    作者 ID
     * @param teamId      团队 ID
     * @param userId      当前用户 ID
     * @param userTeamIds 用户团队列表
     * @return 是否可见
     */
    public static boolean isVisible(Integer isPublicInt,
                                    Long authorId,
                                    Long teamId,
                                    Long userId,
                                    Collection<Long> userTeamIds) {
        Boolean isPublic = isPublicInt != null && isPublicInt == 1;
        return isVisible(isPublic, authorId, teamId, userId, userTeamIds);
    }
}
