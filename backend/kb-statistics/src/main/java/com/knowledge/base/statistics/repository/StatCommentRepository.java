package com.knowledge.base.statistics.repository;

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

    /**
     * Upsert 评论投影行
     */
    public void upsert(Long id, Long userId, Long documentId) {
        jdbcTemplate.update(
                "INSERT INTO stat_comment (id, user_id, document_id, created_at, deleted) "
                        + "VALUES (?, ?, ?, NOW(), 0) ON DUPLICATE KEY UPDATE "
                        + "user_id=VALUES(user_id), document_id=VALUES(document_id), deleted=0",
                id, userId, documentId);
    }

    /**
     * 标记评论投影删除
     */
    public void markDeleted(Long id) {
        jdbcTemplate.update("UPDATE stat_comment SET deleted = 1 WHERE id = ?", id);
    }
}
