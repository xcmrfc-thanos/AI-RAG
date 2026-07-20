package com.knowledge.base.statistics.repository;

import com.knowledge.base.common.config.SqlDialectHelper;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * stat_comment 投影表仓储
 */
@Repository
@RequiredArgsConstructor
public class StatCommentRepository {

    private final JdbcTemplate jdbcTemplate;
    private final SqlDialectHelper sqlDialectHelper;

    /**
     * Upsert 评论投影行
     *
     * @param id         评论 ID
     * @param userId     用户
     * @param documentId 文档
     */
    public void upsert(Long id, Long userId, Long documentId) {
        String now = sqlDialectHelper.currentTimestamp();
        jdbcTemplate.update(
                "INSERT INTO stat_comment (id, user_id, document_id, created_at, deleted) "
                        + "VALUES (?, ?, ?, " + now + ", 0) "
                        + sqlDialectHelper.onDuplicateKeyUpdate("id",
                        "user_id=VALUES(user_id), document_id=VALUES(document_id), deleted=0"),
                id, userId, documentId);
    }

    /**
     * 标记评论投影删除
     *
     * @param id 评论 ID
     */
    public void markDeleted(Long id) {
        jdbcTemplate.update("UPDATE stat_comment SET deleted = 1 WHERE id = ?", id);
    }
}
