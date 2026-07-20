package com.knowledge.base.statistics.repository;

import com.knowledge.base.common.config.SqlDialectHelper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * stat_role 投影表仓储
 */
@Slf4j
@Repository
@RequiredArgsConstructor
public class StatRoleRepository {

    private final JdbcTemplate jdbcTemplate;
    private final SqlDialectHelper sqlDialectHelper;

    /**
     * Upsert 角色投影行
     *
     * @param id       角色 ID
     * @param roleName 名称
     * @param roleCode 编码
     * @param status   状态
     * @param deleted  删除标记
     */
    public void upsert(Long id, String roleName, String roleCode, Integer status, Integer deleted) {
        jdbcTemplate.update(
                "INSERT INTO stat_role (id, role_name, role_code, status, deleted) VALUES (?, ?, ?, ?, ?) "
                        + sqlDialectHelper.onDuplicateKeyUpdate("id",
                        "role_name=VALUES(role_name), role_code=VALUES(role_code), "
                                + "status=VALUES(status), deleted=VALUES(deleted)"),
                id, roleName, roleCode, status, deleted != null ? deleted : 0);
    }

    /**
     * 统计未删除角色数
     *
     * @return 数量
     */
    public long countActive() {
        try {
            Long count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM stat_role WHERE deleted = 0", Long.class);
            return count != null ? count : 0L;
        } catch (Exception e) {
            log.warn("统计角色数量失败：{}", e.getMessage());
            return 0L;
        }
    }
}
