-- kb_document.content 改为可空（正文存 MongoDB，MySQL 仅兼容旧数据）
SET NAMES utf8mb4;
USE `kb_document`;

ALTER TABLE `kb_document`
    MODIFY COLUMN `content` LONGTEXT NULL COMMENT '文档内容（兼容旧数据，新文档存MongoDB）';

SELECT '005_fix_kb_document_content_nullable 执行完成' AS message;
