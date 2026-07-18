-- Agent 草稿试运行增量迁移；可在已有 kb_agent 数据库上执行
SET NAMES utf8mb4;
USE `kb_agent`;

ALTER TABLE `agent_run`
  MODIFY COLUMN `workflow_version_id` BIGINT NULL
  COMMENT '发布 Run 绑定的不可变版本；草稿 Run 为空';

SET @run_source_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'kb_agent'
    AND TABLE_NAME = 'agent_run'
    AND COLUMN_NAME = 'run_source'
);
SET @run_source_sql = IF(
  @run_source_exists = 0,
  'ALTER TABLE `agent_run` ADD COLUMN `run_source` VARCHAR(16) NOT NULL DEFAULT ''PUBLISHED'' COMMENT ''PUBLISHED|DRAFT'' AFTER `workflow_version_id`',
  'SELECT 1'
);
PREPARE run_source_stmt FROM @run_source_sql;
EXECUTE run_source_stmt;
DEALLOCATE PREPARE run_source_stmt;
