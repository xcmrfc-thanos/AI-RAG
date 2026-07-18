-- =====================================================
-- 迁移脚本：将分类图标从 emoji 迁移到图标标识 key
-- 适用场景：已有数据库升级，将旧 emoji 图标映射为新图标 key
-- =====================================================

SET NAMES utf8mb4;
USE `kb_document`;

-- 一级分类映射
UPDATE `kb_category` SET `category_icon` = 'tech'         WHERE `category_icon` = '💻';
UPDATE `kb_category` SET `category_icon` = 'product'      WHERE `category_icon` = '📦';
UPDATE `kb_category` SET `category_icon` = 'business'     WHERE `category_icon` = '📋';
UPDATE `kb_category` SET `category_icon` = 'hr'           WHERE `category_icon` = '👥';
UPDATE `kb_category` SET `category_icon` = 'finance'      WHERE `category_icon` = '💰';
UPDATE `kb_category` SET `category_icon` = 'marketing'    WHERE `category_icon` = '📈';
UPDATE `kb_category` SET `category_icon` = 'legal'        WHERE `category_icon` = '⚖️';
UPDATE `kb_category` SET `category_icon` = 'training'     WHERE `category_icon` = '📚';

-- 技术文档子分类映射
UPDATE `kb_category` SET `category_icon` = 'backend'      WHERE `category_icon` = '🔧';
UPDATE `kb_category` SET `category_icon` = 'frontend'     WHERE `category_icon` = '🎨';
UPDATE `kb_category` SET `category_icon` = 'database'     WHERE `category_icon` = '🗄️';
UPDATE `kb_category` SET `category_icon` = 'devops'       WHERE `category_icon` = '🚀';
UPDATE `kb_category` SET `category_icon` = 'architecture' WHERE `category_icon` = '🏗️';

-- 产品文档子分类映射
UPDATE `kb_category` SET `category_icon` = 'requirement'  WHERE `category_icon` = '📝';
UPDATE `kb_category` SET `category_icon` = 'design'       WHERE `category_icon` = '🎭';
UPDATE `kb_category` SET `category_icon` = 'planning'     WHERE `category_icon` = '🎯';
UPDATE `kb_category` SET `category_icon` = 'competitive'  WHERE `category_icon` = '🔍';

-- 默认 emoji → tech
UPDATE `kb_category` SET `category_icon` = 'tech'         WHERE `category_icon` = '📁';

SELECT '分类图标迁移完成！' AS message;
