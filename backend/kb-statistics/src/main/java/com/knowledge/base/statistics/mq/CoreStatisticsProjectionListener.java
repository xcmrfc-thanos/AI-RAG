package com.knowledge.base.statistics.mq;

import com.knowledge.base.common.constants.CoreStatisticsProjectionMQConstants;
import com.knowledge.base.common.event.CoreStatisticsProjectionEventDTO;
import com.knowledge.base.statistics.repository.StatCategoryRepository;
import com.knowledge.base.statistics.repository.StatCommentRepository;
import com.knowledge.base.statistics.repository.StatDocumentRepository;
import com.knowledge.base.statistics.repository.StatRoleRepository;
import com.knowledge.base.statistics.repository.StatTeamRepository;
import com.knowledge.base.statistics.repository.StatUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

/**
 * Core 域统计投影 MQ 监听器（P3-1b）
 *
 * <p>仅负责事件分发；宽表 upsert 委托各 {@code Stat*Repository}。</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CoreStatisticsProjectionListener {

    private final StatDocumentRepository documentRepository;
    private final StatUserRepository userRepository;
    private final StatCommentRepository commentRepository;
    private final StatCategoryRepository categoryRepository;
    private final StatRoleRepository roleRepository;
    private final StatTeamRepository teamRepository;

    /**
     * 消费 Core 投影事件并写入本地宽表
     */
    @RabbitListener(queues = "#{@statisticsProjectionQueue.name}")
    public void handleProjectionEvent(CoreStatisticsProjectionEventDTO event) {
        if (event == null || event.getEventType() == null) {
            return;
        }
        try {
            switch (event.getEventType()) {
                case CoreStatisticsProjectionMQConstants.EVENT_DOCUMENT_UPSERT -> upsertDocument(event);
                case CoreStatisticsProjectionMQConstants.EVENT_DOCUMENT_DELETE ->
                        documentRepository.markDeleted(event.getDocumentId());
                case CoreStatisticsProjectionMQConstants.EVENT_USER_UPSERT -> upsertUser(event);
                case CoreStatisticsProjectionMQConstants.EVENT_USER_DELETE ->
                        userRepository.markDeleted(event.getUserId());
                case CoreStatisticsProjectionMQConstants.EVENT_COMMENT_UPSERT -> upsertComment(event);
                case CoreStatisticsProjectionMQConstants.EVENT_COMMENT_DELETE ->
                        commentRepository.markDeleted(event.getCommentId());
                case CoreStatisticsProjectionMQConstants.EVENT_CATEGORY_UPSERT -> upsertCategory(event);
                case CoreStatisticsProjectionMQConstants.EVENT_ROLE_UPSERT -> upsertRole(event);
                case CoreStatisticsProjectionMQConstants.EVENT_TEAM_UPSERT -> upsertTeam(event);
                default -> log.warn("未知 Core 投影事件：{}", event.getEventType());
            }
        } catch (Exception e) {
            log.error("处理 Core 投影事件失败：type={}, error={}", event.getEventType(), e.getMessage(), e);
        }
    }

    /**
     * Upsert 文档投影
     */
    private void upsertDocument(CoreStatisticsProjectionEventDTO event) {
        documentRepository.upsert(
                event.getDocumentId(),
                event.getTitle(),
                event.getAuthorId(),
                event.getCategoryId(),
                event.getStatus(),
                event.getViewCount(),
                event.getLikeCount(),
                event.getFavoriteCount(),
                event.getSummary(),
                event.getDeleted(),
                event.getIsPublic(),
                event.getTeamId());
    }

    /**
     * Upsert 用户投影
     */
    private void upsertUser(CoreStatisticsProjectionEventDTO event) {
        userRepository.upsert(
                event.getUserId(),
                event.getUsername(),
                event.getRealName(),
                event.getAvatar(),
                event.getUserStatus(),
                event.getDeleted());
    }

    /**
     * Upsert 评论投影
     */
    private void upsertComment(CoreStatisticsProjectionEventDTO event) {
        commentRepository.upsert(event.getCommentId(), event.getUserId(), event.getDocumentId());
    }

    /**
     * Upsert 分类投影
     */
    private void upsertCategory(CoreStatisticsProjectionEventDTO event) {
        categoryRepository.upsert(event.getCategoryId(), event.getCategoryName(), event.getDeleted());
    }

    /**
     * Upsert 角色投影
     */
    private void upsertRole(CoreStatisticsProjectionEventDTO event) {
        roleRepository.upsert(
                event.getRoleId(),
                event.getRoleName(),
                event.getRoleCode(),
                event.getRoleStatus(),
                event.getDeleted());
    }

    /**
     * Upsert 团队投影
     */
    private void upsertTeam(CoreStatisticsProjectionEventDTO event) {
        teamRepository.upsert(
                event.getTeamId(),
                event.getTeamName(),
                event.getTeamCode(),
                event.getTeamStatus(),
                event.getDeleted());
    }
}
