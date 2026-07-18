-- 011: 统一样例账号密码为 admin123（hutool BCrypt）
-- 旧 hash $2a$10$N.zmdr9k7uOCQb376NoUnu... 实际对应 123456，与文档/import-dev-data 不一致

USE kb_user;

UPDATE kb_user
SET password = '$2a$10$SS1R3ynbhj3ZpM1Ikyt82.NoLanFbRaKP/bF8rtxz4EhobVssx9o.'
WHERE password = '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi';
