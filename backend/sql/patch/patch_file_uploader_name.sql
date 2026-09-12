-- =====================================================
-- 增量脚本：kb_file 增加上传者名称冗余列
-- 用途：已有库升级（全新部署直接跑 schema/{dialect}/kb_file.sql）
-- 说明：上传时从网关注入的可信头 X-User-Name 冗余落库，
--       历史数据该列为 NULL，列表展示时回退为“用户#{uploaderId}”
-- =====================================================

-- ---------- MySQL ----------
-- ALTER TABLE `kb_file`.`kb_file` ADD COLUMN `uploader_name` VARCHAR(50) DEFAULT NULL COMMENT '上传用户名称' AFTER `uploader_id`;

-- ---------- PostgreSQL ----------
-- ALTER TABLE kb_file ADD COLUMN uploader_name VARCHAR(50) DEFAULT NULL;

-- ---------- Oracle ----------
-- ALTER TABLE kb_file.kb_file ADD (uploader_name VARCHAR2(50));
