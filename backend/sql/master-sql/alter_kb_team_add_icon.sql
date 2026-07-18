-- =====================================================
-- 迁移脚本：为 kb_team 表添加 icon 字段
-- 适用场景：已有数据库升级
-- =====================================================

SET NAMES utf8mb4;
USE `kb_user`;

-- 添加 icon 列
ALTER TABLE `kb_team`
    ADD COLUMN `icon` VARCHAR(50) DEFAULT NULL COMMENT '团队图标标识'
    AFTER `description`;

-- 为已有团队数据初始化图标
UPDATE `kb_team` SET `icon` = 'tech' WHERE `team_code` = 'TECH_CENTER';
UPDATE `kb_team` SET `icon` = 'product' WHERE `team_code` = 'PRODUCT_CENTER';
UPDATE `kb_team` SET `icon` = 'ops' WHERE `team_code` = 'OPS_CENTER';
UPDATE `kb_team` SET `icon` = 'admin' WHERE `team_code` = 'ADMIN_CENTER';
UPDATE `kb_team` SET `icon` = 'backend' WHERE `team_code` = 'BACKEND_TEAM';
UPDATE `kb_team` SET `icon` = 'frontend' WHERE `team_code` = 'FRONTEND_TEAM';
UPDATE `kb_team` SET `icon` = 'qa' WHERE `team_code` = 'QA_TEAM';

SELECT 'kb_team 表 icon 字段添加完成！' AS message;
