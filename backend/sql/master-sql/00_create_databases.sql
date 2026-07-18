-- =====================================================
-- 企业知识库系统 - 创建所有微服务数据库
-- =====================================================

SET NAMES utf8mb4;

-- 删除已存在的数据库（谨慎使用！）
-- DROP DATABASE IF EXISTS kb_user;
-- DROP DATABASE IF EXISTS kb_document;
-- DROP DATABASE IF EXISTS kb_search;
-- DROP DATABASE IF EXISTS kb_file;
-- DROP DATABASE IF EXISTS kb_ai;
-- DROP DATABASE IF EXISTS kb_statistics;
-- DROP DATABASE IF EXISTS kb_notification;
-- DROP DATABASE IF EXISTS kb_graph;
-- DROP DATABASE IF EXISTS kb_common;

-- 创建所有微服务数据库
CREATE DATABASE IF NOT EXISTS `kb_user`
DEFAULT CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS `kb_document`
DEFAULT CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS `kb_search`
DEFAULT CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS `kb_file`
DEFAULT CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS `kb_ai`
DEFAULT CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS `kb_statistics`
DEFAULT CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS `kb_notification`
DEFAULT CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS `kb_graph`
DEFAULT CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS `kb_common`
DEFAULT CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

-- 基础服务数据库（合并kb_common和kb_notification）
CREATE DATABASE IF NOT EXISTS `kb_foundation`
DEFAULT CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

-- 创建独立的数据库用户（可选，用于生产环境）

-- 用户认证服务用户
CREATE USER IF NOT EXISTS 'kb_user_service'@'%' IDENTIFIED BY 'kb_user_2024';
GRANT ALL PRIVILEGES ON kb_user.* TO 'kb_user_service'@'%';

-- 文档管理服务用户
CREATE USER IF NOT EXISTS 'kb_document_service'@'%' IDENTIFIED BY 'kb_document_2024';
GRANT ALL PRIVILEGES ON kb_document.* TO 'kb_document_service'@'%';

-- 搜索服务用户
CREATE USER IF NOT EXISTS 'kb_search_service'@'%' IDENTIFIED BY 'kb_search_2024';
GRANT ALL PRIVILEGES ON kb_search.* TO 'kb_search_service'@'%';

-- 文件服务用户
CREATE USER IF NOT EXISTS 'kb_file_service'@'%' IDENTIFIED BY 'kb_file_2024';
GRANT ALL PRIVILEGES ON kb_file.* TO 'kb_file_service'@'%';

-- AI服务用户
CREATE USER IF NOT EXISTS 'kb_ai_service'@'%' IDENTIFIED BY 'kb_ai_2024';
GRANT ALL PRIVILEGES ON kb_ai.* TO 'kb_ai_service'@'%';

-- 统计服务用户
CREATE USER IF NOT EXISTS 'kb_statistics_service'@'%' IDENTIFIED BY 'kb_statistics_2024';
GRANT ALL PRIVILEGES ON kb_statistics.* TO 'kb_statistics_service'@'%';

-- 通知服务用户
CREATE USER IF NOT EXISTS 'kb_notification_service'@'%' IDENTIFIED BY 'kb_notification_2024';
GRANT ALL PRIVILEGES ON kb_notification.* TO 'kb_notification_service'@'%';

-- 图谱服务用户
CREATE USER IF NOT EXISTS 'kb_graph_service'@'%' IDENTIFIED BY 'kb_graph_2024';
GRANT ALL PRIVILEGES ON kb_graph.* TO 'kb_graph_service'@'%';

-- 公共模块用户（所有服务只读权限）
CREATE USER IF NOT EXISTS 'kb_common_reader'@'%' IDENTIFIED BY 'kb_common_2024';
GRANT SELECT ON kb_common.* TO 'kb_common_reader'@'%';

-- 基础服务用户
CREATE USER IF NOT EXISTS 'kb_foundation_service'@'%' IDENTIFIED BY 'kb_foundation_2024';
GRANT ALL PRIVILEGES ON kb_foundation.* TO 'kb_foundation_service'@'%';

FLUSH PRIVILEGES;

-- 显示创建结果
SELECT '数据库创建完成！' AS message;
SHOW DATABASES LIKE 'kb_%';

SELECT '数据库用户创建完成！' AS message;
SELECT user, host FROM mysql.user WHERE user LIKE 'kb_%';
