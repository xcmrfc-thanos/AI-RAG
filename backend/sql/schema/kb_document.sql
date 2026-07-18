-- =====================================================
-- kb_document 数据库 - 文档管理服务
-- =====================================================

SET NAMES utf8mb4;
USE `kb_document`;
SET FOREIGN_KEY_CHECKS = 0;

-- 文档分类表
DROP TABLE IF EXISTS `kb_category`;
CREATE TABLE `kb_category` (
  `id` BIGINT NOT NULL COMMENT '分类ID',
  `category_name` VARCHAR(50) NOT NULL COMMENT '分类名称',
  `category_code` VARCHAR(50) DEFAULT NULL COMMENT '分类编码',
  `parent_id` BIGINT NOT NULL DEFAULT 0 COMMENT '父分类ID',
  `category_icon` VARCHAR(50) DEFAULT 'tech' COMMENT '分类图标标识',
  `description` VARCHAR(500) DEFAULT NULL COMMENT '分类描述',
  `sort` INT NOT NULL DEFAULT 0 COMMENT '排序号',
  `document_count` INT NOT NULL DEFAULT 0 COMMENT '文档数量',
  `remark` VARCHAR(500) DEFAULT NULL COMMENT '备注',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT DEFAULT NULL COMMENT '创建人',
  `update_by` BIGINT DEFAULT NULL COMMENT '更新人',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标识',
  PRIMARY KEY (`id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_category_code` (`category_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档分类表';

-- 文档标签表（与 Tag 实体 / TagMapper 对齐）
DROP TABLE IF EXISTS `kb_tag`;
CREATE TABLE `kb_tag` (
  `id` BIGINT NOT NULL COMMENT '标签ID',
  `tag_name` VARCHAR(50) NOT NULL COMMENT '标签名称',
  `tag_code` VARCHAR(50) DEFAULT NULL COMMENT '标签编码',
  `category_id` BIGINT DEFAULT NULL COMMENT '所属分类ID',
  `tag_type` TINYINT NOT NULL DEFAULT 1 COMMENT '标签类型',
  `color` VARCHAR(20) DEFAULT '#1890ff' COMMENT '颜色',
  `icon` VARCHAR(50) DEFAULT NULL COMMENT '图标',
  `doc_count` INT NOT NULL DEFAULT 0 COMMENT '文档数量',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态',
  `version` INT NOT NULL DEFAULT 0 COMMENT '版本号',
  `tag_color` VARCHAR(20) DEFAULT '#1890ff' COMMENT '颜色（兼容旧数据）',
  `description` VARCHAR(200) DEFAULT NULL COMMENT '标签描述',
  `use_count` INT NOT NULL DEFAULT 0 COMMENT '使用次数（兼容旧数据）',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT DEFAULT NULL COMMENT '创建人',
  `update_by` BIGINT DEFAULT NULL COMMENT '更新人',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标识',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tag_name` (`tag_name`, `deleted`),
  KEY `idx_tag_code` (`tag_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档标签表';

-- 文档表（与 Document 实体对齐；正文存 MongoDB，content 列保留兼容旧数据）
DROP TABLE IF EXISTS `kb_document`;
CREATE TABLE `kb_document` (
  `id` BIGINT NOT NULL COMMENT '文档ID',
  `title` VARCHAR(200) NOT NULL COMMENT '文档标题',
  `summary` TEXT DEFAULT NULL COMMENT '文档摘要',
  `content_id` VARCHAR(64) DEFAULT NULL COMMENT 'MongoDB内容ID',
  `content_length` INT DEFAULT NULL COMMENT '内容长度',
  `document_type` TINYINT NOT NULL DEFAULT 1 COMMENT '文档类型（1文章2文件）',
  `file_path` VARCHAR(500) DEFAULT NULL COMMENT '文件路径',
  `file_size` BIGINT DEFAULT NULL COMMENT '文件大小',
  `file_extension` VARCHAR(20) DEFAULT NULL COMMENT '文件扩展名',
  `mime_type` VARCHAR(100) DEFAULT NULL COMMENT 'MIME类型',
  `content` LONGTEXT COMMENT '文档内容（兼容旧数据，新文档存MongoDB）',
  `category_id` BIGINT DEFAULT NULL COMMENT '分类ID',
  `team_id` BIGINT DEFAULT NULL COMMENT '团队空间ID',
  `tags` VARCHAR(500) DEFAULT NULL COMMENT '标签（逗号分隔）',
  `author_id` BIGINT NOT NULL COMMENT '作者ID',
  `author_name` VARCHAR(50) DEFAULT NULL COMMENT '作者姓名（冗余字段）',
  `cover_image` VARCHAR(500) DEFAULT NULL COMMENT '封面图片',
  `source` TINYINT DEFAULT 1 COMMENT '来源（1原创2转载3翻译）',
  `source_url` VARCHAR(500) DEFAULT NULL COMMENT '来源URL',
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '状态（0草稿1已发布2已归档3待审核）',
  `is_public` TINYINT NOT NULL DEFAULT 1 COMMENT '是否公开',
  `is_top` TINYINT NOT NULL DEFAULT 0 COMMENT '是否置顶',
  `is_recommend` TINYINT NOT NULL DEFAULT 0 COMMENT '是否推荐',
  `allow_comment` TINYINT NOT NULL DEFAULT 1 COMMENT '允许评论',
  `view_count` INT NOT NULL DEFAULT 0 COMMENT '浏览次数',
  `like_count` INT NOT NULL DEFAULT 0 COMMENT '点赞次数',
  `favorite_count` INT NOT NULL DEFAULT 0 COMMENT '收藏次数',
  `comment_count` INT NOT NULL DEFAULT 0 COMMENT '评论次数',
  `sort` INT NOT NULL DEFAULT 0 COMMENT '排序',
  `auto_save_dismissed` TINYINT NOT NULL DEFAULT 0 COMMENT '自动保存草稿已确认',
  `remark` VARCHAR(500) DEFAULT NULL COMMENT '备注',
  `version` INT NOT NULL DEFAULT 1 COMMENT '版本号',
  `word_count` INT DEFAULT NULL COMMENT '字数（兼容旧数据）',
  `publish_time` DATETIME DEFAULT NULL COMMENT '发布时间',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT DEFAULT NULL COMMENT '创建人',
  `update_by` BIGINT DEFAULT NULL COMMENT '更新人',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标识',
  PRIMARY KEY (`id`),
  KEY `idx_title` (`title`(100)),
  KEY `idx_category_id` (`category_id`),
  KEY `idx_team_id` (`team_id`),
  KEY `idx_author_id` (`author_id`),
  KEY `idx_status` (`status`),
  KEY `idx_publish_time` (`publish_time`),
  FULLTEXT KEY `ft_content` (`title`, `content`, `summary`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档表';

-- 文档标签关联表
DROP TABLE IF EXISTS `kb_document_tag`;
CREATE TABLE `kb_document_tag` (
  `id` BIGINT NOT NULL COMMENT '主键ID',
  `document_id` BIGINT NOT NULL COMMENT '文档ID',
  `tag_id` BIGINT NOT NULL COMMENT '标签ID',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_document_tag` (`document_id`, `tag_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档标签关联表';

-- 文档版本表（与 DocumentVersion 实体对齐）
DROP TABLE IF EXISTS `kb_document_version`;
CREATE TABLE `kb_document_version` (
  `id` BIGINT NOT NULL COMMENT '版本ID',
  `document_id` BIGINT NOT NULL COMMENT '文档ID',
  `version` INT NOT NULL COMMENT '版本号',
  `title` VARCHAR(200) NOT NULL COMMENT '文档标题',
  `content` LONGTEXT NOT NULL COMMENT '文档内容',
  `summary` TEXT DEFAULT NULL COMMENT '文档摘要',
  `change_description` VARCHAR(500) DEFAULT NULL COMMENT '变更说明',
  `change_size` BIGINT DEFAULT NULL COMMENT '变更大小',
  `operator_id` BIGINT DEFAULT NULL COMMENT '操作人ID',
  `operator_name` VARCHAR(50) DEFAULT NULL COMMENT '操作人姓名',
  `change_log` VARCHAR(500) DEFAULT NULL COMMENT '变更说明（兼容旧数据）',
  `author_id` BIGINT DEFAULT NULL COMMENT '作者ID（兼容旧数据）',
  `author_name` VARCHAR(50) DEFAULT NULL COMMENT '作者姓名（兼容旧数据）',
  `is_current` TINYINT NOT NULL DEFAULT 0 COMMENT '是否当前版本',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_doc_version` (`document_id`, `version`),
  KEY `idx_document_id` (`document_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档版本表';

-- 文档评论表（与 Comment 实体对齐）
DROP TABLE IF EXISTS `kb_comment`;
CREATE TABLE `kb_comment` (
  `id` BIGINT NOT NULL COMMENT '评论ID',
  `document_id` BIGINT NOT NULL COMMENT '文档ID',
  `content` TEXT NOT NULL COMMENT '评论内容',
  `user_id` BIGINT NOT NULL COMMENT '评论用户ID',
  `user_name` VARCHAR(50) DEFAULT NULL COMMENT '用户姓名（冗余字段）',
  `user_avatar` VARCHAR(500) DEFAULT NULL COMMENT '用户头像（冗余字段）',
  `parent_id` BIGINT NOT NULL DEFAULT 0 COMMENT '父评论ID',
  `root_id` BIGINT NOT NULL DEFAULT 0 COMMENT '根评论ID',
  `reply_to_id` BIGINT DEFAULT NULL COMMENT '回复的评论ID',
  `reply_to_name` VARCHAR(50) DEFAULT NULL COMMENT '回复给谁（冗余字段）',
  `like_count` INT NOT NULL DEFAULT 0 COMMENT '点赞数',
  `reply_count` INT NOT NULL DEFAULT 0 COMMENT '回复数',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT DEFAULT NULL COMMENT '创建人',
  `update_by` BIGINT DEFAULT NULL COMMENT '更新人',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标识',
  PRIMARY KEY (`id`),
  KEY `idx_document_id` (`document_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_parent_id` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档评论表';

-- 文档审核记录表（代码使用 tb_document_review）
DROP TABLE IF EXISTS `tb_document_review`;
CREATE TABLE `tb_document_review` (
  `id` BIGINT NOT NULL COMMENT '审核记录ID',
  `document_id` BIGINT NOT NULL COMMENT '文档ID',
  `reviewer_id` BIGINT DEFAULT NULL COMMENT '审核人ID',
  `reviewer_name` VARCHAR(50) DEFAULT NULL COMMENT '审核人姓名',
  `review_result` TINYINT DEFAULT NULL COMMENT '审核结果：1通过2驳回，NULL待审核',
  `review_comment` TEXT DEFAULT NULL COMMENT '审核意见',
  `before_status` TINYINT DEFAULT NULL COMMENT '审核前状态',
  `reviewed_at` DATETIME DEFAULT NULL COMMENT '审核时间',
  `review_round` INT NOT NULL DEFAULT 1 COMMENT '审核轮次',
  `review_level` TINYINT NOT NULL DEFAULT 1 COMMENT '审核级别',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_document_id` (`document_id`),
  KEY `idx_reviewer_id` (`reviewer_id`),
  KEY `idx_review_result_created` (`review_result`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档审核记录表';

-- 点赞表
DROP TABLE IF EXISTS `kb_like`;
CREATE TABLE `kb_like` (
  `id` BIGINT NOT NULL COMMENT '点赞ID',
  `target_id` BIGINT NOT NULL COMMENT '目标ID',
  `target_type` TINYINT NOT NULL COMMENT '目标类型：1文档2评论',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_target_user_type` (`target_id`, `user_id`, `target_type`),
  KEY `idx_target_id` (`target_id`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='点赞表';

-- 文档访问记录表
DROP TABLE IF EXISTS `kb_document_access`;
CREATE TABLE `kb_document_access` (
  `id` BIGINT NOT NULL COMMENT '访问记录ID',
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `document_id` BIGINT NOT NULL COMMENT '文档ID',
  `document_title` VARCHAR(200) DEFAULT NULL COMMENT '文档标题',
  `category_id` BIGINT DEFAULT NULL COMMENT '分类ID',
  `category_name` VARCHAR(100) DEFAULT NULL COMMENT '分类名称',
  `access_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '访问时间',
  `ip_address` VARCHAR(50) DEFAULT NULL COMMENT '访问IP地址',
  `user_agent` VARCHAR(500) DEFAULT NULL COMMENT '用户代理',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `created_by` BIGINT DEFAULT NULL COMMENT '创建人',
  `updated_by` BIGINT DEFAULT NULL COMMENT '更新人',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标识',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_user_document` (`user_id`, `document_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_document_id` (`document_id`),
  KEY `idx_access_time` (`access_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档访问记录表';

-- 文档分享表
DROP TABLE IF EXISTS `kb_document_share`;
CREATE TABLE `kb_document_share` (
  `id` BIGINT NOT NULL COMMENT '主键ID',
  `share_id` VARCHAR(64) NOT NULL COMMENT '分享标识',
  `document_id` BIGINT NOT NULL COMMENT '文档ID',
  `title` VARCHAR(200) DEFAULT NULL COMMENT '分享标题',
  `share_type` TINYINT NOT NULL DEFAULT 1 COMMENT '分享类型',
  `share_code` VARCHAR(32) DEFAULT NULL COMMENT '分享码',
  `expire_type` TINYINT NOT NULL DEFAULT 1 COMMENT '有效期类型',
  `expire_time` DATETIME DEFAULT NULL COMMENT '过期时间',
  `access_limit` INT NOT NULL DEFAULT 0 COMMENT '访问次数限制',
  `access_count` INT NOT NULL DEFAULT 0 COMMENT '已访问次数',
  `require_password` TINYINT NOT NULL DEFAULT 0 COMMENT '是否需要密码',
  `password` VARCHAR(128) DEFAULT NULL COMMENT '访问密码',
  `sharer_id` BIGINT NOT NULL COMMENT '分享人ID',
  `sharer_name` VARCHAR(50) DEFAULT NULL COMMENT '分享人名称',
  `description` VARCHAR(500) DEFAULT NULL COMMENT '分享描述',
  `status` TINYINT NOT NULL DEFAULT 0 COMMENT '状态',
  `share_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '分享时间',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT DEFAULT NULL COMMENT '创建人',
  `update_by` BIGINT DEFAULT NULL COMMENT '更新人',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标识',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_share_id` (`share_id`),
  KEY `idx_document_id` (`document_id`),
  KEY `idx_sharer_id` (`sharer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档分享表';

-- 文件元数据表
DROP TABLE IF EXISTS `kb_file_metadata`;
CREATE TABLE `kb_file_metadata` (
  `id` BIGINT NOT NULL COMMENT '文件ID',
  `file_name` VARCHAR(255) NOT NULL COMMENT '存储文件名',
  `original_file_name` VARCHAR(255) NOT NULL COMMENT '原始文件名',
  `file_extension` VARCHAR(20) DEFAULT NULL COMMENT '扩展名',
  `file_size` BIGINT NOT NULL DEFAULT 0 COMMENT '文件大小',
  `content_type` VARCHAR(100) DEFAULT NULL COMMENT 'MIME类型',
  `storage_path` VARCHAR(500) NOT NULL COMMENT '存储路径',
  `access_url` VARCHAR(500) DEFAULT NULL COMMENT '访问URL',
  `file_category` VARCHAR(50) DEFAULT 'other' COMMENT '文件分类',
  `uploader_id` BIGINT NOT NULL COMMENT '上传用户ID',
  `uploader_name` VARCHAR(50) DEFAULT NULL COMMENT '上传用户名称',
  `file_md5` VARCHAR(64) DEFAULT NULL COMMENT 'MD5',
  `file_sha256` VARCHAR(128) DEFAULT NULL COMMENT 'SHA256',
  `width` INT DEFAULT NULL COMMENT '图片宽度',
  `height` INT DEFAULT NULL COMMENT '图片高度',
  `thumbnail_url` VARCHAR(500) DEFAULT NULL COMMENT '缩略图URL',
  `is_public` TINYINT NOT NULL DEFAULT 0 COMMENT '是否公开',
  `download_count` INT NOT NULL DEFAULT 0 COMMENT '下载次数',
  `last_access_time` DATETIME DEFAULT NULL COMMENT '最后访问时间',
  `upload_status` VARCHAR(20) DEFAULT 'completed' COMMENT '上传状态',
  `error_message` VARCHAR(500) DEFAULT NULL COMMENT '错误信息',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT DEFAULT NULL COMMENT '创建人',
  `update_by` BIGINT DEFAULT NULL COMMENT '更新人',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '删除标识',
  PRIMARY KEY (`id`),
  KEY `idx_uploader_id` (`uploader_id`),
  KEY `idx_file_category` (`file_category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文件元数据表';

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'kb_document 数据库表创建完成！' AS message;
