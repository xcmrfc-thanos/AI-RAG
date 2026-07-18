-- =====================================================
-- kb_graph 数据库 - 知识图谱服务
-- =====================================================

SET NAMES utf8mb4;
USE `kb_graph`;
SET FOREIGN_KEY_CHECKS = 0;

-- 图谱节点表（MySQL存储，主要使用Neo4j）
DROP TABLE IF EXISTS `kb_graph_node`;
CREATE TABLE `kb_graph_node` (
  `id` BIGINT NOT NULL COMMENT '节点ID',
  `node_type` VARCHAR(50) NOT NULL COMMENT '节点类型：document/category/tag/user/concept',
  `node_name` VARCHAR(200) NOT NULL COMMENT '节点名称',
  `properties` JSON DEFAULT NULL COMMENT '节点属性',
  `labels` VARCHAR(500) DEFAULT NULL COMMENT '节点标签',
  `weight` INT DEFAULT 1 COMMENT '权重',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_node_type` (`node_type`),
  KEY `idx_node_name` (`node_name`(100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='图谱节点表';

-- 图谱边表（MySQL存储，主要使用Neo4j）
DROP TABLE IF EXISTS `kb_graph_edge`;
CREATE TABLE `kb_graph_edge` (
  `id` BIGINT NOT NULL COMMENT '边ID',
  `source_id` BIGINT NOT NULL COMMENT '源节点ID',
  `target_id` BIGINT NOT NULL COMMENT '目标节点ID',
  `relationship_type` VARCHAR(50) NOT NULL COMMENT '关系类型',
  `relationship_name` VARCHAR(100) DEFAULT NULL COMMENT '关系名称',
  `properties` JSON DEFAULT NULL COMMENT '边属性',
  `weight` DECIMAL(5,2) DEFAULT 1.0 COMMENT '权重',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_source_target_relation` (`source_id`, `target_id`, `relationship_type`),
  KEY `idx_source_id` (`source_id`),
  KEY `idx_target_id` (`target_id`),
  KEY `idx_relationship_type` (`relationship_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='图谱边表';

-- 图谱社区表
DROP TABLE IF EXISTS `kb_graph_community`;
CREATE TABLE `kb_graph_community` (
  `id` BIGINT NOT NULL COMMENT '社区ID',
  `community_name` VARCHAR(100) NOT NULL COMMENT '社区名称',
  `node_count` INT NOT NULL DEFAULT 0 COMMENT '节点数量',
  `description` VARCHAR(500) DEFAULT NULL COMMENT '描述',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='图谱社区表';

-- 社区节点关联表
DROP TABLE IF EXISTS `kb_graph_community_node`;
CREATE TABLE `kb_graph_community_node` (
  `id` BIGINT NOT NULL COMMENT '主键ID',
  `community_id` BIGINT NOT NULL COMMENT '社区ID',
  `node_id` BIGINT NOT NULL COMMENT '节点ID',
  `node_type` VARCHAR(50) DEFAULT NULL COMMENT '节点类型',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_community_node` (`community_id`, `node_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='社区节点关联表';

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'kb_graph 数据库表创建完成！' AS message;
SELECT '注意：知识图谱主要使用Neo4j存储，MySQL表作为辅助和备份。' AS note;
