-- 添加自动保存草稿确认标记字段
-- 用于标记用户是否已放弃恢复自动保存的草稿
ALTER TABLE kb_document ADD COLUMN auto_save_dismissed tinyint(1) DEFAULT 0 COMMENT '自动保存草稿已确认（0-未确认，1-用户已放弃恢复）';
