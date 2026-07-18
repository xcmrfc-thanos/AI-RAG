package com.knowledge.base.statistics.repository;

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

    /**
     * Upsert 角色投影行
     */
    public void upsert(Long id, String roleName, String roleCode, Integer status, Integer deleted) {
        jdbcTemplate.update(
                "INSERT INTO stat_role (id, role_name, role_code, status, deleted) VALUES (?, ?, ?, ?, ?) "
                        + "ON DUPLICATE KEY UPDATE role_name=VALUES(role_name), role_code=VALUES(role_code), "
                        + "status=VALUES(status), deleted=VALUES(deleted)",
                id, roleName, roleCode, status, deleted != null ? deleted : 0);
    }

    /**
     * 统计未删除角色数
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
