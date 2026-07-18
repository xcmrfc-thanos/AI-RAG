package com.knowledge.base.statistics.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 文档统计实体
 *
 * @author 苏三
 * @since 1.0.0
 */
@Data
@TableName("stat_document")
public class DocumentStatistics {

    /**
     * 主键ID
     */
    @TableId(type = IdType.AUTO)
    private Long id;

    /**
     * 标题
     */
    private String title;

    /**
     * 作者ID
     */
    private Long authorId;

    /**
     * 分类ID
     */
    private Long categoryId;

    /**
     * 状态
     */
    private Integer status;

    /**
     * 浏览次数
     */
    private Long viewCount;

    /**
     * 点赞数
     */
    private Long likeCount;

    /**
     * 收藏数
     */
    private Long favoriteCount;

    /**
     * 创建时间
     */
    private LocalDateTime createdAt;

    /**
     * 更新时间
     */
    private LocalDateTime updatedAt;

    /**
     * 摘要
     */
    private String summary;

    /**
     * 是否公开（0 私有 / 1 公开）
     */
    private Integer isPublic;

    /**
     * 所属团队 ID
     */
    private Long teamId;

    /**
     * 是否删除（0=未删除，1=已删除）
     */
    private Integer deleted;
}
