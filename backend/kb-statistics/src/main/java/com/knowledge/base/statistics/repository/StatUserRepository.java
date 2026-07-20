package com.knowledge.base.statistics.repository;

import com.knowledge.base.common.config.SqlDialectHelper;
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
    private final SqlDialectHelper sqlDialectHelper;

    /**
     * Upsert 用户投影行
     *
     * @param id       用户 ID
     * @param username 用户名
     * @param realName 真实姓名
     * @param avatar   头像
     * @param status   状态
     * @param deleted  删除标记
     */
    public void upsert(Long id, String username, String realName, String avatar,
                       Integer status, Integer deleted) {
        String now = sqlDialectHelper.currentTimestamp();
        jdbcTemplate.update(
                "INSERT INTO stat_user (id, username, real_name, avatar, status, created_at, updated_at, deleted) "
                        + "VALUES (?, ?, ?, ?, ?, " + now + ", " + now + ", ?) "
                        + sqlDialectHelper.onDuplicateKeyUpdate("id",
                        "username=VALUES(username), real_name=VALUES(real_name), "
                                + "avatar=VALUES(avatar), status=VALUES(status), updated_at=" + now
                                + ", deleted=VALUES(deleted)"),
                id, username, realName, avatar, status,
                deleted != null ? deleted : 0);
    }

    /**
     * 标记用户投影删除
     *
     * @param id 用户 ID
     */
    public void markDeleted(Long id) {
        jdbcTemplate.update(
                "UPDATE stat_user SET deleted = 1, updated_at = " + sqlDialectHelper.currentTimestamp() + " WHERE id = ?",
                id);
    }
}
