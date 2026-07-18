package com.knowledge.base.document.support;

import com.knowledge.base.document.entity.Category;
import com.knowledge.base.document.entity.Document;
import com.knowledge.base.document.mapper.CategoryMapper;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 构建 ES 全文索引 payload
 *
 * <p>供文档生命周期事件携带，供 kb-search 直接写入索引。</p>
 *
 * @author knowledge-base-team
 * @since 1.0.0
 */
@Component
public class DocumentSearchIndexPayloadBuilder {

    @Resource
    private CategoryMapper categoryMapper;

    /**
     * 构建 kb-search 文档级索引 payload（仅元数据，不含正文）
     *
     * <p>正文检索由 kb_chunk 分块索引承担，避免截断导致深度关键词丢失。</p>
     *
     * @param document 文档实体
     * @param content  正文（保留参数以兼容调用方，不写入文档级索引）
     * @return 索引数据
     */
    public Map<String, Object> build(Document document, String content) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("id", document.getId());
        data.put("title", document.getTitle());
        data.put("summary", document.getSummary());
        data.put("categoryId", document.getCategoryId());
        data.put("tags", document.getTags());
        data.put("status", document.getStatus());
        data.put("isPublic", document.getIsPublic());
        data.put("viewCount", document.getViewCount());
        data.put("likeCount", document.getLikeCount());
        data.put("commentCount", document.getCommentCount());
        data.put("authorId", document.getAuthorId());
        data.put("teamId", document.getTeamId());
        data.put("author", Map.of(
                "id", document.getAuthorId() != null ? document.getAuthorId() : 0,
                "username", document.getAuthorName() != null ? document.getAuthorName() : ""
        ));
        data.put("publishTime", document.getPublishTime() != null ? document.getPublishTime().toString() : null);
        data.put("createdAt", document.getCreatedAt() != null ? document.getCreatedAt().toString() : null);
        data.put("updatedAt", document.getUpdatedAt() != null ? document.getUpdatedAt().toString() : null);

        if (document.getCategoryId() != null) {
            try {
                Category category = categoryMapper.selectById(document.getCategoryId());
                if (category != null) {
                    data.put("categoryName", category.getCategoryName());
                }
            } catch (Exception ignored) {
                // 分类查询失败不影响索引
            }
        }
        return data;
    }
}
