package com.knowledge.base.common.event;

import com.knowledge.base.common.config.InstanceIdentifier;
import com.knowledge.base.common.constants.CoreStatisticsProjectionMQConstants;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * Core 域统计投影事件发布器（P3-1b）。
 */
@Slf4j
@Component
public class CoreStatisticsProjectionPublisher {

    @Resource
    private RabbitTemplate rabbitTemplate;

    @Resource
    private InstanceIdentifier instanceIdentifier;

    /**
     * 发布文档 upsert 投影事件
     *
     * @param documentId    文档 ID
     * @param title         标题
     * @param authorId      作者
     * @param categoryId    分类
     * @param status        状态
     * @param viewCount     浏览
     * @param likeCount     点赞
     * @param favoriteCount 收藏
     * @param summary       摘要
     * @param deleted       删除标记
     * @param isPublic      是否公开（0/1）
     * @param teamId        团队 ID
     */
    public void publishDocumentUpsert(Long documentId, String title, Long authorId, Long categoryId,
                                      Integer status, Long viewCount, Long likeCount, Long favoriteCount,
                                      String summary, Integer deleted, Integer isPublic, Long teamId) {
        publish(CoreStatisticsProjectionMQConstants.EVENT_DOCUMENT_UPSERT,
                CoreStatisticsProjectionEventDTO.builder()
                        .eventType(CoreStatisticsProjectionMQConstants.EVENT_DOCUMENT_UPSERT)
                        .documentId(documentId)
                        .title(title)
                        .authorId(authorId)
                        .categoryId(categoryId)
                        .status(status)
                        .viewCount(viewCount)
                        .likeCount(likeCount)
                        .favoriteCount(favoriteCount)
                        .summary(summary)
                        .deleted(deleted != null ? deleted : 0)
                        .isPublic(isPublic)
                        .teamId(teamId)
                        .timestamp(LocalDateTime.now())
                        .build());
    }

    /**
     * 兼容旧调用：不带 ACL 字段时按公开处理
     */
    public void publishDocumentUpsert(Long documentId, String title, Long authorId, Long categoryId,
                                      Integer status, Long viewCount, Long likeCount, Long favoriteCount,
                                      String summary, Integer deleted) {
        publishDocumentUpsert(documentId, title, authorId, categoryId, status, viewCount, likeCount,
                favoriteCount, summary, deleted, 1, null);
    }

    /**
     * 发布文档删除投影事件
     */
    public void publishDocumentDelete(Long documentId) {
        publish(CoreStatisticsProjectionMQConstants.EVENT_DOCUMENT_DELETE,
                CoreStatisticsProjectionEventDTO.builder()
                        .eventType(CoreStatisticsProjectionMQConstants.EVENT_DOCUMENT_DELETE)
                        .documentId(documentId)
                        .deleted(1)
                        .timestamp(LocalDateTime.now())
                        .build());
    }

    /**
     * 发布用户 upsert 投影事件
     */
    public void publishUserUpsert(Long userId, String username, String realName, String avatar,
                                  Integer status, Integer deleted) {
        publish(CoreStatisticsProjectionMQConstants.EVENT_USER_UPSERT,
                CoreStatisticsProjectionEventDTO.builder()
                        .eventType(CoreStatisticsProjectionMQConstants.EVENT_USER_UPSERT)
                        .userId(userId)
                        .username(username)
                        .realName(realName)
                        .avatar(avatar)
                        .userStatus(status)
                        .deleted(deleted != null ? deleted : 0)
                        .timestamp(LocalDateTime.now())
                        .build());
    }

    /**
     * 发布用户删除投影事件
     */
    public void publishUserDelete(Long userId) {
        publish(CoreStatisticsProjectionMQConstants.EVENT_USER_DELETE,
                CoreStatisticsProjectionEventDTO.builder()
                        .eventType(CoreStatisticsProjectionMQConstants.EVENT_USER_DELETE)
                        .userId(userId)
                        .deleted(1)
                        .timestamp(LocalDateTime.now())
                        .build());
    }

    /**
     * 发布评论 upsert 投影事件
     */
    public void publishCommentUpsert(Long commentId, Long userId, Long documentId) {
        publish(CoreStatisticsProjectionMQConstants.EVENT_COMMENT_UPSERT,
                CoreStatisticsProjectionEventDTO.builder()
                        .eventType(CoreStatisticsProjectionMQConstants.EVENT_COMMENT_UPSERT)
                        .commentId(commentId)
                        .userId(userId)
                        .documentId(documentId)
                        .deleted(0)
                        .timestamp(LocalDateTime.now())
                        .build());
    }

    /**
     * 发布评论删除投影事件
     */
    public void publishCommentDelete(Long commentId) {
        publish(CoreStatisticsProjectionMQConstants.EVENT_COMMENT_DELETE,
                CoreStatisticsProjectionEventDTO.builder()
                        .eventType(CoreStatisticsProjectionMQConstants.EVENT_COMMENT_DELETE)
                        .commentId(commentId)
                        .deleted(1)
                        .timestamp(LocalDateTime.now())
                        .build());
    }

    /**
     * 发布分类 upsert 投影事件
     */
    public void publishCategoryUpsert(Long categoryId, String categoryName, Integer deleted) {
        publish(CoreStatisticsProjectionMQConstants.EVENT_CATEGORY_UPSERT,
                CoreStatisticsProjectionEventDTO.builder()
                        .eventType(CoreStatisticsProjectionMQConstants.EVENT_CATEGORY_UPSERT)
                        .categoryId(categoryId)
                        .categoryName(categoryName)
                        .deleted(deleted != null ? deleted : 0)
                        .timestamp(LocalDateTime.now())
                        .build());
    }

    /**
     * 发布角色 upsert 投影事件
     */
    public void publishRoleUpsert(Long roleId, String roleName, String roleCode,
                                  Integer roleStatus, Integer deleted) {
        publish(CoreStatisticsProjectionMQConstants.EVENT_ROLE_UPSERT,
                CoreStatisticsProjectionEventDTO.builder()
                        .eventType(CoreStatisticsProjectionMQConstants.EVENT_ROLE_UPSERT)
                        .roleId(roleId)
                        .roleName(roleName)
                        .roleCode(roleCode)
                        .roleStatus(roleStatus)
                        .deleted(deleted != null ? deleted : 0)
                        .timestamp(LocalDateTime.now())
                        .build());
    }

    /**
     * 发布团队 upsert 投影事件
     */
    public void publishTeamUpsert(Long teamId, String teamName, String teamCode,
                                  Integer teamStatus, Integer deleted) {
        publish(CoreStatisticsProjectionMQConstants.EVENT_TEAM_UPSERT,
                CoreStatisticsProjectionEventDTO.builder()
                        .eventType(CoreStatisticsProjectionMQConstants.EVENT_TEAM_UPSERT)
                        .teamId(teamId)
                        .teamName(teamName)
                        .teamCode(teamCode)
                        .teamStatus(teamStatus)
                        .deleted(deleted != null ? deleted : 0)
                        .timestamp(LocalDateTime.now())
                        .build());
    }

    /**
     * 发送 MQ 消息
     */
    private void publish(String eventType, CoreStatisticsProjectionEventDTO event) {
        try {
            String routingKey = CoreStatisticsProjectionMQConstants.routingKey(instanceIdentifier.getId(), eventType);
            rabbitTemplate.convertAndSend(CoreStatisticsProjectionMQConstants.EXCHANGE, routingKey, event);
        } catch (Exception e) {
            log.error("Core统计投影事件发布失败：type={}, error={}", eventType, e.getMessage());
        }
    }
}
