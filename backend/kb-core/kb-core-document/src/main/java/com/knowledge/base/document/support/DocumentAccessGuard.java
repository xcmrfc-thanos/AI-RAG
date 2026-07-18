package com.knowledge.base.document.support;

import com.knowledge.base.common.exception.ForbiddenException;
import com.knowledge.base.common.security.DocumentVisibility;
import com.knowledge.base.common.utils.UserContextUtil;
import com.knowledge.base.document.client.DocumentUserClient;
import com.knowledge.base.document.entity.Document;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;

/**
 * 文档读取 ACL 守卫
 *
 * <p>公开 / 作者本人 / 团队成员可见；内部 HMAC 调用旁路以便索引重建。</p>
 *
 * @author knowledge-base-team
 * @since 1.0.0
 */
@Component
public class DocumentAccessGuard {

    @Resource
    private DocumentUserClient documentUserClient;

    /**
     * 断言当前上下文可读取指定文档，否则抛出 403
     *
     * @param document 文档实体
     */
    public void assertReadable(Document document) {
        if (document == null) {
            return;
        }
        if (UserContextUtil.isInternalService()) {
            return;
        }
        Long userId = UserContextUtil.getUserId();
        List<Long> teamIds = listTeamIdsSafe(userId);
        if (!DocumentVisibility.isVisible(
                document.getIsPublic(),
                document.getAuthorId(),
                document.getTeamId(),
                userId,
                teamIds)) {
            throw new ForbiddenException("无权访问该文档");
        }
    }

    /**
     * 安全查询用户团队列表
     *
     * @param userId 用户 ID
     * @return 团队 ID 列表
     */
    private List<Long> listTeamIdsSafe(Long userId) {
        if (userId == null) {
            return Collections.emptyList();
        }
        try {
            List<Long> ids = documentUserClient.listTeamIds(userId);
            return ids != null ? ids : Collections.emptyList();
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }
}
