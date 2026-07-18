-- Token黑名单表
-- 用于存储退出登录后的JWT Token，防止被重复使用
CREATE TABLE IF NOT EXISTS tb_token_blacklist (
    id BIGINT PRIMARY KEY,
    token_hash VARCHAR(64) NOT NULL,
    expire_time DATETIME NOT NULL,
    created_at DATETIME DEFAULT NOW(),
    UNIQUE KEY uk_token_hash (token_hash),
    INDEX idx_expire_time (expire_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Token黑名单表';
