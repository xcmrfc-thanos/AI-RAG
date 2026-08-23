-- =====================================================
-- 第8阶段模型库增量脚本：kb_model_provider / kb_model
-- 用途：已有 kb_foundation 库升级（全新部署直接跑 schema/mysql/kb_foundation.sql）
-- 用法：mysql -uroot -p < patch_model_encrypt.sql
-- 注意：本脚本不删除旧表（增量安全）；重复执行需人工处理已存在表
-- =====================================================

SET NAMES utf8mb4;
USE `kb_foundation`;

-- ---------- 1. 模型提供方表 ----------
CREATE TABLE IF NOT EXISTS `kb_model_provider` (
  `id` BIGINT NOT NULL COMMENT '主键（雪花ID）',
  `provider_key` VARCHAR(50) NOT NULL COMMENT '提供方标识：qwen/siliconflow/deepseek/custom/openai/ollama',
  `provider_name` VARCHAR(100) NOT NULL COMMENT '显示名（通义千问/硅基流动…）',
  `base_url` VARCHAR(500) DEFAULT NULL COMMENT 'OpenAI 兼容基址（custom 必填）',
  `api_key` TEXT DEFAULT NULL COMMENT 'API Key 密文（enc:v1:...，AES-GCM）',
  `api_key_hint` VARCHAR(20) DEFAULT NULL COMMENT '掩码提示（sk-****abcd）',
  `extra_params` JSON DEFAULT NULL COMMENT '预留参数（超时/代理等）',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0-禁用，1-启用',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT DEFAULT NULL COMMENT '创建人ID',
  `update_by` BIGINT DEFAULT NULL COMMENT '更新人ID',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除：0未删1已删',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_provider_key` (`provider_key`, `deleted`),
  KEY `idx_provider_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模型提供方（第8阶段模型库）';

-- ---------- 2. 模型条目表 ----------
CREATE TABLE IF NOT EXISTS `kb_model` (
  `id` BIGINT NOT NULL COMMENT '主键（雪花ID）',
  `provider_id` BIGINT NOT NULL COMMENT '提供方ID（关联 kb_model_provider.id）',
  `model_key` VARCHAR(100) NOT NULL COMMENT '物理模型名（qwen3-max/BAAI-bge-m3/qwen3-rerank）',
  `model_type` VARCHAR(20) NOT NULL COMMENT '类型：chat/embedding/rerank/tts/stt/image/other',
  `display_name` VARCHAR(100) DEFAULT NULL COMMENT '下拉显示名',
  `is_default` TINYINT NOT NULL DEFAULT 0 COMMENT '是否该类型默认：0-否，1-是（每类型至多一个）',
  `dimension` INT DEFAULT NULL COMMENT 'embedding 维度（供检索对齐）',
  `model_config` JSON DEFAULT NULL COMMENT '预留参数（max_tokens/temperature/top_p 等）',
  `status` TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0-禁用，1-启用',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` BIGINT DEFAULT NULL COMMENT '创建人ID',
  `update_by` BIGINT DEFAULT NULL COMMENT '更新人ID',
  `deleted` TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除：0未删1已删',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_model_key_type` (`model_key`, `model_type`, `deleted`),
  KEY `idx_model_provider` (`provider_id`),
  KEY `idx_model_type` (`model_type`),
  KEY `idx_model_default` (`model_type`, `is_default`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模型条目（第8阶段模型库）';

SELECT 'patch_model_encrypt 完成：kb_model_provider / kb_model 已创建' AS message;
