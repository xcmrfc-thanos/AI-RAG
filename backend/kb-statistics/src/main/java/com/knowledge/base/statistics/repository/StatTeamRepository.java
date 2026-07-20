package com.knowledge.base.statistics.repository;

import com.knowledge.base.common.config.SqlDialectHelper;
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
    private final SqlDialectHelper sqlDialectHelper;

    /**
     * Upsert 团队投影行
     *
     * @param id       团队 ID
     * @param teamName 名称
     * @param teamCode 编码
     * @param status   状态
     * @param deleted  删除标记
     */
    public void upsert(Long id, String teamName, String teamCode, Integer status, Integer deleted) {
        jdbcTemplate.update(
                sqlDialectHelper.upsertSql(
                        "stat_team",
                        "id",
                        "id, team_name, team_code, status, deleted",
                        "?, ?, ?, ?, ?",
                        "team_name=VALUES(team_name), team_code=VALUES(team_code), "
                                + "status=VALUES(status), deleted=VALUES(deleted)"),
                id, teamName, teamCode, status, deleted != null ? deleted : 0);
    }

    /**
     * 统计未删除团队数
     *
     * @return 数量
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
