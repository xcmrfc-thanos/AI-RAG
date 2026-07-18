package com.knowledge.base.common.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * Core 域统计投影事件 DTO（kb-core → kb-statistics，P3-1b）。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CoreStatisticsProjectionEventDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String eventType;

    private Long documentId;
    private String title;
    private Long authorId;
    private Long categoryId;
    private Integer status;
    private Long viewCount;
    private Long likeCount;
    private Long favoriteCount;
    private String summary;
    private Integer deleted;

    /** 文档是否公开（0/1），供热门/最新 ACL；与下方 teamId 共用文档团队字段 */
    private Integer isPublic;

    private Long userId;
    private String username;
    private String realName;
    private String avatar;
    private Integer userStatus;

    private Long commentId;

    private String categoryName;

    private Long roleId;
    private String roleName;
    private String roleCode;
    private Integer roleStatus;

    private Long teamId;
    private String teamName;
    private String teamCode;
    private Integer teamStatus;

    private LocalDateTime timestamp;
}
