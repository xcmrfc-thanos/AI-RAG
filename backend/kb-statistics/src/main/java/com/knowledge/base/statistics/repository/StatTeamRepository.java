package com.knowledge.base.statistics.repository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * stat_team 投影表仓储
 */
@Slf4j
@Repository
@RequiredArgsConstructor
public class StatTeamRepository {

    private final JdbcTemplate jdbcTemplate;

    /**
     * Upsert 团队投影行
     */
    public void upsert(Long id, String teamName, String teamCode, Integer status, Integer deleted) {
        jdbcTemplate.update(
                "INSERT INTO stat_team (id, team_name, team_code, status, deleted) VALUES (?, ?, ?, ?, ?) "
                        + "ON DUPLICATE KEY UPDATE team_name=VALUES(team_name), team_code=VALUES(team_code), "
                        + "status=VALUES(status), deleted=VALUES(deleted)",
                id, teamName, teamCode, status, deleted != null ? deleted : 0);
    }

    /**
     * 统计未删除团队数
     */
    public long countActive() {
        try {
            Long count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM stat_team WHERE deleted = 0", Long.class);
            return count != null ? count : 0L;
        } catch (Exception e) {
            log.warn("统计团队数量失败：{}", e.getMessage());
            return 0L;
        }
    }
}
