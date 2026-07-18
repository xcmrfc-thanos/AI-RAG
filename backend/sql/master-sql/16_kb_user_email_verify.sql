-- =====================================================
-- kb_user 数据库 - 邮箱验证字段升级
-- =====================================================

SET NAMES utf8mb4;
USE `kb_user`;

-- 邮箱验证相关字段
ALTER TABLE `kb_user`
    ADD COLUMN `email_verified` TINYINT NOT NULL DEFAULT 0 COMMENT '邮箱是否已验证：0-未验证，1-已验证' AFTER `email`,
    ADD COLUMN `activation_token` VARCHAR(255) DEFAULT NULL COMMENT '账户激活令牌' AFTER `email_verified`,
    ADD COLUMN `activation_token_expiry` DATETIME DEFAULT NULL COMMENT '激活令牌过期时间' AFTER `activation_token`;

SELECT 'kb_user 邮箱验证字段升级完成！' AS message;
