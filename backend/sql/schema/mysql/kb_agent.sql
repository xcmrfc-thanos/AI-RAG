-- =====================================================
-- kb_agent 数据库 — Agent 工作流（任务 64/65）
-- 可重复执行；无历史数据迁移
-- =====================================================

SET NAMES utf8mb4;
USE `kb_agent`;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `agent_run_step`;
DROP TABLE IF EXISTS `agent_run`;
DROP TABLE IF EXISTS `agent_session`;
DROP TABLE IF EXISTS `agent_workflow_version`;
DROP TABLE IF EXISTS `agent_workflow`;

CREATE TABLE `agent_workflow` (
  `id` BIGINT NOT NULL COMMENT '工作流 ID',
  `name` VARCHAR(128) NOT NULL COMMENT '名称',
  `owner_user_id` BIGINT NOT NULL COMMENT '所有者用户 ID',
  `draft_json` MEDIUMTEXT NULL COMMENT '当前草稿 JSON（可变）',
  `published_version_id` BIGINT NULL COMMENT '当前已发布版本 ID',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted` TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_owner` (`owner_user_id`),
  KEY `idx_published_version` (`published_version_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Agent 工作流稳定身份';

CREATE TABLE `agent_workflow_version` (
  `id` BIGINT NOT NULL COMMENT '版本 ID（不可变）',
  `workflow_id` BIGINT NOT NULL COMMENT '工作流 ID',
  `schema_version` INT NOT NULL DEFAULT 1 COMMENT 'JSON schemaVersion',
  `definition_json` MEDIUMTEXT NOT NULL COMMENT '工作流 JSON 快照',
  `published_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `published_by` BIGINT NOT NULL COMMENT '发布人用户 ID',
  PRIMARY KEY (`id`),
  KEY `idx_workflow` (`workflow_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Agent 不可变已发布版本';

CREATE TABLE `agent_session` (
  `id` BIGINT NOT NULL COMMENT '会话 ID',
  `user_id` BIGINT NOT NULL COMMENT '用户 ID',
  `title` VARCHAR(200) NULL COMMENT '标题（可选）',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted` TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Agent Run 分组（无多轮记忆）';

CREATE TABLE `agent_run` (
  `id` BIGINT NOT NULL COMMENT 'Run ID',
  `workflow_version_id` BIGINT NULL COMMENT '发布 Run 绑定的不可变版本；草稿 Run 为空',
  `run_source` VARCHAR(16) NOT NULL DEFAULT 'PUBLISHED' COMMENT 'PUBLISHED|DRAFT',
  `user_id` BIGINT NOT NULL COMMENT '发起用户',
  `session_id` BIGINT NULL COMMENT '可选会话',
  `input_json` MEDIUMTEXT NULL COMMENT 'Run 输入',
  `output_json` MEDIUMTEXT NULL COMMENT 'Run 输出',
  `status` VARCHAR(32) NOT NULL COMMENT 'CREATED|RUNNING|SUCCEEDED|FAILED|TIMED_OUT|CANCELLED',
  `error_code` VARCHAR(64) NULL,
  `error_message` VARCHAR(1000) NULL,
  `idempotency_key` VARCHAR(128) NULL COMMENT '幂等键',
  `cancel_requested` TINYINT NOT NULL DEFAULT 0 COMMENT '协作式取消标记',
  `started_at` DATETIME NULL,
  `finished_at` DATETIME NULL,
  `duration_ms` BIGINT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_idempotency` (`user_id`, `idempotency_key`),
  KEY `idx_version` (`workflow_version_id`),
  KEY `idx_user_status` (`user_id`, `status`),
  KEY `idx_session` (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Agent 一次执行';

CREATE TABLE `agent_run_step` (
  `id` BIGINT NOT NULL COMMENT 'Step ID',
  `run_id` BIGINT NOT NULL COMMENT 'Run ID',
  `node_id` VARCHAR(64) NOT NULL COMMENT '工作流节点 id',
  `node_type` VARCHAR(16) NOT NULL COMMENT 'tool|llm',
  `tool_name` VARCHAR(64) NULL COMMENT '工具名（tool 节点）',
  `status` VARCHAR(32) NOT NULL COMMENT '节点状态',
  `input_snapshot` MEDIUMTEXT NULL,
  `output_snapshot` MEDIUMTEXT NULL,
  `error_message` VARCHAR(1000) NULL,
  `started_at` DATETIME NULL,
  `finished_at` DATETIME NULL,
  `duration_ms` BIGINT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_run` (`run_id`),
  KEY `idx_run_node` (`run_id`, `node_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Agent 节点级执行轨迹';

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'kb_agent 五表创建完成' AS message;
