-- ========================================
-- 修改 tb_document_review 表的 reviewer_id 为可空字段
-- 原因：提交审核时尚未分配审核人，审核人应在执行审核操作时填入
-- ========================================

USE kb_document;

ALTER TABLE `tb_document_review`
    MODIFY COLUMN `reviewer_id` BIGINT(20) NULL DEFAULT NULL COMMENT '审核人ID（提交审核时为NULL，审核时填入）';
