-- =====================================================
-- 迁移脚本：为 kb_document 表添加 team_id 字段
-- 用途：支持文档关联团队空间
-- =====================================================

SET NAMES utf8mb4;
USE `kb_document`;

ALTER TABLE `kb_document`
  ADD COLUMN `team_id` BIGINT DEFAULT NULL COMMENT '团队空间ID' AFTER `category_id`;

ALTER TABLE `kb_document`
  ADD INDEX `idx_team_id` (`team_id`);

SELECT 'team_id 字段添加完成！' AS message;
