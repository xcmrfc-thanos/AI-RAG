package com.knowledge.base.statistics.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * stat_user 投影表仓储
 */
@Repository
@RequiredArgsConstructor
public class StatUserRepository {

    private final JdbcTemplate jdbcTemplate;

    /**
     * Upsert 用户投影行
     */
    public void upsert(Long id, String username, String realName, String avatar,
                       Integer status, Integer deleted) {
        jdbcTemplate.update(
                "INSERT INTO stat_user (id, username, real_name, avatar, status, created_at, updated_at, deleted) "
                        + "VALUES (?, ?, ?, ?, ?, NOW(), NOW(), ?) "
                        + "ON DUPLICATE KEY UPDATE username=VALUES(username), real_name=VALUES(real_name), "
                        + "avatar=VALUES(avatar), status=VALUES(status), updated_at=NOW(), deleted=VALUES(deleted)",
                id, username, realName, avatar, status,
                deleted != null ? deleted : 0);
    }

    /**
     * 标记用户投影删除
     */
    public void markDeleted(Long id) {
        jdbcTemplate.update("UPDATE stat_user SET deleted = 1, updated_at = NOW() WHERE id = ?", id);
    }
}
