-- =====================================================
-- 企业知识库 — 4 BC 数据库（全新部署）
-- =====================================================

SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS `kb_user`
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS `kb_document`
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS `kb_file`
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS `kb_statistics`
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS `kb_foundation`
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS `kb_intelligence`
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS `kb_agent`
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 可选：服务专用账号（生产环境请修改密码）
CREATE USER IF NOT EXISTS 'kb_core_service'@'%' IDENTIFIED BY 'kb_core_2024';
GRANT ALL PRIVILEGES ON kb_user.* TO 'kb_core_service'@'%';
GRANT ALL PRIVILEGES ON kb_document.* TO 'kb_core_service'@'%';
GRANT ALL PRIVILEGES ON kb_foundation.* TO 'kb_core_service'@'%';

CREATE USER IF NOT EXISTS 'kb_file_service'@'%' IDENTIFIED BY 'kb_file_2024';
GRANT ALL PRIVILEGES ON kb_file.* TO 'kb_file_service'@'%';

CREATE USER IF NOT EXISTS 'kb_statistics_service'@'%' IDENTIFIED BY 'kb_statistics_2024';
GRANT ALL PRIVILEGES ON kb_statistics.* TO 'kb_statistics_service'@'%';

CREATE USER IF NOT EXISTS 'kb_intelligence_service'@'%' IDENTIFIED BY 'kb_intelligence_2024';
GRANT ALL PRIVILEGES ON kb_intelligence.* TO 'kb_intelligence_service'@'%';

CREATE USER IF NOT EXISTS 'kb_agent_service'@'%' IDENTIFIED BY 'kb_agent_2024';
GRANT ALL PRIVILEGES ON kb_agent.* TO 'kb_agent_service'@'%';

FLUSH PRIVILEGES;

SELECT '7 个业务库创建完成' AS message;
SHOW DATABASES LIKE 'kb_%';
