package com.knowledge.base.statistics.repository;

import com.knowledge.base.common.config.SqlDialectHelper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * stat_category 投影表仓储
 */
@Slf4j
@Repository
@RequiredArgsConstructor
public class StatCategoryRepository {

    private final JdbcTemplate jdbcTemplate;
    private final SqlDialectHelper sqlDialectHelper;

    /**
     * Upsert 分类投影行
     *
     * @param id           分类 ID
     * @param categoryName 名称
     * @param deleted      删除标记
     */
    public void upsert(Long id, String categoryName, Integer deleted) {
        jdbcTemplate.update(
                sqlDialectHelper.upsertSql(
                        "stat_category",
                        "id",
                        "id, category_name, deleted",
                        "?, ?, ?",
                        "category_name=VALUES(category_name), deleted=VALUES(deleted)"),
                id, categoryName, deleted != null ? deleted : 0);
    }

    /**
     * 统计未删除分类数
     *
     * @return 数量
     */
    public long countActive() {
        try {
            Long count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM stat_category WHERE deleted = 0", Long.class);
            return count != null ? count : 0L;
        } catch (Exception e) {
            log.warn("统计分类数量失败：{}", e.getMessage());
            return 0L;
        }
    }

    /**
     * 查询有效分类 id→name 映射
     *
     * @return 映射
     */
    public Map<Long, String> findActiveNameMap() {
        Map<Long, String> nameMap = new HashMap<>();
        try {
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                    "SELECT id, category_name FROM stat_category WHERE deleted = 0");
            if (rows != null) {
                for (Map<String, Object> row : rows) {
                    Long id = toLong(row.get("id"));
                    String name = (String) row.get("category_name");
                    if (id != null) {
                        nameMap.put(id, name != null ? name : "未命名");
                    }
                }
            }
        } catch (Exception e) {
            log.warn("构建分类名称映射失败：{}", e.getMessage());
        }
        return nameMap;
    }

    /**
     * 安全转 Long
     *
     * @param value 原始值
     * @return Long 或 null
     */
    private Long toLong(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        return Long.parseLong(value.toString());
    }
}
