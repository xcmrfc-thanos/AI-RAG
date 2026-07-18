package com.knowledge.base.statistics.mq;

import com.knowledge.base.common.constants.CoreStatisticsProjectionMQConstants;
import com.knowledge.base.common.event.CoreStatisticsProjectionEventDTO;
import com.knowledge.base.statistics.repository.StatCategoryRepository;
import com.knowledge.base.statistics.repository.StatCommentRepository;
import com.knowledge.base.statistics.repository.StatDocumentRepository;
import com.knowledge.base.statistics.repository.StatRoleRepository;
import com.knowledge.base.statistics.repository.StatTeamRepository;
import com.knowledge.base.statistics.repository.StatUserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

/**
 * Core 域统计投影 MQ 监听器验收测试
 */
@ExtendWith(MockitoExtension.class)
class CoreStatisticsProjectionListenerTest {

    @Mock
    private StatDocumentRepository documentRepository;
    @Mock
    private StatUserRepository userRepository;
    @Mock
    private StatCommentRepository commentRepository;
    @Mock
    private StatCategoryRepository categoryRepository;
    @Mock
    private StatRoleRepository roleRepository;
    @Mock
    private StatTeamRepository teamRepository;

    @InjectMocks
    private CoreStatisticsProjectionListener listener;

    /**
     * 文档 upsert 事件应写入 stat_document 宽表
     */
    @Test
    void documentUpsertShouldWriteProjectionTable() {
        CoreStatisticsProjectionEventDTO event = CoreStatisticsProjectionEventDTO.builder()
                .eventType(CoreStatisticsProjectionMQConstants.EVENT_DOCUMENT_UPSERT)
                .documentId(3001L)
                .title("统计投影文档")
                .authorId(10L)
                .categoryId(2L)
                .status(1)
                .viewCount(5L)
                .likeCount(1L)
                .favoriteCount(0L)
                .summary("摘要")
                .deleted(0)
                .build();

        listener.handleProjectionEvent(event);

        verify(documentRepository).upsert(3001L, "统计投影文档", 10L, 2L, 1, 5L, 1L, 0L, "摘要", 0, null, null);
    }

    /**
     * 文档删除事件应标记 stat_document 为已删除
     */
    @Test
    void documentDeleteShouldMarkDeleted() {
        CoreStatisticsProjectionEventDTO event = CoreStatisticsProjectionEventDTO.builder()
                .eventType(CoreStatisticsProjectionMQConstants.EVENT_DOCUMENT_DELETE)
                .documentId(3001L)
                .build();

        listener.handleProjectionEvent(event);

        verify(documentRepository).markDeleted(3001L);
    }

    /**
     * 用户 upsert 事件应写入 stat_user 宽表
     */
    @Test
    void userUpsertShouldWriteProjectionTable() {
        CoreStatisticsProjectionEventDTO event = CoreStatisticsProjectionEventDTO.builder()
                .eventType(CoreStatisticsProjectionMQConstants.EVENT_USER_UPSERT)
                .userId(2001L)
                .username("stats_user")
                .realName("统计用户")
                .avatar("/a.png")
                .userStatus(1)
                .deleted(0)
                .build();

        listener.handleProjectionEvent(event);

        verify(userRepository).upsert(2001L, "stats_user", "统计用户", "/a.png", 1, 0);
    }

    /**
     * 用户删除事件应标记 stat_user 为已删除
     */
    @Test
    void userDeleteShouldMarkDeleted() {
        CoreStatisticsProjectionEventDTO event = CoreStatisticsProjectionEventDTO.builder()
                .eventType(CoreStatisticsProjectionMQConstants.EVENT_USER_DELETE)
                .userId(2001L)
                .build();

        listener.handleProjectionEvent(event);

        verify(userRepository).markDeleted(2001L);
    }

    /**
     * 分类 upsert 事件应写入 stat_category
     */
    @Test
    void categoryUpsertShouldWriteProjectionTable() {
        CoreStatisticsProjectionEventDTO event = CoreStatisticsProjectionEventDTO.builder()
                .eventType(CoreStatisticsProjectionMQConstants.EVENT_CATEGORY_UPSERT)
                .categoryId(9L)
                .categoryName("技术文档")
                .deleted(0)
                .build();

        listener.handleProjectionEvent(event);

        verify(categoryRepository).upsert(9L, "技术文档", 0);
    }

    /**
     * 角色 upsert 事件应写入 stat_role
     */
    @Test
    void roleUpsertShouldWriteProjectionTable() {
        CoreStatisticsProjectionEventDTO event = CoreStatisticsProjectionEventDTO.builder()
                .eventType(CoreStatisticsProjectionMQConstants.EVENT_ROLE_UPSERT)
                .roleId(11L)
                .roleName("管理员")
                .roleCode("ADMIN")
                .roleStatus(1)
                .deleted(0)
                .build();

        listener.handleProjectionEvent(event);

        verify(roleRepository).upsert(11L, "管理员", "ADMIN", 1, 0);
    }

    /**
     * 团队 upsert 事件应写入 stat_team
     */
    @Test
    void teamUpsertShouldWriteProjectionTable() {
        CoreStatisticsProjectionEventDTO event = CoreStatisticsProjectionEventDTO.builder()
                .eventType(CoreStatisticsProjectionMQConstants.EVENT_TEAM_UPSERT)
                .teamId(22L)
                .teamName("研发团队")
                .teamCode("DEV")
                .teamStatus(1)
                .deleted(0)
                .build();

        listener.handleProjectionEvent(event);

        verify(teamRepository).upsert(22L, "研发团队", "DEV", 1, 0);
    }

    /**
     * 空事件不应访问仓储
     */
    @Test
    void nullEventShouldBeIgnored() {
        listener.handleProjectionEvent(null);

        verifyNoInteractions(documentRepository, userRepository, commentRepository,
                categoryRepository, roleRepository, teamRepository);
    }
}
