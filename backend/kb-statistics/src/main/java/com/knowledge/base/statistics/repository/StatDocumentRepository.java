package com.knowledge.base.statistics.repository;

import com.knowledge.base.common.config.SqlDialectHelper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * stat_document 投影表仓储
 */
@Slf4j
@Repository
@RequiredArgsConstructor
public class StatDocumentRepository {

    private final JdbcTemplate jdbcTemplate;
    private final SqlDialectHelper sqlDialectHelper;

    /**
     * Upsert 文档投影行（含 ACL 字段）
     *
     * @param id            文档 ID
     * @param title         标题
     * @param authorId      作者
     * @param categoryId    分类
     * @param status        状态
     * @param viewCount     浏览
     * @param likeCount     点赞
     * @param favoriteCount 收藏
     * @param summary       摘要
     * @param deleted       删除标记
     * @param isPublic      是否公开
     * @param teamId        团队
     */
    public void upsert(Long id, String title, Long authorId, Long categoryId, Integer status,
                       Long viewCount, Long likeCount, Long favoriteCount, String summary, Integer deleted,
                       Integer isPublic, Long teamId) {
        String now = sqlDialectHelper.currentTimestamp();
        jdbcTemplate.update(
                sqlDialectHelper.upsertSql(
                        "stat_document",
                        "id",
                        "id, title, author_id, category_id, status, view_count, like_count, "
                                + "favorite_count, summary, is_public, team_id, created_at, updated_at, deleted",
                        "?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, " + now + ", " + now + ", ?",
                        "title=VALUES(title), author_id=VALUES(author_id), "
                                + "category_id=VALUES(category_id), status=VALUES(status), "
                                + "view_count=VALUES(view_count), like_count=VALUES(like_count), "
                                + "favorite_count=VALUES(favorite_count), summary=VALUES(summary), "
                                + "is_public=VALUES(is_public), team_id=VALUES(team_id), "
                                + "updated_at=" + now + ", deleted=VALUES(deleted)"),
                id, title, authorId, categoryId, status,
                viewCount != null ? viewCount : 0L,
                likeCount != null ? likeCount : 0L,
                favoriteCount != null ? favoriteCount : 0L,
                summary,
                isPublic != null ? isPublic : 1,
                teamId,
                deleted != null ? deleted : 0);
    }

    /**
     * 兼容旧签名：缺省公开
     */
    public void upsert(Long id, String title, Long authorId, Long categoryId, Integer status,
                       Long viewCount, Long likeCount, Long favoriteCount, String summary, Integer deleted) {
        upsert(id, title, authorId, categoryId, status, viewCount, likeCount, favoriteCount, summary, deleted, 1, null);
    }

    /**
     * 标记文档投影删除
     */
    public void markDeleted(Long id) {
        jdbcTemplate.update(
                "UPDATE stat_document SET deleted = 1, updated_at = " + sqlDialectHelper.currentTimestamp() + " WHERE id = ?",
                id);
    }

    /**
     * 按 ID 批量查询摘要
     *
     * @param docIds 文档 ID 列表
     * @return id → summary
     */
    public Map<Long, String> findSummaryMapByIds(List<Long> docIds) {
        if (docIds == null || docIds.isEmpty()) {
            return Collections.emptyMap();
        }
        Map<Long, String> summaryMap = new HashMap<>();
        try {
            String placeholders = docIds.stream().map(id -> "?").collect(Collectors.joining(","));
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                    "SELECT id, summary FROM stat_document WHERE deleted = 0 AND id IN (" + placeholders + ")",
                    docIds.toArray());
            if (rows != null) {
                for (Map<String, Object> row : rows) {
                    Long id = toLong(row.get("id"));
                    String summary = (String) row.get("summary");
                    if (id != null) {
                        summaryMap.put(id, summary != null ? summary : "");
                    }
                }
            }
        } catch (Exception e) {
            log.warn("构建文档摘要映射失败：{}", e.getMessage());
        }
        return summaryMap;
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
