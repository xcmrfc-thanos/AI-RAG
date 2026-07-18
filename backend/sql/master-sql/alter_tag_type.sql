-- 优化标签类型字段，从VARCHAR改为TINYINT
-- 执行前请确保备份数据

-- 1. 添加新的整数类型字段
ALTER TABLE tb_tag ADD COLUMN tag_type_new TINYINT NOT NULL DEFAULT 1 COMMENT '标签类型：0-SYSTEM，1-USER' AFTER category_id;

-- 2. 迁移数据：SYSTEM字符串转为0，USER字符串转为1
UPDATE tb_tag SET tag_type_new = CASE
    WHEN tag_type = 'SYSTEM' THEN 0
    WHEN tag_type = 'USER' THEN 1
    ELSE 1
END;

-- 3. 删除旧字段
ALTER TABLE tb_tag DROP COLUMN tag_type;

-- 4. 重命名新字段
ALTER TABLE tb_tag CHANGE COLUMN tag_type_new tag_type TINYINT NOT NULL DEFAULT 1 COMMENT '标签类型：0-SYSTEM，1-用户标签';

-- 5. 更新索引（如果需要）
-- ALTER TABLE tb_tag DROP INDEX idx_tag_type;
-- CREATE INDEX idx_tag_type ON tb_tag(tag_type);
