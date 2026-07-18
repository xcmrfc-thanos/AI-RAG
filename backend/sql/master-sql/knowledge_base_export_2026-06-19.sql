-- MySQL dump 10.13  Distrib 8.0.21, for macos10.15 (x86_64)
--
-- Host: localhost    Database: kb_user
-- ------------------------------------------------------
-- Server version	8.0.21

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `kb_user`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `kb_user` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `kb_user`;

--
-- Temporary view structure for view `kb_document`
--

DROP TABLE IF EXISTS `kb_document`;
/*!50001 DROP VIEW IF EXISTS `kb_document`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `kb_document` AS SELECT 
 1 AS `id`,
 1 AS `title`,
 1 AS `author_id`,
 1 AS `author_name`,
 1 AS `category_id`,
 1 AS `status`,
 1 AS `view_count`,
 1 AS `like_count`,
 1 AS `favorite_count`,
 1 AS `comment_count`,
 1 AS `is_public`,
 1 AS `is_top`,
 1 AS `is_recommend`,
 1 AS `document_type`,
 1 AS `source`,
 1 AS `cover_image`,
 1 AS `summary`,
 1 AS `sort`,
 1 AS `allow_comment`,
 1 AS `publish_time`,
 1 AS `created_at`,
 1 AS `updated_at`,
 1 AS `create_by`,
 1 AS `update_by`,
 1 AS `deleted`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `kb_permission`
--

DROP TABLE IF EXISTS `kb_permission`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kb_permission` (
  `id` bigint NOT NULL COMMENT '权限ID（雪花算法）',
  `parent_id` bigint NOT NULL DEFAULT '0' COMMENT '父权限ID',
  `permission_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '权限名称',
  `permission_code` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '权限编码',
  `permission_type` tinyint NOT NULL COMMENT '权限类型：1-菜单，2-按钮，3-接口',
  `menu_url` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '菜单URL',
  `api_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '接口URL',
  `method` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '请求方法：GET,POST,PUT,DELETE',
  `icon` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '图标',
  `sort` int NOT NULL DEFAULT '0' COMMENT '排序号',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态：0-禁用，1-启用',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '删除标识：0-未删除，1-已删除',
  `create_by` bigint DEFAULT NULL COMMENT '创建人',
  `update_by` bigint DEFAULT NULL COMMENT '更新人',
  PRIMARY KEY (`id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_permission_type` (`permission_type`),
  KEY `idx_permission_code` (`permission_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kb_permission`
--

LOCK TABLES `kb_permission` WRITE;
/*!40000 ALTER TABLE `kb_permission` DISABLE KEYS */;
INSERT INTO `kb_permission` VALUES (3000000000000000001,0,'首页','dashboard',1,'/dashboard',NULL,NULL,'DashboardOutlined',1,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',0,NULL,NULL),(3000000000000000002,0,'文档中心','document',1,'/documents',NULL,NULL,'FileTextOutlined',2,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',0,NULL,NULL),(3000000000000000003,0,'知识图谱','graph',1,'/knowledge-graph',NULL,NULL,'NodeIndexOutlined',4,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',0,NULL,NULL),(3000000000000000004,0,'AI助手','ai',1,'/ai',NULL,NULL,'RobotOutlined',6,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',0,NULL,NULL),(3000000000000000005,0,'搜索','search',1,'/search',NULL,NULL,'SearchOutlined',5,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',0,NULL,NULL),(3000000000000000006,0,'通知中心','notification',1,'/notifications',NULL,NULL,'BellOutlined',8,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',0,NULL,NULL),(3000000000000000007,0,'个人中心','profile',1,'/profile',NULL,NULL,'UserOutlined',9,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',0,NULL,NULL),(3000000000000000008,0,'系统管理','system',1,'/admin',NULL,NULL,'SettingOutlined',10,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',0,NULL,NULL),(3000000000000000011,3000000000000000002,'文档列表','document:list',1,'/documents',NULL,NULL,NULL,1,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',0,NULL,NULL),(3000000000000000012,3000000000000000002,'创建文档','document:create',2,NULL,NULL,NULL,NULL,2,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',0,NULL,NULL),(3000000000000000013,3000000000000000002,'编辑文档','document:edit',2,NULL,NULL,NULL,NULL,3,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',0,NULL,NULL),(3000000000000000014,3000000000000000002,'删除文档','document:delete',2,NULL,NULL,NULL,NULL,4,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',0,NULL,NULL),(3000000000000000015,3000000000000000002,'文档审核','document:review',2,NULL,NULL,NULL,NULL,5,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',0,NULL,NULL),(3000000000000000016,3000000000000000002,'文档分类','document:category',1,'/admin/categories',NULL,NULL,NULL,6,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',0,NULL,NULL),(3000000000000000017,3000000000000000002,'文档标签','document:tag',1,'/admin/tags',NULL,NULL,NULL,7,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',0,NULL,NULL),(3000000000000000018,3000000000000000016,'分类查询','document:category:query',3,NULL,NULL,NULL,NULL,1,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',0,NULL,NULL),(3000000000000000021,3000000000000000008,'用户管理','system:user',1,'/admin/users',NULL,NULL,NULL,1,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',0,NULL,NULL),(3000000000000000022,3000000000000000008,'角色管理','system:role',1,'/admin/roles',NULL,NULL,NULL,2,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',0,NULL,NULL),(3000000000000000023,3000000000000000008,'权限管理','system:permission',1,'/admin/permissions',NULL,NULL,NULL,3,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',0,NULL,NULL),(3000000000000000024,3000000000000000008,'团队管理','system:team',1,'/admin/teams',NULL,NULL,NULL,4,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',0,NULL,NULL),(3000000000000000025,3000000000000000008,'数据统计','system:statistics',1,'/admin/statistics',NULL,NULL,NULL,5,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',0,NULL,NULL),(3000000000000000026,3000000000000000008,'审核管理','system:review',1,'/admin/review',NULL,NULL,NULL,6,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',0,NULL,NULL),(3000000000000000027,3000000000000000008,'系统设置','system:settings',1,'/admin/settings',NULL,NULL,NULL,7,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',0,NULL,NULL),(3000000000000000031,0,'文档查询接口','api:document:query',3,NULL,'/api/document/**','GET',NULL,1,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',0,NULL,NULL),(3000000000000000032,0,'文档创建接口','api:document:create',3,NULL,'/api/document','POST',NULL,2,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',0,NULL,NULL),(3000000000000000033,0,'文档更新接口','api:document:update',3,NULL,'/api/document/**','PUT',NULL,3,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',0,NULL,NULL),(3000000000000000034,0,'文档删除接口','api:document:delete',3,NULL,'/api/document/**','DELETE',NULL,4,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',0,NULL,NULL),(3000000000000000035,0,'用户管理接口','api:user:manage',3,NULL,'/api/user/**','*',NULL,5,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',0,NULL,NULL),(3000000000000000036,0,'角色管理接口','api:role:manage',3,NULL,'/api/role/**','*',NULL,6,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',0,NULL,NULL),(3000000000000000046,0,'文件管理','file',1,'/files',NULL,NULL,'FolderOpenOutlined',3,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',0,NULL,NULL),(3000000000000000047,0,'AI写作','ai-writing',1,'/ai-writing',NULL,NULL,'EditOutlined',7,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',0,NULL,NULL),(3000000000000000048,3000000000000000046,'文件列表','file:list',1,'/files',NULL,NULL,NULL,1,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',0,NULL,NULL),(3000000000000000049,3000000000000000046,'上传文件','file:upload',2,NULL,NULL,NULL,NULL,2,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',0,NULL,NULL),(3000000000000000050,3000000000000000046,'删除文件','file:delete',2,NULL,NULL,NULL,NULL,3,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',0,NULL,NULL),(3000000000000000051,3000000000000000008,'系统配置','system:config',1,'/admin/system-config',NULL,NULL,NULL,8,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',0,NULL,NULL),(3000000000000000052,3000000000000000008,'字典管理','system:dictionary',1,'/admin/dictionary',NULL,NULL,NULL,9,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',0,NULL,NULL),(3000000000000000053,3000000000000000008,'操作日志','system:operation-log',1,'/admin/operation-logs',NULL,NULL,NULL,10,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',0,NULL,NULL),(3000000000000000054,3000000000000000008,'通知模板','system:notification-template',1,'/admin/notification-templates',NULL,NULL,NULL,11,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',0,NULL,NULL);
/*!40000 ALTER TABLE `kb_permission` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kb_role`
--

DROP TABLE IF EXISTS `kb_role`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kb_role` (
  `id` bigint NOT NULL COMMENT '角色ID（雪花算法）',
  `role_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '角色名称',
  `role_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '角色编码',
  `description` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '角色描述',
  `sort` int NOT NULL DEFAULT '0' COMMENT '排序号',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态：0-禁用，1-启用',
  `remark` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '备注',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` bigint DEFAULT NULL COMMENT '创建人',
  `update_by` bigint DEFAULT NULL COMMENT '更新人',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '删除标识：0-未删除，1-已删除',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_code` (`role_code`,`deleted`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kb_role`
--

LOCK TABLES `kb_role` WRITE;
/*!40000 ALTER TABLE `kb_role` DISABLE KEYS */;
INSERT INTO `kb_role` VALUES (2000000000000000001,'超级管理员','ROLE_SUPER_ADMIN','拥有系统所有权限',1,1,NULL,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(2000000000000000002,'管理员','ROLE_ADMIN','拥有系统管理权限',2,1,NULL,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(2000000000000000003,'编辑','ROLE_EDITOR','可编辑和管理文档',3,1,NULL,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(2000000000000000004,'审核员','ROLE_REVIEWER','可审核文档',4,1,NULL,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(2000000000000000005,'普通用户','ROLE_USER','普通用户权限',5,1,NULL,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(2000000000000000006,'访客','ROLE_GUEST','只读访客权限',6,1,NULL,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0);
/*!40000 ALTER TABLE `kb_role` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kb_role_permission`
--

DROP TABLE IF EXISTS `kb_role_permission`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kb_role_permission` (
  `id` bigint NOT NULL COMMENT '主键ID',
  `role_id` bigint NOT NULL COMMENT '角色ID',
  `permission_id` bigint NOT NULL COMMENT '权限ID',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_permission` (`role_id`,`permission_id`),
  KEY `idx_permission_id` (`permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色权限关联表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kb_role_permission`
--

LOCK TABLES `kb_role_permission` WRITE;
/*!40000 ALTER TABLE `kb_role_permission` DISABLE KEYS */;
INSERT INTO `kb_role_permission` VALUES (5000000000000000001,2000000000000000001,3000000000000000001,'2026-06-19 10:24:37'),(5000000000000000002,2000000000000000001,3000000000000000002,'2026-06-19 10:24:37'),(5000000000000000003,2000000000000000001,3000000000000000003,'2026-06-19 10:24:37'),(5000000000000000004,2000000000000000001,3000000000000000004,'2026-06-19 10:24:37'),(5000000000000000005,2000000000000000001,3000000000000000005,'2026-06-19 10:24:37'),(5000000000000000006,2000000000000000001,3000000000000000006,'2026-06-19 10:24:37'),(5000000000000000007,2000000000000000001,3000000000000000007,'2026-06-19 10:24:37'),(5000000000000000008,2000000000000000001,3000000000000000008,'2026-06-19 10:24:37'),(5000000000000000009,2000000000000000001,3000000000000000011,'2026-06-19 10:24:37'),(5000000000000000010,2000000000000000001,3000000000000000012,'2026-06-19 10:24:37'),(5000000000000000011,2000000000000000001,3000000000000000013,'2026-06-19 10:24:37'),(5000000000000000012,2000000000000000001,3000000000000000014,'2026-06-19 10:24:37'),(5000000000000000013,2000000000000000001,3000000000000000015,'2026-06-19 10:24:37'),(5000000000000000014,2000000000000000001,3000000000000000016,'2026-06-19 10:24:37'),(5000000000000000015,2000000000000000001,3000000000000000017,'2026-06-19 10:24:37'),(5000000000000000016,2000000000000000001,3000000000000000018,'2026-06-19 10:24:37'),(5000000000000000017,2000000000000000001,3000000000000000021,'2026-06-19 10:24:37'),(5000000000000000018,2000000000000000001,3000000000000000022,'2026-06-19 10:24:37'),(5000000000000000019,2000000000000000001,3000000000000000023,'2026-06-19 10:24:37'),(5000000000000000020,2000000000000000001,3000000000000000024,'2026-06-19 10:24:37'),(5000000000000000021,2000000000000000001,3000000000000000025,'2026-06-19 10:24:37'),(5000000000000000022,2000000000000000001,3000000000000000026,'2026-06-19 10:24:37'),(5000000000000000023,2000000000000000001,3000000000000000027,'2026-06-19 10:24:37'),(5000000000000000024,2000000000000000001,3000000000000000031,'2026-06-19 10:24:37'),(5000000000000000025,2000000000000000001,3000000000000000032,'2026-06-19 10:24:37'),(5000000000000000026,2000000000000000001,3000000000000000033,'2026-06-19 10:24:37'),(5000000000000000027,2000000000000000001,3000000000000000034,'2026-06-19 10:24:37'),(5000000000000000028,2000000000000000001,3000000000000000035,'2026-06-19 10:24:37'),(5000000000000000029,2000000000000000001,3000000000000000036,'2026-06-19 10:24:37'),(5000000000000000030,2000000000000000001,3000000000000000046,'2026-06-19 10:24:37'),(5000000000000000031,2000000000000000001,3000000000000000047,'2026-06-19 10:24:37'),(5000000000000000032,2000000000000000001,3000000000000000048,'2026-06-19 10:24:37'),(5000000000000000033,2000000000000000001,3000000000000000049,'2026-06-19 10:24:37'),(5000000000000000034,2000000000000000001,3000000000000000050,'2026-06-19 10:24:37'),(5000000000000000035,2000000000000000001,3000000000000000051,'2026-06-19 10:24:37'),(5000000000000000036,2000000000000000001,3000000000000000052,'2026-06-19 10:24:37'),(5000000000000000037,2000000000000000001,3000000000000000053,'2026-06-19 10:24:37'),(5000000000000000038,2000000000000000001,3000000000000000054,'2026-06-19 10:24:37'),(5000000000000000040,2000000000000000005,3000000000000000011,'2026-06-19 10:25:54'),(5000000000000000041,2000000000000000005,3000000000000000012,'2026-06-19 10:25:54'),(5000000000000000042,2000000000000000005,3000000000000000013,'2026-06-19 10:25:54'),(5000000000000000043,2000000000000000005,3000000000000000014,'2026-06-19 10:25:54');
/*!40000 ALTER TABLE `kb_role_permission` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kb_team`
--

DROP TABLE IF EXISTS `kb_team`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kb_team` (
  `id` bigint NOT NULL COMMENT '团队ID',
  `team_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '团队名称',
  `team_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '团队编码',
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '团队描述',
  `icon` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '团队图标标识',
  `leader_id` bigint DEFAULT NULL COMMENT '团队负责人ID',
  `parent_id` bigint NOT NULL DEFAULT '0' COMMENT '父团队ID',
  `sort` int NOT NULL DEFAULT '0' COMMENT '排序号',
  `level` int NOT NULL DEFAULT '0' COMMENT '层级',
  `path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '团队路径',
  `member_count` int NOT NULL DEFAULT '0' COMMENT '成员数量',
  `doc_count` int NOT NULL DEFAULT '0' COMMENT '文档数量',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态：0-禁用，1-启用',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` bigint DEFAULT NULL COMMENT '创建人',
  `update_by` bigint DEFAULT NULL COMMENT '更新人',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '删除标识',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_team_code` (`team_code`,`deleted`),
  KEY `idx_leader_id` (`leader_id`),
  KEY `idx_parent_id` (`parent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='团队表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kb_team`
--

LOCK TABLES `kb_team` WRITE;
/*!40000 ALTER TABLE `kb_team` DISABLE KEYS */;
INSERT INTO `kb_team` VALUES (8000000000000000001,'技术中心','TECH_CENTER','负责公司所有技术研发工作','tech',1000000000000000004,0,1,0,NULL,0,0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(8000000000000000002,'产品中心','PRODUCT_CENTER','负责产品规划和设计','product',1000000000000000005,0,2,0,NULL,0,0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(8000000000000000003,'运营中心','OPS_CENTER','负责业务运营和市场推广','ops',1000000000000000007,0,3,0,NULL,0,0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(8000000000000000004,'职能中心','ADMIN_CENTER','负责公司行政人事财务工作','admin',1000000000000000008,0,4,0,NULL,0,0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(8000000000000000005,'后端开发组','BACKEND_TEAM','后端系统开发','backend',1000000000000000004,8000000000000000001,1,0,NULL,0,0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(8000000000000000006,'前端开发组','FRONTEND_TEAM','前端系统开发','frontend',1000000000000000004,8000000000000000001,2,0,NULL,0,0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(8000000000000000007,'测试组','QA_TEAM','质量保证和测试','qa',1000000000000000003,8000000000000000001,3,0,NULL,0,0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0);
/*!40000 ALTER TABLE `kb_team` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kb_team_member`
--

DROP TABLE IF EXISTS `kb_team_member`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kb_team_member` (
  `id` bigint NOT NULL COMMENT '主键ID',
  `team_id` bigint NOT NULL COMMENT '团队ID',
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `member_role` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'member' COMMENT '成员角色：leader-负责人，member-成员',
  `join_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '加入时间',
  `create_by` bigint DEFAULT NULL COMMENT '添加人',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_team_user` (`team_id`,`user_id`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='团队成员表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kb_team_member`
--

LOCK TABLES `kb_team_member` WRITE;
/*!40000 ALTER TABLE `kb_team_member` DISABLE KEYS */;
INSERT INTO `kb_team_member` VALUES (9000000000000000001,8000000000000000005,1000000000000000004,'leader','2026-06-19 10:24:37',NULL),(9000000000000000002,8000000000000000005,1000000000000000001,'member','2026-06-19 10:24:37',NULL),(9000000000000000003,8000000000000000006,1000000000000000006,'member','2026-06-19 10:24:37',NULL),(9000000000000000004,8000000000000000007,1000000000000000003,'leader','2026-06-19 10:24:37',NULL);
/*!40000 ALTER TABLE `kb_team_member` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kb_user`
--

DROP TABLE IF EXISTS `kb_user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kb_user` (
  `id` bigint NOT NULL COMMENT '用户ID（雪花算法）',
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户名',
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '密码（BCrypt加密）',
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '邮箱',
  `email_verified` tinyint NOT NULL DEFAULT '0' COMMENT '邮箱是否已验证：0-未验证，1-已验证',
  `activation_token` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '账户激活令牌',
  `activation_token_expiry` datetime DEFAULT NULL COMMENT '激活令牌过期时间',
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '手机号',
  `avatar` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '头像URL',
  `real_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '真实姓名',
  `department` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '部门',
  `position` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '职位',
  `remark` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '个人简介/备注',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态：0-禁用，1-启用',
  `last_login_time` datetime DEFAULT NULL COMMENT '最后登录时间',
  `last_login_ip` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '最后登录IP',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` bigint DEFAULT NULL COMMENT '创建人',
  `update_by` bigint DEFAULT NULL COMMENT '更新人',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '删除标识：0-未删除，1-已删除',
  `tenant_id` bigint DEFAULT NULL COMMENT '租户ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`,`deleted`,`tenant_id`),
  UNIQUE KEY `uk_email` (`email`,`deleted`,`tenant_id`),
  KEY `idx_department` (`department`),
  KEY `idx_status` (`status`),
  KEY `idx_create_time` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kb_user`
--

LOCK TABLES `kb_user` WRITE;
/*!40000 ALTER TABLE `kb_user` DISABLE KEYS */;
INSERT INTO `kb_user` VALUES (326186554798247936,'zhoujielun','$2a$10$OxPN77uAH2PhC1mzzjCub.Alj7GSwB9w8BOCpgXGlr83gmekd8bZa','zhoujielun@163.com',0,NULL,NULL,NULL,NULL,'周杰伦','','',NULL,1,'2026-06-19 10:29:06',NULL,'2026-06-19 10:28:55','2026-06-19 10:29:06',1000000000000000001,NULL,0,NULL),(1000000000000000001,'admin','$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi','admin@company.com',0,NULL,NULL,NULL,'https://api.dicebear.com/7.x/avataaars/svg?seed=admin','系统管理员','技术部','系统架构师',NULL,1,'2026-06-19 10:32:01',NULL,'2026-06-19 10:24:37','2026-06-19 10:32:01',NULL,NULL,0,NULL),(1000000000000000002,'editor','$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi','editor@company.com',0,NULL,NULL,NULL,'https://api.dicebear.com/7.x/avataaars/svg?seed=editor','内容编辑','内容部','高级编辑',NULL,1,NULL,NULL,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0,NULL),(1000000000000000003,'tester','$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi','tester@company.com',0,NULL,NULL,NULL,'https://api.dicebear.com/7.x/avataaars/svg?seed=tester','测试人员','测试部','测试工程师',NULL,1,NULL,NULL,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0,NULL),(1000000000000000004,'developer','$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi','dev@company.com',0,NULL,NULL,NULL,'https://api.dicebear.com/7.x/avataaars/svg?seed=developer','开发工程师','研发部','高级工程师',NULL,1,NULL,NULL,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0,NULL),(1000000000000000005,'product','$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi','product@company.com',0,NULL,NULL,NULL,'https://api.dicebear.com/7.x/avataaars/svg?seed=product','产品经理','产品部','高级产品经理',NULL,1,NULL,NULL,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0,NULL),(1000000000000000006,'designer','$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi','designer@company.com',0,NULL,NULL,NULL,'https://api.dicebear.com/7.x/avataaars/svg?seed=designer','UI设计师','设计部','高级设计师',NULL,1,NULL,NULL,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0,NULL),(1000000000000000007,'sales','$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi','sales@company.com',0,NULL,NULL,NULL,'https://api.dicebear.com/7.x/avataaars/svg?seed=sales','销售经理','销售部','销售经理',NULL,1,NULL,NULL,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0,NULL),(1000000000000000008,'hr','$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi','hr@company.com',0,NULL,NULL,NULL,'https://api.dicebear.com/7.x/avataaars/svg?seed=hr','人事专员','人力资源部','人事专员',NULL,1,NULL,NULL,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0,NULL),(1000000000000000009,'finance','$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi','finance@company.com',0,NULL,NULL,NULL,'https://api.dicebear.com/7.x/avataaars/svg?seed=finance','财务主管','财务部','财务主管',NULL,1,NULL,NULL,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0,NULL),(1000000000000000010,'guest','$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVKIUi','guest@company.com',0,NULL,NULL,NULL,'https://api.dicebear.com/7.x/avataaars/svg?seed=guest','访客用户','外部','访客',NULL,1,NULL,NULL,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0,NULL);
/*!40000 ALTER TABLE `kb_user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kb_user_permission`
--

DROP TABLE IF EXISTS `kb_user_permission`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kb_user_permission` (
  `id` bigint NOT NULL COMMENT '主键ID',
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `permission_id` bigint NOT NULL COMMENT '权限ID',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_permission` (`user_id`,`permission_id`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户权限关联表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kb_user_permission`
--

LOCK TABLES `kb_user_permission` WRITE;
/*!40000 ALTER TABLE `kb_user_permission` DISABLE KEYS */;
/*!40000 ALTER TABLE `kb_user_permission` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kb_user_role`
--

DROP TABLE IF EXISTS `kb_user_role`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kb_user_role` (
  `id` bigint NOT NULL COMMENT '主键ID',
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `role_id` bigint NOT NULL COMMENT '角色ID',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `create_by` bigint DEFAULT NULL COMMENT '创建人',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_role` (`user_id`,`role_id`),
  KEY `idx_role_id` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户角色关联表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kb_user_role`
--

LOCK TABLES `kb_user_role` WRITE;
/*!40000 ALTER TABLE `kb_user_role` DISABLE KEYS */;
INSERT INTO `kb_user_role` VALUES (326186556496941056,326186554798247936,2000000000000000005,'2026-06-19 10:28:55',NULL),(4000000000000000001,1000000000000000001,2000000000000000001,'2026-06-19 10:24:37',1000000000000000001),(4000000000000000002,1000000000000000002,2000000000000000003,'2026-06-19 10:24:37',1000000000000000001),(4000000000000000003,1000000000000000003,2000000000000000005,'2026-06-19 10:24:37',1000000000000000001),(4000000000000000004,1000000000000000004,2000000000000000005,'2026-06-19 10:24:37',1000000000000000001),(4000000000000000005,1000000000000000005,2000000000000000005,'2026-06-19 10:24:37',1000000000000000001),(4000000000000000006,1000000000000000006,2000000000000000005,'2026-06-19 10:24:37',1000000000000000001),(4000000000000000007,1000000000000000007,2000000000000000005,'2026-06-19 10:24:37',1000000000000000001),(4000000000000000008,1000000000000000008,2000000000000000005,'2026-06-19 10:24:37',1000000000000000001),(4000000000000000009,1000000000000000009,2000000000000000005,'2026-06-19 10:24:37',1000000000000000001),(4000000000000000010,1000000000000000010,2000000000000000006,'2026-06-19 10:24:37',1000000000000000001);
/*!40000 ALTER TABLE `kb_user_role` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_token_blacklist`
--

DROP TABLE IF EXISTS `tb_token_blacklist`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_token_blacklist` (
  `id` bigint NOT NULL COMMENT '主键ID',
  `token_hash` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Token哈希值',
  `expire_time` datetime NOT NULL COMMENT '过期时间',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_token_hash` (`token_hash`),
  KEY `idx_expire_time` (`expire_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Token黑名单表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_token_blacklist`
--

LOCK TABLES `tb_token_blacklist` WRITE;
/*!40000 ALTER TABLE `tb_token_blacklist` DISABLE KEYS */;
INSERT INTO `tb_token_blacklist` VALUES (326186576268890112,'8dca0a8d7fa19bb7f0152c7aef1ebdee07dc5692411d9886dd5ac163ddccaa4a','2026-06-19 12:27:47','2026-06-19 10:29:00'),(326187323165380608,'2ea2e8364167c0b1ae1849ecd1f9d2df675a0d3eca24b67e32a86f2d6eb4984e','2026-06-19 12:29:06','2026-06-19 10:31:58');
/*!40000 ALTER TABLE `tb_token_blacklist` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'kb_user'
--

--
-- Dumping routines for database 'kb_user'
--

--
-- Current Database: `kb_document`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `kb_document` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `kb_document`;

--
-- Table structure for table `kb_category`
--

DROP TABLE IF EXISTS `kb_category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kb_category` (
  `id` bigint NOT NULL COMMENT '分类ID',
  `category_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '分类名称',
  `category_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '分类编码',
  `remark` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '备注',
  `parent_id` bigint NOT NULL DEFAULT '0' COMMENT '父分类ID',
  `category_icon` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'tech' COMMENT '分类图标标识',
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '分类描述',
  `sort` int NOT NULL DEFAULT '0' COMMENT '排序号',
  `document_count` int NOT NULL DEFAULT '0' COMMENT '文档数量',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态：0-禁用，1-启用',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` bigint DEFAULT NULL COMMENT '创建人',
  `update_by` bigint DEFAULT NULL COMMENT '更新人',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '删除标识',
  PRIMARY KEY (`id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档分类表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kb_category`
--

LOCK TABLES `kb_category` WRITE;
/*!40000 ALTER TABLE `kb_category` DISABLE KEYS */;
INSERT INTO `kb_category` VALUES (6000000000000000001,'技术文档',NULL,NULL,0,'tech','技术开发相关的文档资料',1,4,1,'2026-06-19 10:24:37','2026-06-19 10:25:00',NULL,NULL,0),(6000000000000000002,'产品文档',NULL,NULL,0,'product','产品设计、需求文档',2,2,1,'2026-06-19 10:24:37','2026-06-19 10:25:00',NULL,NULL,0),(6000000000000000003,'业务流程',NULL,NULL,0,'business','公司业务流程规范',3,1,1,'2026-06-19 10:24:37','2026-06-19 10:25:00',NULL,NULL,0),(6000000000000000004,'人力资源',NULL,NULL,0,'hr','人事制度和管理规范',4,1,1,'2026-06-19 10:24:37','2026-06-19 10:25:00',NULL,NULL,0),(6000000000000000005,'财务制度',NULL,NULL,0,'finance','财务管理制度和流程',5,1,1,'2026-06-19 10:24:37','2026-06-19 10:25:00',NULL,NULL,0),(6000000000000000006,'市场营销',NULL,NULL,0,'marketing','市场营销策略和方案',6,0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(6000000000000000007,'合规法务',NULL,NULL,0,'legal','法律法规和合规要求',7,0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(6000000000000000008,'培训资料',NULL,NULL,0,'training','员工培训和学习资料',8,0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(6000000000000000011,'后端开发',NULL,NULL,6000000000000000001,'backend','后端技术栈开发文档',1,1,1,'2026-06-19 10:24:37','2026-06-19 10:25:00',NULL,NULL,0),(6000000000000000012,'前端开发',NULL,NULL,6000000000000000001,'frontend','前端技术栈开发文档',2,1,1,'2026-06-19 10:24:37','2026-06-19 10:25:00',NULL,NULL,0),(6000000000000000013,'数据库',NULL,NULL,6000000000000000001,'database','数据库设计和优化',3,1,1,'2026-06-19 10:24:37','2026-06-19 10:25:00',NULL,NULL,0),(6000000000000000014,'DevOps',NULL,NULL,6000000000000000001,'devops','运维部署和CI/CD',4,1,1,'2026-06-19 10:24:37','2026-06-19 10:25:00',NULL,NULL,0),(6000000000000000015,'架构设计',NULL,NULL,6000000000000000001,'architecture','系统架构设计文档',5,0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(6000000000000000021,'产品需求',NULL,NULL,6000000000000000002,'requirement','产品需求文档PRD',1,1,1,'2026-06-19 10:24:37','2026-06-19 10:25:00',NULL,NULL,0),(6000000000000000022,'UI设计',NULL,NULL,6000000000000000002,'design','UI/UX设计规范',2,1,1,'2026-06-19 10:24:37','2026-06-19 10:25:00',NULL,NULL,0),(6000000000000000023,'产品规划',NULL,NULL,6000000000000000002,'planning','产品规划和路线图',3,0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(6000000000000000024,'竞品分析',NULL,NULL,6000000000000000002,'competitive','竞品分析报告',4,0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0);
/*!40000 ALTER TABLE `kb_category` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kb_comment`
--

DROP TABLE IF EXISTS `kb_comment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kb_comment` (
  `id` bigint NOT NULL COMMENT '评论ID',
  `document_id` bigint NOT NULL COMMENT '文档ID',
  `parent_id` bigint DEFAULT NULL COMMENT '父评论ID',
  `root_id` bigint DEFAULT NULL COMMENT '根评论ID',
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '评论内容',
  `commenter_id` bigint NOT NULL COMMENT '评论人ID',
  `commenter_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '评论人姓名',
  `commenter_avatar` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '评论人头像',
  `reply_to_user_id` bigint DEFAULT NULL COMMENT '回复给谁（用户ID）',
  `reply_to_user_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '回复给谁（用户姓名）',
  `like_count` int NOT NULL DEFAULT '0' COMMENT '点赞数',
  `reply_count` int NOT NULL DEFAULT '0' COMMENT '回复数',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态：0-隐藏，1-正常',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '删除标识',
  PRIMARY KEY (`id`),
  KEY `idx_document_id` (`document_id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_root_id` (`root_id`),
  KEY `idx_commenter_id` (`commenter_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档评论表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kb_comment`
--

LOCK TABLES `kb_comment` WRITE;
/*!40000 ALTER TABLE `kb_comment` DISABLE KEYS */;
INSERT INTO `kb_comment` VALUES (1200000000000000001,1000000000000000001,NULL,NULL,'这篇文章写得很详细，对我帮助很大！',1000000000000002,'editor',NULL,NULL,NULL,12,0,1,'2026-06-18 20:30:10','2026-06-18 20:30:10',0),(1200000000000000002,1000000000000000001,NULL,NULL,'补充一点：自动配置的原理可以再详细讲讲',1000000000000004,'developer',NULL,NULL,NULL,5,0,1,'2026-06-18 20:30:10','2026-06-18 20:30:10',0),(1200000000000000003,1000000000000000002,NULL,NULL,'TypeScript的类型定义很规范，学习了！',1000000000000003,'tester',NULL,NULL,NULL,8,0,1,'2026-06-18 20:30:10','2026-06-18 20:30:10',0),(1200000000000000004,1000000000000000002,NULL,NULL,'期待出下一期关于Hooks的文章',1000000000000002,'editor',NULL,NULL,NULL,3,0,1,'2026-06-18 20:30:10','2026-06-18 20:30:10',0),(1200000000000000005,1000000000000000003,NULL,NULL,'索引优化的技巧很实用，已经在项目中应用了',1000000000000005,'product',NULL,NULL,NULL,15,0,1,'2026-06-18 20:30:10','2026-06-18 20:30:10',0),(1200000000000000006,1000000000000000005,NULL,NULL,'PRD写得很清楚，产品逻辑很完整',1000000000000001,'admin',NULL,NULL,NULL,6,0,1,'2026-06-18 20:30:10','2026-06-18 20:30:10',0),(1200000000000000007,1000000000000000008,NULL,NULL,'入职指南很详细，帮助我快速熟悉了公司',1000000000000003,'tester',NULL,NULL,NULL,23,0,1,'2026-06-18 20:30:10','2026-06-18 20:30:10',0),(1200000000000000008,1000000000000000008,NULL,NULL,'建议补充一下远程办公的注意事项',1000000000000007,'sales',NULL,NULL,NULL,2,0,1,'2026-06-18 20:30:10','2026-06-18 20:30:10',0);
/*!40000 ALTER TABLE `kb_comment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kb_document`
--

DROP TABLE IF EXISTS `kb_document`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kb_document` (
  `id` bigint NOT NULL COMMENT '文档ID',
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '文档标题',
  `content` longtext COLLATE utf8mb4_unicode_ci COMMENT '文档内容',
  `content_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '内容ID（文件内容关联）',
  `content_length` int DEFAULT NULL COMMENT '内容长度',
  `summary` text COLLATE utf8mb4_unicode_ci COMMENT '文档摘要',
  `category_id` bigint DEFAULT NULL COMMENT '分类ID',
  `team_id` bigint DEFAULT NULL COMMENT '团队空间ID',
  `author_id` bigint NOT NULL COMMENT '作者ID',
  `author_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '作者名称',
  `cover_image` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '封面图片',
  `tags` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '文档标签（逗号分隔）',
  `remark` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '文档备注',
  `status` tinyint NOT NULL DEFAULT '0' COMMENT '状态：0-草稿，1-已发布，2-已归档',
  `is_public` tinyint NOT NULL DEFAULT '1' COMMENT '是否公开：0-私有，1-公开',
  `is_top` tinyint NOT NULL DEFAULT '0' COMMENT '是否置顶：0-否，1-是',
  `is_recommend` tinyint NOT NULL DEFAULT '0' COMMENT '是否推荐：0-否，1-是',
  `allow_comment` tinyint NOT NULL DEFAULT '1' COMMENT '允许评论：0-否，1-是',
  `view_count` int NOT NULL DEFAULT '0' COMMENT '浏览次数',
  `like_count` int NOT NULL DEFAULT '0' COMMENT '点赞次数',
  `comment_count` int NOT NULL DEFAULT '0' COMMENT '评论次数',
  `favorite_count` int NOT NULL DEFAULT '0' COMMENT '收藏次数',
  `version` int NOT NULL DEFAULT '1' COMMENT '版本号',
  `word_count` int DEFAULT NULL COMMENT '字数统计',
  `document_type` tinyint DEFAULT '1' COMMENT '文档类型：1-文章，2-文件',
  `file_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '文件路径',
  `file_size` bigint DEFAULT NULL COMMENT '文件大小（字节）',
  `file_extension` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '文件扩展名',
  `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'MIME类型',
  `source` tinyint DEFAULT '1' COMMENT '来源：1-原创，2-转载，3-翻译',
  `source_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '来源URL',
  `sort` int DEFAULT '0' COMMENT '排序',
  `auto_save_dismissed` tinyint(1) DEFAULT '0' COMMENT '自动保存草稿已确认（0-未确认，1-用户已放弃恢复）',
  `publish_time` datetime DEFAULT NULL COMMENT '发布时间',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` bigint DEFAULT NULL COMMENT '创建人ID',
  `update_by` bigint DEFAULT NULL COMMENT '更新人ID',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '删除标识',
  PRIMARY KEY (`id`),
  KEY `idx_title` (`title`(100)),
  KEY `idx_category_id` (`category_id`),
  KEY `idx_team_id` (`team_id`),
  KEY `idx_author_id` (`author_id`),
  KEY `idx_status` (`status`),
  KEY `idx_is_public` (`is_public`),
  KEY `idx_publish_time` (`publish_time`),
  KEY `idx_create_time` (`created_at`),
  FULLTEXT KEY `ft_content` (`title`,`summary`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kb_document`
--

LOCK TABLES `kb_document` WRITE;
/*!40000 ALTER TABLE `kb_document` DISABLE KEYS */;
INSERT INTO `kb_document` VALUES (1000000000000000001,'Spring Boot 3.x 快速入门指南',NULL,NULL,NULL,'Spring Boot 3.x完整入门教程，包含项目初始化、核心特性介绍和最佳实践。',6000000000000000011,NULL,1000000000000000004,'developer',NULL,NULL,NULL,1,1,0,0,1,1523,89,23,0,1,NULL,1,NULL,NULL,NULL,NULL,1,NULL,0,0,'2024-01-15 10:00:00','2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(1000000000000000002,'React 18 + TypeScript 最佳实践',NULL,NULL,NULL,'基于React 18和TypeScript的前端开发最佳实践，包含项目结构、核心概念和状态管理。',6000000000000000012,NULL,1000000000000000006,'designer',NULL,NULL,NULL,1,1,0,0,1,2187,156,45,0,1,NULL,1,NULL,NULL,NULL,NULL,1,NULL,0,0,'2024-02-10 14:30:00','2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(1000000000000000003,'MySQL 8.0 性能优化指南',NULL,NULL,NULL,'MySQL 8.0数据库性能优化完整指南，涵盖索引优化、查询优化和慢查询分析。',6000000000000000013,NULL,1000000000000000001,'admin',NULL,NULL,NULL,1,1,0,0,1,3421,234,67,0,1,NULL,1,NULL,NULL,NULL,NULL,1,NULL,0,0,'2024-01-28 09:15:00','2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(1000000000000000004,'Docker + Kubernetes 容器化部署',NULL,NULL,NULL,'基于Docker和Kubernetes的微服务容器化部署实践。',6000000000000000014,NULL,1000000000000000004,'developer',NULL,NULL,NULL,1,1,0,0,1,1876,98,19,0,1,NULL,1,NULL,NULL,NULL,NULL,1,NULL,0,0,'2024-03-05 16:20:00','2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(1000000000000000005,'企业知识库产品需求文档PRD',NULL,NULL,NULL,'完整的企业知识库产品需求文档，包含产品定位、目标用户和功能需求。',6000000000000000021,NULL,1000000000000000005,'product',NULL,NULL,NULL,1,1,0,0,1,987,45,12,0,1,NULL,1,NULL,NULL,NULL,NULL,1,NULL,0,0,'2024-02-01 10:00:00','2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(1000000000000000006,'UI设计规范 V2.0',NULL,NULL,NULL,'企业知识库UI设计规范，包含色彩系统、字体规范和组件规范。',6000000000000000022,NULL,1000000000000000006,'designer',NULL,NULL,NULL,1,1,0,0,1,654,34,8,0,1,NULL,1,NULL,NULL,NULL,NULL,1,NULL,0,0,'2024-02-15 14:00:00','2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(1000000000000000007,'文档审核流程规范',NULL,NULL,NULL,'文档审核流程的详细规范，包括流程步骤和审核标准。',6000000000000000003,NULL,1000000000000000002,'editor',NULL,NULL,NULL,1,1,0,0,1,1234,67,15,0,1,NULL,1,NULL,NULL,NULL,NULL,1,NULL,0,0,'2024-01-20 11:00:00','2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(1000000000000000008,'员工入职指南',NULL,NULL,NULL,'新员工入职指南，包含入职流程、常用系统和福利制度说明。',6000000000000000004,NULL,1000000000000000008,'hr',NULL,NULL,NULL,1,1,0,0,1,5678,234,56,0,1,NULL,1,NULL,NULL,NULL,NULL,1,NULL,0,0,'2024-01-01 09:00:00','2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(1000000000000000009,'报销流程说明',NULL,NULL,NULL,'公司费用报销流程的详细说明，包含报销原则、流程步骤和注意事项。',6000000000000000005,NULL,1000000000000000009,'finance',NULL,NULL,NULL,1,1,0,0,1,3456,123,34,0,1,NULL,1,NULL,NULL,NULL,NULL,1,NULL,0,0,'2024-01-10 14:00:00','2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0);
/*!40000 ALTER TABLE `kb_document` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kb_document_access`
--

DROP TABLE IF EXISTS `kb_document_access`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kb_document_access` (
  `id` bigint NOT NULL COMMENT '访问记录ID',
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `document_id` bigint NOT NULL COMMENT '文档ID',
  `document_title` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '文档标题',
  `category_id` bigint DEFAULT NULL COMMENT '分类ID',
  `category_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '分类名称',
  `access_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '访问时间',
  `ip_address` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '访问IP地址',
  `user_agent` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '用户代理',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `created_by` bigint DEFAULT NULL COMMENT '创建人ID',
  `updated_by` bigint DEFAULT NULL COMMENT '更新人ID',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '删除标识',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_user_document` (`user_id`,`document_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_access_time` (`access_time`),
  KEY `idx_document_id` (`document_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档访问记录表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kb_document_access`
--

LOCK TABLES `kb_document_access` WRITE;
/*!40000 ALTER TABLE `kb_document_access` DISABLE KEYS */;
/*!40000 ALTER TABLE `kb_document_access` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kb_document_review`
--

DROP TABLE IF EXISTS `kb_document_review`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kb_document_review` (
  `id` bigint NOT NULL COMMENT '审核ID',
  `document_id` bigint NOT NULL COMMENT '文档ID',
  `document_title` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '文档标题（冗余字段）',
  `submitter_id` bigint NOT NULL COMMENT '提交人ID',
  `submitter_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '提交人姓名（冗余字段）',
  `reviewer_id` bigint DEFAULT NULL COMMENT '审核人ID',
  `reviewer_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '审核人姓名（冗余字段）',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending' COMMENT '状态',
  `comment` text COLLATE utf8mb4_unicode_ci COMMENT '审核意见',
  `submit_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '提交时间',
  `review_time` datetime DEFAULT NULL COMMENT '审核时间',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_document_id` (`document_id`),
  KEY `idx_submitter_id` (`submitter_id`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档审核表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kb_document_review`
--

LOCK TABLES `kb_document_review` WRITE;
/*!40000 ALTER TABLE `kb_document_review` DISABLE KEYS */;
/*!40000 ALTER TABLE `kb_document_review` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kb_document_share`
--

DROP TABLE IF EXISTS `kb_document_share`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kb_document_share` (
  `id` bigint NOT NULL COMMENT '主键ID（雪花算法）',
  `share_id` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '分享ID（唯一标识）',
  `document_id` bigint NOT NULL COMMENT '文档ID',
  `title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '分享标题',
  `share_type` tinyint DEFAULT '1' COMMENT '分享类型：1-公开链接，2-私信分享',
  `share_code` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '分享码',
  `expire_type` tinyint DEFAULT '1' COMMENT '有效期类型：1-永久，2-限时',
  `expire_time` datetime DEFAULT NULL COMMENT '过期时间',
  `access_limit` int DEFAULT '0' COMMENT '访问次数限制（0-不限制）',
  `access_count` int DEFAULT '0' COMMENT '已访问次数',
  `require_password` tinyint DEFAULT '0' COMMENT '是否需要密码：0-否，1-是',
  `password` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '访问密码（MD5加密）',
  `sharer_id` bigint DEFAULT NULL COMMENT '分享人ID',
  `sharer_name` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '分享人名称',
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '分享描述',
  `status` tinyint DEFAULT '0' COMMENT '状态：0-有效，1-已失效，2-已删除',
  `share_time` datetime DEFAULT NULL COMMENT '分享时间',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` bigint DEFAULT NULL COMMENT '创建人ID',
  `update_by` bigint DEFAULT NULL COMMENT '更新人ID',
  `deleted` tinyint DEFAULT '0' COMMENT '逻辑删除标记',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_share_id` (`share_id`),
  KEY `idx_document_id` (`document_id`),
  KEY `idx_sharer_id` (`sharer_id`),
  KEY `idx_status` (`status`),
  KEY `idx_share_time` (`share_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档分享表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kb_document_share`
--

LOCK TABLES `kb_document_share` WRITE;
/*!40000 ALTER TABLE `kb_document_share` DISABLE KEYS */;
/*!40000 ALTER TABLE `kb_document_share` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kb_document_tag`
--

DROP TABLE IF EXISTS `kb_document_tag`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kb_document_tag` (
  `id` bigint NOT NULL COMMENT '主键ID',
  `document_id` bigint NOT NULL COMMENT '文档ID',
  `tag_id` bigint NOT NULL COMMENT '标签ID',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_document_tag` (`document_id`,`tag_id`),
  KEY `idx_tag_id` (`tag_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档标签关联表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kb_document_tag`
--

LOCK TABLES `kb_document_tag` WRITE;
/*!40000 ALTER TABLE `kb_document_tag` DISABLE KEYS */;
INSERT INTO `kb_document_tag` VALUES (1100000000000000001,1000000000000000001,7000000000000000006,'2026-06-19 10:24:37'),(1100000000000000002,1000000000000000001,7000000000000000005,'2026-06-19 10:24:37'),(1100000000000000003,1000000000000000001,7000000000000000011,'2026-06-19 10:24:37'),(1100000000000000004,1000000000000000002,7000000000000000007,'2026-06-19 10:24:37'),(1100000000000000005,1000000000000000002,7000000000000000012,'2026-06-19 10:24:37'),(1100000000000000006,1000000000000000003,7000000000000000008,'2026-06-19 10:24:37'),(1100000000000000007,1000000000000000003,7000000000000000009,'2026-06-19 10:24:37'),(1100000000000000008,1000000000000000004,7000000000000000010,'2026-06-19 10:24:37'),(1100000000000000009,1000000000000000004,7000000000000000005,'2026-06-19 10:24:37');
/*!40000 ALTER TABLE `kb_document_tag` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kb_document_version`
--

DROP TABLE IF EXISTS `kb_document_version`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kb_document_version` (
  `id` bigint NOT NULL COMMENT '版本ID',
  `document_id` bigint NOT NULL COMMENT '文档ID',
  `version` int NOT NULL COMMENT '版本号',
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '文档标题',
  `content` longtext COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '文档内容',
  `change_log` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '变更说明',
  `author_id` bigint NOT NULL COMMENT '作者ID',
  `author_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '作者姓名',
  `is_current` tinyint NOT NULL DEFAULT '0' COMMENT '是否当前版本',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_doc_version` (`document_id`,`version`),
  KEY `idx_document_id` (`document_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档版本表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kb_document_version`
--

LOCK TABLES `kb_document_version` WRITE;
/*!40000 ALTER TABLE `kb_document_version` DISABLE KEYS */;
/*!40000 ALTER TABLE `kb_document_version` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kb_file_metadata`
--

DROP TABLE IF EXISTS `kb_file_metadata`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kb_file_metadata` (
  `id` bigint NOT NULL COMMENT '文件ID',
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '文件名称',
  `original_file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '文件原始名称',
  `file_extension` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '文件扩展名',
  `file_size` bigint DEFAULT NULL COMMENT '文件大小（字节）',
  `content_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '文件类型（MIME类型）',
  `storage_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '文件存储路径',
  `access_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '文件访问URL',
  `file_category` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '文件分类（image, document, video, audio, other）',
  `uploader_id` bigint DEFAULT NULL COMMENT '上传用户ID',
  `uploader_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '上传用户名称',
  `file_md5` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '文件MD5',
  `file_sha256` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '文件SHA256',
  `width` int DEFAULT NULL COMMENT '文件宽度（图片）',
  `height` int DEFAULT NULL COMMENT '文件高度（图片）',
  `thumbnail_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '缩略图URL',
  `is_public` tinyint DEFAULT '1' COMMENT '是否公开',
  `download_count` int DEFAULT '0' COMMENT '下载次数',
  `last_access_time` datetime DEFAULT NULL COMMENT '最后访问时间',
  `upload_status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'completed' COMMENT '文件状态（uploading, completed, failed）',
  `error_message` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '错误信息',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` bigint DEFAULT NULL COMMENT '创建人',
  `update_by` bigint DEFAULT NULL COMMENT '更新人',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '删除标识',
  PRIMARY KEY (`id`),
  KEY `idx_uploader_id` (`uploader_id`),
  KEY `idx_file_category` (`file_category`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文件元数据表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kb_file_metadata`
--

LOCK TABLES `kb_file_metadata` WRITE;
/*!40000 ALTER TABLE `kb_file_metadata` DISABLE KEYS */;
/*!40000 ALTER TABLE `kb_file_metadata` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kb_tag`
--

DROP TABLE IF EXISTS `kb_tag`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kb_tag` (
  `id` bigint NOT NULL COMMENT '标签ID',
  `tag_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '标签名称',
  `tag_color` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT '#1890ff' COMMENT '标签颜色',
  `description` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '标签描述',
  `use_count` int NOT NULL DEFAULT '0' COMMENT '使用次数',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` bigint DEFAULT NULL COMMENT '创建人',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '删除标识',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tag_name` (`tag_name`,`deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档标签表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kb_tag`
--

LOCK TABLES `kb_tag` WRITE;
/*!40000 ALTER TABLE `kb_tag` DISABLE KEYS */;
INSERT INTO `kb_tag` VALUES (7000000000000000001,'重要','#ff4d4f','重要文档标签',0,'2026-06-18 20:30:10','2026-06-18 20:30:10',NULL,0),(7000000000000000002,'置顶','#1890ff','置顶文档标签',0,'2026-06-18 20:30:10','2026-06-18 20:30:10',NULL,0),(7000000000000000003,'推荐','#52c41a','推荐文档标签',0,'2026-06-18 20:30:10','2026-06-18 20:30:10',NULL,0),(7000000000000000004,'草稿','#d9d9d9','草稿文档标签',0,'2026-06-18 20:30:10','2026-06-18 20:30:10',NULL,0),(7000000000000000005,'Java','#b07219','Java技术标签',0,'2026-06-18 20:30:10','2026-06-18 20:30:10',NULL,0),(7000000000000000006,'Spring Boot','#6db33f','Spring Boot标签',0,'2026-06-18 20:30:10','2026-06-18 20:30:10',NULL,0),(7000000000000000007,'React','#61dafb','React前端标签',0,'2026-06-18 20:30:10','2026-06-18 20:30:10',NULL,0),(7000000000000000008,'MySQL','#4479a1','MySQL数据库标签',0,'2026-06-18 20:30:10','2026-06-18 20:30:10',NULL,0),(7000000000000000009,'Redis','#dc382d','Redis缓存标签',0,'2026-06-18 20:30:10','2026-06-18 20:30:10',NULL,0),(7000000000000000010,'Docker','#2496ed','Docker容器标签',0,'2026-06-18 20:30:10','2026-06-18 20:30:10',NULL,0),(7000000000000000011,'架构','#722ed1','系统架构标签',0,'2026-06-18 20:30:10','2026-06-18 20:30:10',NULL,0),(7000000000000000012,'规范','#fa8c16','开发规范标签',0,'2026-06-18 20:30:10','2026-06-18 20:30:10',NULL,0);
/*!40000 ALTER TABLE `kb_tag` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kb_user_favorite`
--

DROP TABLE IF EXISTS `kb_user_favorite`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kb_user_favorite` (
  `id` bigint NOT NULL COMMENT '收藏ID',
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `document_id` bigint NOT NULL COMMENT '文档ID',
  `document_title` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '文档标题',
  `document_category_id` bigint DEFAULT NULL COMMENT '文档分类ID',
  `favorite_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '收藏时间',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '删除标识',
  `create_by` bigint DEFAULT NULL COMMENT '创建人',
  `update_by` bigint DEFAULT NULL COMMENT '更新人',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_document` (`user_id`,`document_id`,`deleted`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_document_id` (`document_id`),
  KEY `idx_favorite_time` (`favorite_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户收藏表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kb_user_favorite`
--

LOCK TABLES `kb_user_favorite` WRITE;
/*!40000 ALTER TABLE `kb_user_favorite` DISABLE KEYS */;
/*!40000 ALTER TABLE `kb_user_favorite` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_comment`
--

DROP TABLE IF EXISTS `tb_comment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_comment` (
  `id` bigint NOT NULL COMMENT '评论ID',
  `document_id` bigint NOT NULL COMMENT '文档ID',
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '评论内容',
  `user_id` bigint NOT NULL COMMENT '评论用户ID',
  `user_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '评论用户姓名',
  `user_avatar` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '评论用户头像',
  `parent_id` bigint NOT NULL DEFAULT '0' COMMENT '父评论ID',
  `reply_to_id` bigint DEFAULT NULL COMMENT '回复的评论ID',
  `reply_to_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '回复的用户名',
  `like_count` int NOT NULL DEFAULT '0' COMMENT '点赞数',
  `reply_count` int NOT NULL DEFAULT '0' COMMENT '回复数',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态：0-隐藏，1-显示',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` bigint DEFAULT NULL COMMENT '创建人',
  `update_by` bigint DEFAULT NULL COMMENT '更新人',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '删除标识',
  PRIMARY KEY (`id`),
  KEY `idx_document_id` (`document_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_parent_id` (`parent_id`),
  KEY `idx_create_time` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档评论表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_comment`
--

LOCK TABLES `tb_comment` WRITE;
/*!40000 ALTER TABLE `tb_comment` DISABLE KEYS */;
INSERT INTO `tb_comment` VALUES (1200000000000000001,1000000000000000001,'这篇文章写得很详细，对我帮助很大！',1000000000000000002,'editor',NULL,0,NULL,NULL,12,0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(1200000000000000002,1000000000000000001,'补充一点：自动配置的原理可以再详细讲讲',1000000000000000004,'developer',NULL,0,NULL,NULL,5,0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(1200000000000000003,1000000000000000002,'TypeScript的类型定义很规范，学习了！',1000000000000000003,'tester',NULL,0,NULL,NULL,8,0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(1200000000000000004,1000000000000000002,'期待出下一期关于Hooks的文章',1000000000000000002,'editor',NULL,0,NULL,NULL,3,0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(1200000000000000005,1000000000000000003,'索引优化的技巧很实用，已经在项目中应用了',1000000000000000005,'product',NULL,0,NULL,NULL,15,0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(1200000000000000006,1000000000000000005,'PRD写得很清楚，产品逻辑很完整',1000000000000000001,'admin',NULL,0,NULL,NULL,6,0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(1200000000000000007,1000000000000000008,'入职指南很详细，帮助我快速熟悉了公司',1000000000000000003,'tester',NULL,0,NULL,NULL,23,0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(1200000000000000008,1000000000000000008,'建议补充一下远程办公的注意事项',1000000000000000007,'sales',NULL,0,NULL,NULL,2,0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0);
/*!40000 ALTER TABLE `tb_comment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_document_review`
--

DROP TABLE IF EXISTS `tb_document_review`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_document_review` (
  `id` bigint NOT NULL COMMENT '审核ID',
  `document_id` bigint NOT NULL COMMENT '文档ID',
  `reviewer_id` bigint DEFAULT NULL COMMENT '审核人ID',
  `reviewer_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '审核人姓名',
  `review_result` int DEFAULT NULL COMMENT '审核结果：1-通过，2-驳回',
  `review_round` int DEFAULT '1' COMMENT '审核轮次',
  `review_comment` text COLLATE utf8mb4_unicode_ci COMMENT '审核意见',
  `before_status` int DEFAULT NULL COMMENT '审核前状态',
  `reviewed_at` datetime DEFAULT NULL COMMENT '审核时间',
  `review_level` int DEFAULT '1' COMMENT '审核级别',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_document_id` (`document_id`),
  KEY `idx_reviewer_id` (`reviewer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档审核表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_document_review`
--

LOCK TABLES `tb_document_review` WRITE;
/*!40000 ALTER TABLE `tb_document_review` DISABLE KEYS */;
/*!40000 ALTER TABLE `tb_document_review` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_document_version`
--

DROP TABLE IF EXISTS `tb_document_version`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_document_version` (
  `id` bigint NOT NULL COMMENT '版本ID',
  `document_id` bigint NOT NULL COMMENT '文档ID',
  `version` int NOT NULL COMMENT '版本号',
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '文档标题',
  `content` longtext COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '文档内容',
  `summary` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '文档摘要',
  `change_description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '版本变更说明',
  `change_size` bigint DEFAULT NULL COMMENT '变更大小(字节)',
  `operator_id` bigint DEFAULT NULL COMMENT '操作人ID',
  `operator_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '操作人姓名',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_document_id` (`document_id`),
  KEY `idx_operator_id` (`operator_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档版本表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_document_version`
--

LOCK TABLES `tb_document_version` WRITE;
/*!40000 ALTER TABLE `tb_document_version` DISABLE KEYS */;
/*!40000 ALTER TABLE `tb_document_version` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_like`
--

DROP TABLE IF EXISTS `tb_like`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_like` (
  `id` bigint NOT NULL COMMENT '点赞ID',
  `target_id` bigint NOT NULL COMMENT '目标ID（文档或评论）',
  `target_type` tinyint NOT NULL COMMENT '目标类型：1-文档，2-评论',
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_target_user_type` (`target_id`,`user_id`,`target_type`),
  KEY `idx_target_id` (`target_id`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='点赞表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_like`
--

LOCK TABLES `tb_like` WRITE;
/*!40000 ALTER TABLE `tb_like` DISABLE KEYS */;
/*!40000 ALTER TABLE `tb_like` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_tag`
--

DROP TABLE IF EXISTS `tb_tag`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_tag` (
  `id` bigint NOT NULL COMMENT '标签ID',
  `tag_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '标签名称',
  `tag_color` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT '#1890ff' COMMENT '标签颜色',
  `description` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '标签描述',
  `use_count` int NOT NULL DEFAULT '0' COMMENT '使用次数',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` bigint DEFAULT NULL COMMENT '创建人',
  `update_by` bigint DEFAULT NULL COMMENT '更新人',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '删除标识',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tag_name` (`tag_name`,`deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档标签表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_tag`
--

LOCK TABLES `tb_tag` WRITE;
/*!40000 ALTER TABLE `tb_tag` DISABLE KEYS */;
INSERT INTO `tb_tag` VALUES (7000000000000000001,'重要','#ff4d4f','重要文档标签',0,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(7000000000000000002,'置顶','#1890ff','置顶文档标签',0,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(7000000000000000003,'推荐','#52c41a','推荐文档标签',0,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(7000000000000000004,'草稿','#d9d9d9','草稿文档标签',0,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(7000000000000000005,'Java','#b07219','Java技术标签',0,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(7000000000000000006,'Spring Boot','#6db33f','Spring Boot标签',0,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(7000000000000000007,'React','#61dafb','React前端标签',0,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(7000000000000000008,'MySQL','#4479a1','MySQL数据库标签',0,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(7000000000000000009,'Redis','#dc382d','Redis缓存标签',0,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(7000000000000000010,'Docker','#2496ed','Docker容器标签',0,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(7000000000000000011,'架构','#722ed1','系统架构标签',0,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(7000000000000000012,'规范','#fa8c16','开发规范标签',0,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0);
/*!40000 ALTER TABLE `tb_tag` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'kb_document'
--

--
-- Dumping routines for database 'kb_document'
--

--
-- Current Database: `kb_search`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `kb_search` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `kb_search`;

--
-- Table structure for table `kb_search_history`
--

DROP TABLE IF EXISTS `kb_search_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kb_search_history` (
  `id` bigint NOT NULL COMMENT '搜索历史ID',
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `keyword` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '搜索关键词',
  `search_count` int DEFAULT '0' COMMENT '搜索次数',
  `search_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'document' COMMENT '搜索类型：document-文档，user-用户',
  `result_count` int DEFAULT '0' COMMENT '结果数量',
  `search_params` json DEFAULT NULL COMMENT '搜索参数',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '搜索时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_keyword` (`keyword`(100)),
  KEY `idx_create_time` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='搜索历史表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kb_search_history`
--

LOCK TABLES `kb_search_history` WRITE;
/*!40000 ALTER TABLE `kb_search_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `kb_search_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'kb_search'
--

--
-- Dumping routines for database 'kb_search'
--

--
-- Current Database: `kb_file`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `kb_file` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `kb_file`;

--
-- Table structure for table `kb_file`
--

DROP TABLE IF EXISTS `kb_file`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kb_file` (
  `id` bigint NOT NULL COMMENT '文件ID',
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '文件名',
  `original_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '原始文件名',
  `file_path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '文件路径',
  `file_size` bigint NOT NULL COMMENT '文件大小（字节）',
  `file_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '文件类型',
  `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'MIME类型',
  `file_extension` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '文件扩展名',
  `storage_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'local' COMMENT '存储类型',
  `upload_user_id` bigint NOT NULL COMMENT '上传用户ID',
  `upload_user_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '上传用户姓名（冗余字段）',
  `related_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '关联类型',
  `related_id` bigint DEFAULT NULL COMMENT '关联ID',
  `download_count` int NOT NULL DEFAULT '0' COMMENT '下载次数',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '删除标识',
  PRIMARY KEY (`id`),
  KEY `idx_upload_user_id` (`upload_user_id`),
  KEY `idx_related` (`related_type`,`related_id`),
  KEY `idx_file_type` (`file_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文件信息表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kb_file`
--

LOCK TABLES `kb_file` WRITE;
/*!40000 ALTER TABLE `kb_file` DISABLE KEYS */;
/*!40000 ALTER TABLE `kb_file` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_file`
--

DROP TABLE IF EXISTS `tb_file`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tb_file` (
  `id` bigint NOT NULL COMMENT '文件ID',
  `original_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '原始文件名',
  `stored_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '存储文件名',
  `file_path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '文件路径',
  `file_size` bigint NOT NULL COMMENT '文件大小（字节）',
  `file_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '文件类型',
  `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'MIME类型',
  `file_hash` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '文件哈希',
  `storage_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'local' COMMENT '存储类型：local-本地，oss-对象存储',
  `bucket_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '存储桶名称',
  `uploader_id` bigint NOT NULL COMMENT '上传者ID',
  `access_level` int NOT NULL DEFAULT '0' COMMENT '访问级别：0-私有，1-团队可见，2-公开',
  `download_count` int NOT NULL DEFAULT '0' COMMENT '下载次数',
  `status` int NOT NULL DEFAULT '1' COMMENT '状态：0-删除，1-正常',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '删除标识',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` bigint DEFAULT NULL COMMENT '创建人ID',
  `update_by` bigint DEFAULT NULL COMMENT '更新人ID',
  `duration` int DEFAULT NULL COMMENT '时长（秒），音视频文件专用',
  `resolution` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '分辨率',
  `bitrate` int DEFAULT NULL COMMENT '码率（kbps）',
  `transcode_status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '转码状态：PENDING/PROCESSING/DONE/FAILED',
  `hls_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'HLS播放列表路径',
  `thumbnail_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '缩略图路径',
  PRIMARY KEY (`id`),
  KEY `idx_uploader_id` (`uploader_id`),
  KEY `idx_file_type` (`file_type`),
  KEY `idx_file_hash` (`file_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文件信息表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_file`
--

LOCK TABLES `tb_file` WRITE;
/*!40000 ALTER TABLE `tb_file` DISABLE KEYS */;
/*!40000 ALTER TABLE `tb_file` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'kb_file'
--

--
-- Dumping routines for database 'kb_file'
--

--
-- Current Database: `kb_ai`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `kb_ai` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `kb_ai`;

--
-- Table structure for table `ai_feedback`
--

DROP TABLE IF EXISTS `ai_feedback`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ai_feedback` (
  `id` bigint NOT NULL COMMENT '反馈ID',
  `conversation_id` bigint NOT NULL COMMENT '对话ID',
  `message_id` bigint NOT NULL COMMENT '消息ID',
  `feedback_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '反馈类型：like-点赞，dislike-点踩',
  `comment` text COLLATE utf8mb4_unicode_ci COMMENT '反馈意见',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '删除标识',
  PRIMARY KEY (`id`),
  KEY `idx_conversation_id` (`conversation_id`),
  KEY `idx_message_id` (`message_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI反馈表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ai_feedback`
--

LOCK TABLES `ai_feedback` WRITE;
/*!40000 ALTER TABLE `ai_feedback` DISABLE KEYS */;
/*!40000 ALTER TABLE `ai_feedback` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `conversation`
--

DROP TABLE IF EXISTS `conversation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `conversation` (
  `id` bigint NOT NULL COMMENT '对话ID',
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `user_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '用户名称',
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '对话标题',
  `model` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'qwen' COMMENT 'AI模型名称',
  `system_prompt` text COLLATE utf8mb4_unicode_ci COMMENT '系统提示词',
  `model_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'qwen' COMMENT 'AI模型名称(旧字段)',
  `message_count` int DEFAULT '0' COMMENT '消息数量',
  `tokens_used` int DEFAULT '0' COMMENT 'Token使用量',
  `status` tinyint DEFAULT '0' COMMENT '状态（0-进行中，1-已结束）',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '删除标识',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_update_time` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI对话表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `conversation`
--

LOCK TABLES `conversation` WRITE;
/*!40000 ALTER TABLE `conversation` DISABLE KEYS */;
INSERT INTO `conversation` VALUES (1600000000000000001,1000000000000000001,'admin','关于Spring Boot的讨论','qwen-turbo',NULL,'qwen-turbo',2,0,0,'2026-06-19 10:24:37','2026-06-19 10:24:37',0),(1600000000000000002,1000000000000000002,'editor','前端开发问题咨询','qwen-turbo',NULL,'qwen-turbo',2,0,0,'2026-06-19 10:24:37','2026-06-19 10:24:37',0),(1600000000000000003,1000000000000000004,'developer','数据库优化建议','qwen-turbo',NULL,'qwen-turbo',2,0,0,'2026-06-19 10:24:37','2026-06-19 10:24:37',0);
/*!40000 ALTER TABLE `conversation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kb_ai_conversation`
--

DROP TABLE IF EXISTS `kb_ai_conversation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kb_ai_conversation` (
  `id` bigint NOT NULL COMMENT '对话ID',
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `user_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '用户姓名（冗余字段）',
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '对话标题',
  `model_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'qwen-turbo' COMMENT 'AI模型名称',
  `message_count` int NOT NULL DEFAULT '0' COMMENT '消息数量',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_update_time` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI对话表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kb_ai_conversation`
--

LOCK TABLES `kb_ai_conversation` WRITE;
/*!40000 ALTER TABLE `kb_ai_conversation` DISABLE KEYS */;
INSERT INTO `kb_ai_conversation` VALUES (1600000000000000001,1000000000000001,'admin','关于Spring Boot的讨论','qwen-turbo',2,'2026-06-18 20:30:11','2026-06-18 20:30:11'),(1600000000000000002,1000000000000002,'editor','前端开发问题咨询','qwen-turbo',2,'2026-06-18 20:30:11','2026-06-18 20:30:11'),(1600000000000000003,1000000000000004,'developer','数据库优化建议','qwen-turbo',2,'2026-06-18 20:30:11','2026-06-18 20:30:11');
/*!40000 ALTER TABLE `kb_ai_conversation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kb_ai_feedback`
--

DROP TABLE IF EXISTS `kb_ai_feedback`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kb_ai_feedback` (
  `id` bigint NOT NULL COMMENT '反馈ID',
  `conversation_id` bigint NOT NULL COMMENT '对话ID',
  `message_id` bigint NOT NULL COMMENT '消息ID',
  `feedback_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '反馈类型：like/dislike',
  `comment` text COLLATE utf8mb4_unicode_ci COMMENT '反馈意见',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_conversation_id` (`conversation_id`),
  KEY `idx_message_id` (`message_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI反馈表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kb_ai_feedback`
--

LOCK TABLES `kb_ai_feedback` WRITE;
/*!40000 ALTER TABLE `kb_ai_feedback` DISABLE KEYS */;
/*!40000 ALTER TABLE `kb_ai_feedback` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kb_ai_message`
--

DROP TABLE IF EXISTS `kb_ai_message`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kb_ai_message` (
  `id` bigint NOT NULL COMMENT '消息ID',
  `conversation_id` bigint NOT NULL COMMENT '对话ID',
  `role` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '角色：user/assistant/system',
  `content` longtext COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '消息内容',
  `tokens` int DEFAULT NULL COMMENT 'Token数量',
  `model_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '使用的模型',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_conversation_id` (`conversation_id`),
  KEY `idx_create_time` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI消息表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kb_ai_message`
--

LOCK TABLES `kb_ai_message` WRITE;
/*!40000 ALTER TABLE `kb_ai_message` DISABLE KEYS */;
INSERT INTO `kb_ai_message` VALUES (1700000000000000001,1600000000000000001,'user','Spring Boot自动配置的原理是什么？',20,NULL,'2026-06-18 20:30:11'),(1700000000000000002,1600000000000000001,'assistant','Spring Boot的自动配置是通过条件注解(@ConditionalOnClass、@ConditionalOnMissingBean等)实现的。它会根据类路径中的jar包和已定义的Bean来决定是否加载某个配置...',150,NULL,'2026-06-18 20:30:11'),(1700000000000000003,1600000000000000002,'user','React 18的新特性有哪些？',18,NULL,'2026-06-18 20:30:11'),(1700000000000000004,1600000000000000002,'assistant','React 18的主要新特性包括：1. 并发渲染 2. 自动批处理 3. Transitions 4. Suspense改进...',120,NULL,'2026-06-18 20:30:11'),(1700000000000000005,1600000000000000003,'user','如何优化MySQL查询性能？',15,NULL,'2026-06-18 20:30:11'),(1700000000000000006,1600000000000000003,'assistant','MySQL查询优化可以从以下几个方面入手：1. 索引优化 2. 查询语句优化 3. 表结构优化 4. 参数调优...',135,NULL,'2026-06-18 20:30:11');
/*!40000 ALTER TABLE `kb_ai_message` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `message`
--

DROP TABLE IF EXISTS `message`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `message` (
  `id` bigint NOT NULL COMMENT '消息ID',
  `conversation_id` bigint NOT NULL COMMENT '对话ID',
  `role` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '角色：user-用户，assistant-助手，system-系统',
  `content` longtext COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '消息内容',
  `tokens` int DEFAULT NULL COMMENT 'Token数量',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '删除标识',
  PRIMARY KEY (`id`),
  KEY `idx_conversation_id` (`conversation_id`),
  KEY `idx_create_time` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI消息表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `message`
--

LOCK TABLES `message` WRITE;
/*!40000 ALTER TABLE `message` DISABLE KEYS */;
INSERT INTO `message` VALUES (1700000000000000001,1600000000000000001,'user','Spring Boot自动配置的原理是什么？',20,'2026-06-19 10:24:37',0),(1700000000000000002,1600000000000000001,'assistant','Spring Boot的自动配置是通过条件注解(@ConditionalOnClass、@ConditionalOnMissingBean等)实现的。它会根据类路径中的jar包和已定义的Bean来决定是否加载某个配置...',150,'2026-06-19 10:24:37',0),(1700000000000000003,1600000000000000002,'user','React 18的新特性有哪些？',18,'2026-06-19 10:24:37',0),(1700000000000000004,1600000000000000002,'assistant','React 18的主要新特性包括：1. 并发渲染 2. 自动批处理 3. Transitions 4. Suspense改进...',120,'2026-06-19 10:24:37',0),(1700000000000000005,1600000000000000003,'user','如何优化MySQL查询性能？',15,'2026-06-19 10:24:37',0),(1700000000000000006,1600000000000000003,'assistant','MySQL查询优化可以从以下几个方面入手：1. 索引优化 2. 查询语句优化 3. 表结构优化 4. 参数调优...',135,'2026-06-19 10:24:37',0);
/*!40000 ALTER TABLE `message` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'kb_ai'
--

--
-- Dumping routines for database 'kb_ai'
--

--
-- Current Database: `kb_statistics`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `kb_statistics` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `kb_statistics`;

--
-- Temporary view structure for view `kb_ai_conversation`
--

DROP TABLE IF EXISTS `kb_ai_conversation`;
/*!50001 DROP VIEW IF EXISTS `kb_ai_conversation`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `kb_ai_conversation` AS SELECT 
 1 AS `id`,
 1 AS `user_id`,
 1 AS `user_name`,
 1 AS `title`,
 1 AS `model_name`,
 1 AS `message_count`,
 1 AS `created_at`,
 1 AS `updated_at`,
 1 AS `deleted`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `kb_ai_message`
--

DROP TABLE IF EXISTS `kb_ai_message`;
/*!50001 DROP VIEW IF EXISTS `kb_ai_message`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `kb_ai_message` AS SELECT 
 1 AS `id`,
 1 AS `conversation_id`,
 1 AS `role`,
 1 AS `content`,
 1 AS `tokens`,
 1 AS `created_at`,
 1 AS `deleted`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `kb_category`
--

DROP TABLE IF EXISTS `kb_category`;
/*!50001 DROP VIEW IF EXISTS `kb_category`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `kb_category` AS SELECT 
 1 AS `id`,
 1 AS `category_name`,
 1 AS `parent_id`,
 1 AS `category_icon`,
 1 AS `description`,
 1 AS `sort`,
 1 AS `document_count`,
 1 AS `status`,
 1 AS `created_at`,
 1 AS `updated_at`,
 1 AS `create_by`,
 1 AS `update_by`,
 1 AS `deleted`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `kb_comment`
--

DROP TABLE IF EXISTS `kb_comment`;
/*!50001 DROP VIEW IF EXISTS `kb_comment`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `kb_comment` AS SELECT 
 1 AS `id`,
 1 AS `document_id`,
 1 AS `content`,
 1 AS `user_id`,
 1 AS `user_name`,
 1 AS `user_avatar`,
 1 AS `parent_id`,
 1 AS `reply_to_id`,
 1 AS `reply_to_name`,
 1 AS `like_count`,
 1 AS `reply_count`,
 1 AS `status`,
 1 AS `created_at`,
 1 AS `updated_at`,
 1 AS `deleted`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `kb_comment_statistics`
--

DROP TABLE IF EXISTS `kb_comment_statistics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kb_comment_statistics` (
  `id` bigint NOT NULL COMMENT '统计ID',
  `comment_id` bigint NOT NULL COMMENT '评论ID',
  `like_count` int NOT NULL DEFAULT '0' COMMENT '点赞次数',
  `reply_count` int NOT NULL DEFAULT '0' COMMENT '回复次数',
  `stat_date` date NOT NULL COMMENT '统计日期',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_comment_date` (`comment_id`,`stat_date`),
  KEY `idx_stat_date` (`stat_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='评论统计表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kb_comment_statistics`
--

LOCK TABLES `kb_comment_statistics` WRITE;
/*!40000 ALTER TABLE `kb_comment_statistics` DISABLE KEYS */;
/*!40000 ALTER TABLE `kb_comment_statistics` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `kb_document`
--

DROP TABLE IF EXISTS `kb_document`;
/*!50001 DROP VIEW IF EXISTS `kb_document`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `kb_document` AS SELECT 
 1 AS `id`,
 1 AS `title`,
 1 AS `author_id`,
 1 AS `author_name`,
 1 AS `category_id`,
 1 AS `status`,
 1 AS `view_count`,
 1 AS `like_count`,
 1 AS `favorite_count`,
 1 AS `comment_count`,
 1 AS `is_public`,
 1 AS `is_top`,
 1 AS `is_recommend`,
 1 AS `document_type`,
 1 AS `source`,
 1 AS `cover_image`,
 1 AS `summary`,
 1 AS `sort`,
 1 AS `allow_comment`,
 1 AS `publish_time`,
 1 AS `created_at`,
 1 AS `updated_at`,
 1 AS `create_by`,
 1 AS `update_by`,
 1 AS `deleted`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `kb_document_statistics`
--

DROP TABLE IF EXISTS `kb_document_statistics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kb_document_statistics` (
  `id` bigint NOT NULL COMMENT '统计ID',
  `document_id` bigint NOT NULL COMMENT '文档ID',
  `document_title` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '文档标题',
  `view_count` int NOT NULL DEFAULT '0' COMMENT '浏览次数',
  `like_count` int NOT NULL DEFAULT '0' COMMENT '点赞次数',
  `comment_count` int NOT NULL DEFAULT '0' COMMENT '评论次数',
  `favorite_count` int NOT NULL DEFAULT '0' COMMENT '收藏次数',
  `share_count` int NOT NULL DEFAULT '0' COMMENT '分享次数',
  `stat_date` date NOT NULL COMMENT '统计日期',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_doc_date` (`document_id`,`stat_date`),
  KEY `idx_stat_date` (`stat_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档统计表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kb_document_statistics`
--

LOCK TABLES `kb_document_statistics` WRITE;
/*!40000 ALTER TABLE `kb_document_statistics` DISABLE KEYS */;
INSERT INTO `kb_document_statistics` VALUES (1800000000000000001,1000000000000000001,'Spring Boot 3.x 快速入门指南',1523,89,23,45,12,'2026-06-19','2026-06-19 10:24:37'),(1800000000000000002,1000000000000000002,'React 18 + TypeScript 最佳实践',2187,156,45,67,23,'2026-06-19','2026-06-19 10:24:37'),(1800000000000000003,1000000000000000003,'MySQL 8.0 性能优化指南',3421,234,67,89,34,'2026-06-19','2026-06-19 10:24:37'),(1800000000000000004,1000000000000000004,'Docker + Kubernetes 容器化部署',1876,98,19,34,8,'2026-06-19','2026-06-19 10:24:37'),(1800000000000000005,1000000000000000005,'企业知识库产品需求文档PRD',987,45,12,23,5,'2026-06-19','2026-06-19 10:24:37'),(1800000000000000006,1000000000000000006,'UI设计规范 V2.0',654,34,8,12,3,'2026-06-19','2026-06-19 10:24:37'),(1800000000000000007,1000000000000000007,'文档审核流程规范',1234,67,15,34,7,'2026-06-19','2026-06-19 10:24:37'),(1800000000000000008,1000000000000000008,'员工入职指南',5678,234,56,89,45,'2026-06-19','2026-06-19 10:24:37'),(1800000000000000009,1000000000000000009,'报销流程说明',3456,123,34,56,21,'2026-06-19','2026-06-19 10:24:37');
/*!40000 ALTER TABLE `kb_document_statistics` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `kb_operation_log`
--

DROP TABLE IF EXISTS `kb_operation_log`;
/*!50001 DROP VIEW IF EXISTS `kb_operation_log`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `kb_operation_log` AS SELECT 
 1 AS `id`,
 1 AS `module`,
 1 AS `operation_type`,
 1 AS `operation_desc`,
 1 AS `request_method`,
 1 AS `request_url`,
 1 AS `request_params`,
 1 AS `response_result`,
 1 AS `user_id`,
 1 AS `username`,
 1 AS `ip_address`,
 1 AS `location`,
 1 AS `user_agent`,
 1 AS `execute_time`,
 1 AS `status`,
 1 AS `error_msg`,
 1 AS `created_at`,
 1 AS `updated_at`,
 1 AS `create_by`,
 1 AS `update_by`,
 1 AS `deleted`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `kb_user`
--

DROP TABLE IF EXISTS `kb_user`;
/*!50001 DROP VIEW IF EXISTS `kb_user`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `kb_user` AS SELECT 
 1 AS `id`,
 1 AS `username`,
 1 AS `real_name`,
 1 AS `avatar`,
 1 AS `status`,
 1 AS `email`,
 1 AS `phone`,
 1 AS `department`,
 1 AS `position`,
 1 AS `last_login_time`,
 1 AS `created_at`,
 1 AS `updated_at`,
 1 AS `deleted`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `kb_user_statistics`
--

DROP TABLE IF EXISTS `kb_user_statistics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kb_user_statistics` (
  `id` bigint NOT NULL COMMENT '统计ID',
  `user_id` bigint NOT NULL COMMENT '用户ID',
  `user_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '用户姓名',
  `document_count` int NOT NULL DEFAULT '0' COMMENT '文档数量',
  `comment_count` int NOT NULL DEFAULT '0' COMMENT '评论数量',
  `like_count` int NOT NULL DEFAULT '0' COMMENT '点赞次数',
  `view_count` int NOT NULL DEFAULT '0' COMMENT '浏览次数',
  `login_count` int NOT NULL DEFAULT '0' COMMENT '登录次数',
  `stat_date` date NOT NULL COMMENT '统计日期',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_date` (`user_id`,`stat_date`),
  KEY `idx_stat_date` (`stat_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户统计表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kb_user_statistics`
--

LOCK TABLES `kb_user_statistics` WRITE;
/*!40000 ALTER TABLE `kb_user_statistics` DISABLE KEYS */;
INSERT INTO `kb_user_statistics` VALUES (1900000000000000001,1000000000000000001,'admin',3,15,45,2345,67,'2026-06-19','2026-06-19 10:24:37'),(1900000000000000002,1000000000000000004,'developer',2,23,89,4523,89,'2026-06-19','2026-06-19 10:24:37'),(1900000000000000003,1000000000000000002,'editor',1,12,34,1234,45,'2026-06-19','2026-06-19 10:24:37'),(1900000000000000004,1000000000000000006,'designer',1,8,34,876,23,'2026-06-19','2026-06-19 10:24:37'),(1900000000000000005,1000000000000000005,'product',1,6,23,1567,34,'2026-06-19','2026-06-19 10:24:37'),(1900000000000000006,1000000000000000003,'tester',0,8,15,987,12,'2026-06-19','2026-06-19 10:24:37');
/*!40000 ALTER TABLE `kb_user_statistics` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kb_view_history`
--

DROP TABLE IF EXISTS `kb_view_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kb_view_history` (
  `id` bigint NOT NULL COMMENT '记录ID（雪花算法生成）',
  `user_id` bigint DEFAULT NULL COMMENT '用户ID（未登录为NULL）',
  `user_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '用户姓名',
  `document_id` bigint NOT NULL COMMENT '文档ID',
  `document_title` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '文档标题',
  `view_duration` int DEFAULT NULL COMMENT '浏览时长（秒）',
  `ip_address` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'IP地址',
  `user_agent` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '用户代理',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '浏览时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_document_id` (`document_id`),
  KEY `idx_create_time` (`created_at`),
  KEY `idx_user_document` (`user_id`,`document_id`),
  KEY `idx_doc_date` (`document_id`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户浏览历史记录表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kb_view_history`
--

LOCK TABLES `kb_view_history` WRITE;
/*!40000 ALTER TABLE `kb_view_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `kb_view_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kb_view_record`
--

DROP TABLE IF EXISTS `kb_view_record`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kb_view_record` (
  `id` bigint NOT NULL COMMENT '记录ID',
  `user_id` bigint DEFAULT NULL COMMENT '用户ID',
  `document_id` bigint NOT NULL COMMENT '文档ID',
  `view_duration` int DEFAULT NULL COMMENT '浏览时长（秒）',
  `ip_address` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'IP地址',
  `user_agent` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '用户代理',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '浏览时间',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_document_id` (`document_id`),
  KEY `idx_create_time` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='浏览记录表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kb_view_record`
--

LOCK TABLES `kb_view_record` WRITE;
/*!40000 ALTER TABLE `kb_view_record` DISABLE KEYS */;
/*!40000 ALTER TABLE `kb_view_record` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'kb_statistics'
--

--
-- Dumping routines for database 'kb_statistics'
--

--
-- Current Database: `kb_notification`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `kb_notification` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `kb_notification`;

--
-- Table structure for table `kb_notification`
--

DROP TABLE IF EXISTS `kb_notification`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kb_notification` (
  `id` bigint NOT NULL COMMENT '通知ID',
  `user_id` bigint NOT NULL COMMENT '接收用户ID',
  `user_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '接收用户姓名',
  `notification_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '通知类型：system-系统，comment-评论，mention-提及，review-审核，like-点赞',
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '通知标题',
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '通知内容',
  `link` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '跳转链接',
  `related_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '关联类型',
  `related_id` bigint DEFAULT NULL COMMENT '关联ID',
  `is_read` tinyint NOT NULL DEFAULT '0' COMMENT '是否已读：0-未读，1-已读',
  `read_time` datetime DEFAULT NULL COMMENT '阅读时间',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` bigint DEFAULT NULL COMMENT '创建人ID',
  `update_by` bigint DEFAULT NULL COMMENT '更新人ID',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '逻辑删除标记',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_is_read` (`is_read`),
  KEY `idx_notification_type` (`notification_type`),
  KEY `idx_create_time` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统通知表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kb_notification`
--

LOCK TABLES `kb_notification` WRITE;
/*!40000 ALTER TABLE `kb_notification` DISABLE KEYS */;
INSERT INTO `kb_notification` VALUES (1500000000000000001,1000000000000000002,'editor','system','欢迎加入企业知识库','欢迎加入企业知识库系统，开始您的知识管理之旅！','/documents',0,NULL,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(1500000000000000002,1000000000000000004,'developer','comment','您的文档收到新评论','《Spring Boot 3.x 快速入门指南》收到新评论','/documents/1000000000000000001',0,NULL,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(1500000000000000003,1000000000000000005,'product','review','文档审核通过','您的《企业知识库产品需求文档PRD》已通过审核','/documents/1000000000000000005',1,NULL,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(1500000000000000004,1000000000000000001,'admin','mention','有人@了您','developer在《Docker + Kubernetes 容器化部署》中提到了您','/documents/1000000000000000004',0,NULL,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0);
/*!40000 ALTER TABLE `kb_notification` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'kb_notification'
--

--
-- Dumping routines for database 'kb_notification'
--

--
-- Current Database: `kb_graph`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `kb_graph` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `kb_graph`;

--
-- Table structure for table `kb_graph_community`
--

DROP TABLE IF EXISTS `kb_graph_community`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kb_graph_community` (
  `id` bigint NOT NULL COMMENT '社区ID',
  `community_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '社区名称',
  `node_count` int NOT NULL DEFAULT '0' COMMENT '节点数量',
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '描述',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='图谱社区表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kb_graph_community`
--

LOCK TABLES `kb_graph_community` WRITE;
/*!40000 ALTER TABLE `kb_graph_community` DISABLE KEYS */;
/*!40000 ALTER TABLE `kb_graph_community` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kb_graph_community_node`
--

DROP TABLE IF EXISTS `kb_graph_community_node`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kb_graph_community_node` (
  `id` bigint NOT NULL COMMENT '主键ID',
  `community_id` bigint NOT NULL COMMENT '社区ID',
  `node_id` bigint NOT NULL COMMENT '节点ID',
  `node_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '节点类型',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_community_node` (`community_id`,`node_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='社区节点关联表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kb_graph_community_node`
--

LOCK TABLES `kb_graph_community_node` WRITE;
/*!40000 ALTER TABLE `kb_graph_community_node` DISABLE KEYS */;
/*!40000 ALTER TABLE `kb_graph_community_node` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kb_graph_edge`
--

DROP TABLE IF EXISTS `kb_graph_edge`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kb_graph_edge` (
  `id` bigint NOT NULL COMMENT '关系ID',
  `source_node_id` bigint NOT NULL COMMENT '源节点ID',
  `target_node_id` bigint NOT NULL COMMENT '目标节点ID',
  `relation_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '关系类型：similar-相似，related-相关，reference-引用',
  `weight` float DEFAULT '1' COMMENT '关系权重',
  `properties` json DEFAULT NULL COMMENT '关系属性',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_source_node` (`source_node_id`),
  KEY `idx_target_node` (`target_node_id`),
  KEY `idx_relation_type` (`relation_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='图谱关系表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kb_graph_edge`
--

LOCK TABLES `kb_graph_edge` WRITE;
/*!40000 ALTER TABLE `kb_graph_edge` DISABLE KEYS */;
/*!40000 ALTER TABLE `kb_graph_edge` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kb_graph_node`
--

DROP TABLE IF EXISTS `kb_graph_node`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kb_graph_node` (
  `id` bigint NOT NULL COMMENT '节点ID',
  `node_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '节点名称',
  `node_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '节点类型：document-文档，tag-标签，user-用户',
  `source_id` bigint DEFAULT NULL COMMENT '源数据ID',
  `properties` json DEFAULT NULL COMMENT '节点属性',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_node` (`node_type`,`source_id`),
  KEY `idx_node_type` (`node_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='图谱节点表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kb_graph_node`
--

LOCK TABLES `kb_graph_node` WRITE;
/*!40000 ALTER TABLE `kb_graph_node` DISABLE KEYS */;
/*!40000 ALTER TABLE `kb_graph_node` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'kb_graph'
--

--
-- Dumping routines for database 'kb_graph'
--

--
-- Current Database: `kb_common`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `kb_common` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `kb_common`;

--
-- Table structure for table `kb_dict`
--

DROP TABLE IF EXISTS `kb_dict`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kb_dict` (
  `id` bigint NOT NULL COMMENT '字典ID',
  `dict_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '字典编码',
  `dict_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '字典名称',
  `dict_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '字典类型',
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '描述',
  `sort` int NOT NULL DEFAULT '0' COMMENT '排序',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态：0-禁用，1-启用',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` bigint DEFAULT NULL COMMENT '创建人',
  `update_by` bigint DEFAULT NULL COMMENT '更新人',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '删除标识',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dict_code` (`dict_code`),
  KEY `idx_dict_type` (`dict_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='字典表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kb_dict`
--

LOCK TABLES `kb_dict` WRITE;
/*!40000 ALTER TABLE `kb_dict` DISABLE KEYS */;
INSERT INTO `kb_dict` VALUES (1400000000000000001,'document_status','文档状态','document','文档状态枚举',1,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(1400000000000000002,'review_status','审核状态','review','审核状态枚举',2,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(1400000000000000003,'notification_type','通知类型','notification','通知类型枚举',3,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0);
/*!40000 ALTER TABLE `kb_dict` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kb_dict_data`
--

DROP TABLE IF EXISTS `kb_dict_data`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kb_dict_data` (
  `id` bigint NOT NULL COMMENT '字典数据ID',
  `dict_id` bigint NOT NULL COMMENT '字典ID',
  `dict_label` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '字典标签',
  `dict_value` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '字典值',
  `dict_sort` int NOT NULL DEFAULT '0' COMMENT '排序',
  `css_class` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '样式类名',
  `list_class` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '列表样式',
  `is_default` tinyint NOT NULL DEFAULT '0' COMMENT '是否默认：0-否，1-是',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态：0-禁用，1-启用',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` bigint DEFAULT NULL COMMENT '创建人',
  `update_by` bigint DEFAULT NULL COMMENT '更新人',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '删除标识',
  PRIMARY KEY (`id`),
  KEY `idx_dict_id` (`dict_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='字典数据表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kb_dict_data`
--

LOCK TABLES `kb_dict_data` WRITE;
/*!40000 ALTER TABLE `kb_dict_data` DISABLE KEYS */;
INSERT INTO `kb_dict_data` VALUES (1400000000000000001,1400000000000000001,'草稿','draft',1,'default',NULL,0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(1400000000000000002,1400000000000000001,'已发布','published',2,'success',NULL,0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(1400000000000000003,1400000000000000001,'已归档','archived',3,'info',NULL,0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(1400000000000000004,1400000000000000002,'待审核','pending',1,'warning',NULL,0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(1400000000000000005,1400000000000000002,'已通过','approved',2,'success',NULL,0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(1400000000000000006,1400000000000000002,'已拒绝','rejected',3,'error',NULL,0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(1400000000000000007,1400000000000000003,'系统通知','system',1,'blue',NULL,0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(1400000000000000008,1400000000000000003,'评论通知','comment',2,'green',NULL,0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(1400000000000000009,1400000000000000003,'提及通知','mention',3,'orange',NULL,0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(1400000000000000010,1400000000000000003,'审核通知','review',4,'purple',NULL,0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(1400000000000000011,1400000000000000003,'点赞通知','like',5,'red',NULL,0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0);
/*!40000 ALTER TABLE `kb_dict_data` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kb_operation_log`
--

DROP TABLE IF EXISTS `kb_operation_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kb_operation_log` (
  `id` bigint NOT NULL COMMENT '日志ID',
  `module` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '模块名称',
  `operation_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '操作类型',
  `operation_desc` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '操作描述',
  `request_method` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '请求方法',
  `request_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '请求URL',
  `request_params` text COLLATE utf8mb4_unicode_ci COMMENT '请求参数',
  `response_result` text COLLATE utf8mb4_unicode_ci COMMENT '响应结果',
  `user_id` bigint DEFAULT NULL COMMENT '操作用户ID',
  `username` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '操作用户名',
  `ip_address` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'IP地址',
  `location` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '地理位置',
  `user_agent` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '用户代理',
  `execute_time` int DEFAULT NULL COMMENT '执行时长（毫秒）',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态：0-失败，1-成功',
  `error_msg` text COLLATE utf8mb4_unicode_ci COMMENT '错误信息',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` bigint DEFAULT NULL COMMENT '创建人',
  `update_by` bigint DEFAULT NULL COMMENT '更新人',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '删除标识',
  PRIMARY KEY (`id`),
  KEY `idx_module` (`module`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_create_time` (`created_at`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kb_operation_log`
--

LOCK TABLES `kb_operation_log` WRITE;
/*!40000 ALTER TABLE `kb_operation_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `kb_operation_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kb_system_config`
--

DROP TABLE IF EXISTS `kb_system_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kb_system_config` (
  `id` bigint NOT NULL COMMENT '配置ID',
  `config_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '配置键',
  `config_value` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '配置值',
  `config_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'string' COMMENT '配置类型：string-字符串，number-数字，boolean-布尔，json-JSON',
  `category` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '配置分类',
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '配置描述',
  `is_public` tinyint NOT NULL DEFAULT '0' COMMENT '是否公开：0-否，1-是',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` bigint DEFAULT NULL COMMENT '创建人',
  `update_by` bigint DEFAULT NULL COMMENT '更新人',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '删除标识',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_config_key` (`config_key`),
  KEY `idx_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kb_system_config`
--

LOCK TABLES `kb_system_config` WRITE;
/*!40000 ALTER TABLE `kb_system_config` DISABLE KEYS */;
INSERT INTO `kb_system_config` VALUES (1300000000000000001,'site.name','企业知识库','string','basic','站点名称',1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(1300000000000000002,'site.logo','/logo.png','string','basic','站点Logo',1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(1300000000000000003,'site.allowRegister','true','boolean','basic','允许用户注册',1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(1300000000000000004,'upload.maxSize','104857600','number','upload','最大上传文件大小（字节）',0,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(1300000000000000005,'upload.allowTypes','.doc,.docx,.pdf,.txt,.md,.png,.jpg,.jpeg','string','upload','允许的文件类型',0,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(1300000000000000006,'security.sessionTimeout','7200','number','security','会话超时时间（秒）',0,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(1300000000000000007,'security.passwordMinLength','8','number','security','密码最小长度',0,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(1300000000000000008,'email.enabled','false','boolean','email','启用邮件通知',0,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(1300000000000000009,'email.host','smtp.example.com','string','email','SMTP服务器',0,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(1300000000000000010,'email.port','587','number','email','SMTP端口',0,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(1300000000000000011,'ai.model','qwen-turbo','string','ai','AI模型名称',0,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(1300000000000000012,'ai.maxTokens','2000','number','ai','AI最大Token数',0,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0);
/*!40000 ALTER TABLE `kb_system_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'kb_common'
--

--
-- Dumping routines for database 'kb_common'
--

--
-- Current Database: `kb_foundation`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `kb_foundation` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `kb_foundation`;

--
-- Table structure for table `kb_dict`
--

DROP TABLE IF EXISTS `kb_dict`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kb_dict` (
  `id` bigint NOT NULL COMMENT '字典ID',
  `dict_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '字典编码',
  `dict_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '字典名称',
  `dict_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '字典类型',
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '描述',
  `sort` int NOT NULL DEFAULT '0' COMMENT '排序',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态：0-禁用，1-启用',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` bigint DEFAULT NULL COMMENT '创建人',
  `update_by` bigint DEFAULT NULL COMMENT '更新人',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '删除标识',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dict_code` (`dict_code`),
  KEY `idx_dict_type` (`dict_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='字典表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kb_dict`
--

LOCK TABLES `kb_dict` WRITE;
/*!40000 ALTER TABLE `kb_dict` DISABLE KEYS */;
INSERT INTO `kb_dict` VALUES (3000000000000000001,'document_status','文档状态','DOCUMENT','文档状态：草稿/待审核/已发布/已驳回',1,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(3000000000000000002,'notification_type','通知类型','SYSTEM','系统通知类型',2,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(3000000000000000003,'operation_type','操作类型','SYSTEM','系统操作类型',3,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(3000000000000000004,'file_type','文件类型','FILE','支持的文件类型',4,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(3000000000000000005,'user_type','用户类型','USER','用户类型分类',5,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0);
/*!40000 ALTER TABLE `kb_dict` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kb_dict_data`
--

DROP TABLE IF EXISTS `kb_dict_data`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kb_dict_data` (
  `id` bigint NOT NULL COMMENT '字典数据ID',
  `dict_id` bigint NOT NULL COMMENT '字典ID',
  `dict_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '字典编码（冗余）',
  `dict_label` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '字典标签',
  `dict_value` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '字典值',
  `dict_sort` int NOT NULL DEFAULT '0' COMMENT '排序',
  `css_class` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '样式类名',
  `is_default` tinyint NOT NULL DEFAULT '0' COMMENT '是否默认',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` bigint DEFAULT NULL COMMENT '创建人',
  `update_by` bigint DEFAULT NULL COMMENT '更新人',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '删除标识',
  PRIMARY KEY (`id`),
  KEY `idx_dict_id` (`dict_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='字典数据表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kb_dict_data`
--

LOCK TABLES `kb_dict_data` WRITE;
/*!40000 ALTER TABLE `kb_dict_data` DISABLE KEYS */;
INSERT INTO `kb_dict_data` VALUES (3100000000000000001,3000000000000000001,'document_status','草稿','0',1,'badge-gray',1,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(3100000000000000002,3000000000000000001,'document_status','待审核','1',2,'badge-yellow',0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(3100000000000000003,3000000000000000001,'document_status','已发布','2',3,'badge-green',0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(3100000000000000004,3000000000000000001,'document_status','已驳回','3',4,'badge-red',0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(3200000000000000001,3000000000000000002,'notification_type','系统通知','system',1,'badge-blue',1,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(3200000000000000002,3000000000000000002,'notification_type','评论通知','comment',2,'badge-green',0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(3200000000000000003,3000000000000000002,'notification_type','@提醒','mention',3,'badge-orange',0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(3200000000000000004,3000000000000000002,'notification_type','审核通知','review',4,'badge-purple',0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(3200000000000000005,3000000000000000002,'notification_type','点赞通知','like',5,'badge-pink',0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(3300000000000000001,3000000000000000003,'operation_type','登录','LOGIN',1,NULL,0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(3300000000000000002,3000000000000000003,'operation_type','登出','LOGOUT',2,NULL,0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(3300000000000000003,3000000000000000003,'operation_type','创建','CREATE',3,NULL,0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(3300000000000000004,3000000000000000003,'operation_type','更新','UPDATE',4,NULL,0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(3300000000000000005,3000000000000000003,'operation_type','删除','DELETE',5,NULL,0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(3300000000000000006,3000000000000000003,'operation_type','查询','QUERY',6,NULL,0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(3300000000000000007,3000000000000000003,'operation_type','导出','EXPORT',7,NULL,0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(3300000000000000008,3000000000000000003,'operation_type','导入','IMPORT',8,NULL,0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(3400000000000000001,3000000000000000004,'file_type','PDF文档','pdf',1,'file-pdf',1,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(3400000000000000002,3000000000000000004,'file_type','Word文档','doc',2,'file-word',0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(3400000000000000003,3000000000000000004,'file_type','Excel表格','xls',3,'file-excel',0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(3400000000000000004,3000000000000000004,'file_type','PPT演示','ppt',4,'file-ppt',0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(3400000000000000005,3000000000000000004,'file_type','图片','image',5,'file-image',0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(3400000000000000006,3000000000000000004,'file_type','视频','video',6,'file-video',0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(3400000000000000007,3000000000000000004,'file_type','文本','txt',7,'file-text',0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(3400000000000000008,3000000000000000004,'file_type','Markdown','md',8,'file-markdown',0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(3500000000000000001,3000000000000000005,'user_type','超级管理员','SUPER_ADMIN',1,'user-admin',0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(3500000000000000002,3000000000000000005,'user_type','知识管理员','KNOWLEDGE_ADMIN',2,'user-manager',0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(3500000000000000003,3000000000000000005,'user_type','内容管理员','CONTENT_ADMIN',3,'user-editor',0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(3500000000000000004,3000000000000000005,'user_type','团队负责人','TEAM_LEADER',4,'user-leader',0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(3500000000000000005,3000000000000000005,'user_type','贡献者','CONTRIBUTOR',5,'user-contributor',0,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(3500000000000000006,3000000000000000005,'user_type','普通用户','VIEWER',6,'user-viewer',1,1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0);
/*!40000 ALTER TABLE `kb_dict_data` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kb_notification`
--

DROP TABLE IF EXISTS `kb_notification`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kb_notification` (
  `id` bigint NOT NULL COMMENT '通知ID',
  `user_id` bigint NOT NULL COMMENT '接收用户ID',
  `user_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '接收用户姓名',
  `notification_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '通知类型',
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '通知标题',
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '通知内容',
  `link` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '跳转链接',
  `related_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '关联类型',
  `related_id` bigint DEFAULT NULL COMMENT '关联ID',
  `is_read` tinyint NOT NULL DEFAULT '0' COMMENT '是否已读',
  `read_time` datetime DEFAULT NULL COMMENT '阅读时间',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` bigint DEFAULT NULL COMMENT '创建人ID',
  `update_by` bigint DEFAULT NULL COMMENT '更新人ID',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '逻辑删除标记',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_is_read` (`is_read`),
  KEY `idx_notification_type` (`notification_type`),
  KEY `idx_create_time` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统通知表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kb_notification`
--

LOCK TABLES `kb_notification` WRITE;
/*!40000 ALTER TABLE `kb_notification` DISABLE KEYS */;
INSERT INTO `kb_notification` VALUES (1500000000000000001,1000000000000000002,'editor','system','欢迎加入企业知识库','欢迎加入企业知识库系统，开始您的知识管理之旅！','/documents',0,NULL,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(1500000000000000002,1000000000000000004,'developer','comment','您的文档收到新评论','《Spring Boot 3.x 快速入门指南》收到新评论','/documents/1000000000000000001',0,NULL,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(1500000000000000003,1000000000000000005,'product','review','文档审核通过','您的《企业知识库产品需求文档PRD》已通过审核','/documents/1000000000000000005',1,NULL,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(1500000000000000004,1000000000000000001,'admin','mention','有人@了您','developer在《Docker + Kubernetes 容器化部署》中提到了您','/documents/1000000000000000004',0,NULL,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0);
/*!40000 ALTER TABLE `kb_notification` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kb_notification_template`
--

DROP TABLE IF EXISTS `kb_notification_template`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kb_notification_template` (
  `id` bigint NOT NULL COMMENT '主键ID',
  `template_code` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '模板编码',
  `template_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '模板名称',
  `notification_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '通知类型：EMAIL/SMS/WECHAT/SYSTEM/BROWSER',
  `title` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '模板标题',
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '模板内容',
  `variables` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT '[]' COMMENT '模板变量（JSON数组格式）',
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '模板描述',
  `is_active` tinyint(1) DEFAULT '1' COMMENT '是否启用：0-停用，1-启用',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` bigint DEFAULT NULL COMMENT '创建人',
  `update_by` bigint DEFAULT NULL COMMENT '更新人',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '删除标识',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_template_code` (`template_code`),
  KEY `idx_notification_type` (`notification_type`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知模板表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kb_notification_template`
--

LOCK TABLES `kb_notification_template` WRITE;
/*!40000 ALTER TABLE `kb_notification_template` DISABLE KEYS */;
INSERT INTO `kb_notification_template` VALUES (1,'EMAIL_VERIFY_CODE','邮箱验证码','EMAIL','验证码 - {{systemName}}','尊敬的{{userName}}，您的验证码是：{{verifyCode}}，5分钟内有效。','[\"userName\",\"verifyCode\",\"systemName\"]','用于邮箱验证和找回密码场景',1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(2,'DOCUMENT_APPROVED','文档审核通过','SYSTEM','您的文档《{{documentTitle}}》已通过审核','您提交的文档《{{documentTitle}}》已通过审核，感谢您的贡献！','[\"documentTitle\"]','文档审核通过时发送的通知',1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(3,'DOCUMENT_REJECTED','文档审核驳回','SYSTEM','您的文档《{{documentTitle}}》需要修改','您提交的文档《{{documentTitle}}》未通过审核，原因：{{rejectReason}}。请修改后重新提交。','[\"documentTitle\",\"rejectReason\"]','文档审核驳回时发送的通知',1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(4,'NEW_COMMENT','新评论通知','SYSTEM','您的文档收到新评论','{{commentUsername}} 评论了您的文档《{{documentTitle}}》：{{commentContent}}','[\"commentUsername\",\"documentTitle\",\"commentContent\"]','文档收到新评论时的通知',1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(5,'DOCUMENT_LIKED','文档被点赞','SYSTEM','您的文档收到新的点赞','{{likeUsername}} 点赞了您的文档《{{documentTitle}}》','[\"likeUsername\",\"documentTitle\"]','文档被点赞时的通知',1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(6,'WELCOME_MESSAGE','欢迎消息','SYSTEM','欢迎加入{{systemName}}','尊敬的{{userName}}，欢迎加入{{systemName}}！我们期待您的贡献。','[\"userName\",\"systemName\"]','用户注册后的欢迎消息',1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0);
/*!40000 ALTER TABLE `kb_notification_template` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kb_operation_log`
--

DROP TABLE IF EXISTS `kb_operation_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kb_operation_log` (
  `id` bigint NOT NULL COMMENT '日志ID',
  `module` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '操作模块',
  `operation_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '操作类型',
  `operation_desc` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '操作描述',
  `request_method` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '请求方法',
  `request_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '请求URL',
  `request_params` text COLLATE utf8mb4_unicode_ci COMMENT '请求参数',
  `response_result` text COLLATE utf8mb4_unicode_ci COMMENT '响应结果',
  `user_id` bigint DEFAULT NULL COMMENT '操作用户ID',
  `username` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '操作用户名',
  `ip_address` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'IP地址',
  `location` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '地理位置',
  `user_agent` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '用户代理',
  `execute_time` int DEFAULT NULL COMMENT '执行时长（毫秒）',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态',
  `error_msg` text COLLATE utf8mb4_unicode_ci COMMENT '错误信息',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` bigint DEFAULT NULL COMMENT '创建人',
  `update_by` bigint DEFAULT NULL COMMENT '更新人',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '删除标识',
  PRIMARY KEY (`id`),
  KEY `idx_module` (`module`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_create_time` (`created_at`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作日志表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kb_operation_log`
--

LOCK TABLES `kb_operation_log` WRITE;
/*!40000 ALTER TABLE `kb_operation_log` DISABLE KEYS */;
INSERT INTO `kb_operation_log` VALUES (4000000000000000001,'用户管理','LOGIN','用户登录','POST','/api/auth/login',NULL,NULL,1000000000000000001,'admin','127.0.0.1',NULL,NULL,125,1,NULL,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(4000000000000000002,'文档管理','CREATE','创建文档','POST','/api/document',NULL,NULL,1000000000000000002,'editor','127.0.0.1',NULL,NULL,342,1,NULL,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(4000000000000000003,'文档管理','UPDATE','更新文档','PUT','/api/document/1000000000000000001',NULL,NULL,1000000000000000002,'editor','127.0.0.1',NULL,NULL,215,1,NULL,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(4000000000000000004,'系统配置','UPDATE','更新系统配置','PUT','/api/foundation/config',NULL,NULL,1000000000000000001,'admin','127.0.0.1',NULL,NULL,89,1,NULL,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(4000000000000000005,'用户管理','CREATE','创建用户','POST','/api/auth/user',NULL,NULL,1000000000000000001,'admin','127.0.0.1',NULL,NULL,156,1,NULL,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0);
/*!40000 ALTER TABLE `kb_operation_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kb_system_config`
--

DROP TABLE IF EXISTS `kb_system_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kb_system_config` (
  `id` bigint NOT NULL COMMENT '配置ID',
  `config_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '配置键',
  `config_value` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '配置值',
  `config_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'string' COMMENT '配置类型',
  `category` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '配置分类',
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '配置描述',
  `is_public` tinyint NOT NULL DEFAULT '0' COMMENT '是否公开',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_by` bigint DEFAULT NULL COMMENT '创建人',
  `update_by` bigint DEFAULT NULL COMMENT '更新人',
  `deleted` tinyint NOT NULL DEFAULT '0' COMMENT '删除标识',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_config_key` (`config_key`),
  KEY `idx_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kb_system_config`
--

LOCK TABLES `kb_system_config` WRITE;
/*!40000 ALTER TABLE `kb_system_config` DISABLE KEYS */;
INSERT INTO `kb_system_config` VALUES (2000000000000000001,'qwen.api.key','','string','AI','千问API密钥',0,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(2000000000000000002,'qwen.model.name','qwen-max','string','AI','千问模型名称',1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(2000000000000000003,'qwen.embedding.model','text-embedding-v3','string','AI','千问嵌入模型',1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(2000000000000000004,'milvus.host','localhost','string','AI','Milvus主机地址',1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(2000000000000000005,'milvus.port','19530','number','AI','Milvus端口',1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(2000000000000000006,'rustfs.endpoints','http://localhost:8200','json','STORAGE','RustFS端点列表',1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(2000000000000000007,'rustfs.bucket','knowledge-docs','string','STORAGE','RustFS存储桶',1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(2000000000000000008,'file.upload.max.size','52428800','number','STORAGE','文件上传最大大小（字节）',1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(2000000000000000009,'file.upload.allowed.types','pdf,doc,docx,xls,xlsx,ppt,pptx,txt,md,jpg,jpeg,png,gif,bmp,webp,svg,ico,mp4,avi,mov,wmv,flv,mkv,webm,mp3,wav,flac,aac,ogg,m4a,wma','string','STORAGE','允许上传的文件类型',1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(2000000000000000010,'email.enabled','true','boolean','NOTIFICATION','是否启用邮件通知',1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(2000000000000000011,'email.host','smtp.example.com','string','NOTIFICATION','邮件服务器地址',0,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(2000000000000000012,'email.port','587','number','NOTIFICATION','邮件服务器端口',0,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(2000000000000000013,'notification.retention.days','90','number','NOTIFICATION','通知保留天数',1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(2000000000000000014,'websocket.enabled','true','boolean','NOTIFICATION','是否启用WebSocket推送',1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(2000000000000000015,'auth.session.timeout','7200','number','SECURITY','会话超时时间（秒）',1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(2000000000000000016,'auth.password.min.length','8','number','SECURITY','密码最小长度',1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(2000000000000000017,'auth.password.require.special','true','boolean','SECURITY','密码是否要求特殊字符',1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(2000000000000000018,'auth.login.max.retry','5','number','SECURITY','登录最大重试次数',1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(2000000000000000019,'system.name','企业知识库','string','SYSTEM','系统名称',1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(2000000000000000020,'system.version','1.0.0','string','SYSTEM','系统版本',1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(2000000000000000021,'system.logo','/logo.png','string','SYSTEM','系统Logo路径',1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(2000000000000000022,'user.registration.enabled','true','boolean','SYSTEM','是否允许用户注册',1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0),(2000000000000000023,'user.default.role','VIEWER','string','SYSTEM','新用户默认角色',1,'2026-06-19 10:24:37','2026-06-19 10:24:37',NULL,NULL,0);
/*!40000 ALTER TABLE `kb_system_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'kb_foundation'
--

--
-- Dumping routines for database 'kb_foundation'
--

--
-- Current Database: `kb_user`
--

USE `kb_user`;

--
-- Final view structure for view `kb_document`
--

/*!50001 DROP VIEW IF EXISTS `kb_document`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `kb_document` AS select `kb_document`.`kb_document`.`id` AS `id`,`kb_document`.`kb_document`.`title` AS `title`,`kb_document`.`kb_document`.`author_id` AS `author_id`,`kb_document`.`kb_document`.`author_name` AS `author_name`,`kb_document`.`kb_document`.`category_id` AS `category_id`,`kb_document`.`kb_document`.`status` AS `status`,`kb_document`.`kb_document`.`view_count` AS `view_count`,`kb_document`.`kb_document`.`like_count` AS `like_count`,`kb_document`.`kb_document`.`favorite_count` AS `favorite_count`,`kb_document`.`kb_document`.`comment_count` AS `comment_count`,`kb_document`.`kb_document`.`is_public` AS `is_public`,`kb_document`.`kb_document`.`is_top` AS `is_top`,`kb_document`.`kb_document`.`is_recommend` AS `is_recommend`,`kb_document`.`kb_document`.`document_type` AS `document_type`,`kb_document`.`kb_document`.`source` AS `source`,`kb_document`.`kb_document`.`cover_image` AS `cover_image`,`kb_document`.`kb_document`.`summary` AS `summary`,`kb_document`.`kb_document`.`sort` AS `sort`,`kb_document`.`kb_document`.`allow_comment` AS `allow_comment`,`kb_document`.`kb_document`.`publish_time` AS `publish_time`,`kb_document`.`kb_document`.`created_at` AS `created_at`,`kb_document`.`kb_document`.`updated_at` AS `updated_at`,`kb_document`.`kb_document`.`create_by` AS `create_by`,`kb_document`.`kb_document`.`update_by` AS `update_by`,`kb_document`.`kb_document`.`deleted` AS `deleted` from `kb_document`.`kb_document` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Current Database: `kb_document`
--

USE `kb_document`;

--
-- Current Database: `kb_search`
--

USE `kb_search`;

--
-- Current Database: `kb_file`
--

USE `kb_file`;

--
-- Current Database: `kb_ai`
--

USE `kb_ai`;

--
-- Current Database: `kb_statistics`
--

USE `kb_statistics`;

--
-- Final view structure for view `kb_ai_conversation`
--

/*!50001 DROP VIEW IF EXISTS `kb_ai_conversation`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `kb_ai_conversation` AS select `kb_ai`.`conversation`.`id` AS `id`,`kb_ai`.`conversation`.`user_id` AS `user_id`,`kb_ai`.`conversation`.`user_name` AS `user_name`,`kb_ai`.`conversation`.`title` AS `title`,`kb_ai`.`conversation`.`model_name` AS `model_name`,`kb_ai`.`conversation`.`message_count` AS `message_count`,`kb_ai`.`conversation`.`created_at` AS `created_at`,`kb_ai`.`conversation`.`updated_at` AS `updated_at`,`kb_ai`.`conversation`.`deleted` AS `deleted` from `kb_ai`.`conversation` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `kb_ai_message`
--

/*!50001 DROP VIEW IF EXISTS `kb_ai_message`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `kb_ai_message` AS select `kb_ai`.`message`.`id` AS `id`,`kb_ai`.`message`.`conversation_id` AS `conversation_id`,`kb_ai`.`message`.`role` AS `role`,`kb_ai`.`message`.`content` AS `content`,`kb_ai`.`message`.`tokens` AS `tokens`,`kb_ai`.`message`.`created_at` AS `created_at`,`kb_ai`.`message`.`deleted` AS `deleted` from `kb_ai`.`message` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `kb_category`
--

/*!50001 DROP VIEW IF EXISTS `kb_category`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `kb_category` AS select `kb_document`.`kb_category`.`id` AS `id`,`kb_document`.`kb_category`.`category_name` AS `category_name`,`kb_document`.`kb_category`.`parent_id` AS `parent_id`,`kb_document`.`kb_category`.`category_icon` AS `category_icon`,`kb_document`.`kb_category`.`description` AS `description`,`kb_document`.`kb_category`.`sort` AS `sort`,`kb_document`.`kb_category`.`document_count` AS `document_count`,`kb_document`.`kb_category`.`status` AS `status`,`kb_document`.`kb_category`.`created_at` AS `created_at`,`kb_document`.`kb_category`.`updated_at` AS `updated_at`,`kb_document`.`kb_category`.`create_by` AS `create_by`,`kb_document`.`kb_category`.`update_by` AS `update_by`,`kb_document`.`kb_category`.`deleted` AS `deleted` from `kb_document`.`kb_category` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `kb_comment`
--

/*!50001 DROP VIEW IF EXISTS `kb_comment`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `kb_comment` AS select `kb_document`.`tb_comment`.`id` AS `id`,`kb_document`.`tb_comment`.`document_id` AS `document_id`,`kb_document`.`tb_comment`.`content` AS `content`,`kb_document`.`tb_comment`.`user_id` AS `user_id`,`kb_document`.`tb_comment`.`user_name` AS `user_name`,`kb_document`.`tb_comment`.`user_avatar` AS `user_avatar`,`kb_document`.`tb_comment`.`parent_id` AS `parent_id`,`kb_document`.`tb_comment`.`reply_to_id` AS `reply_to_id`,`kb_document`.`tb_comment`.`reply_to_name` AS `reply_to_name`,`kb_document`.`tb_comment`.`like_count` AS `like_count`,`kb_document`.`tb_comment`.`reply_count` AS `reply_count`,`kb_document`.`tb_comment`.`status` AS `status`,`kb_document`.`tb_comment`.`created_at` AS `created_at`,`kb_document`.`tb_comment`.`updated_at` AS `updated_at`,`kb_document`.`tb_comment`.`deleted` AS `deleted` from `kb_document`.`tb_comment` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `kb_document`
--

/*!50001 DROP VIEW IF EXISTS `kb_document`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `kb_document` AS select `kb_document`.`kb_document`.`id` AS `id`,`kb_document`.`kb_document`.`title` AS `title`,`kb_document`.`kb_document`.`author_id` AS `author_id`,`kb_document`.`kb_document`.`author_name` AS `author_name`,`kb_document`.`kb_document`.`category_id` AS `category_id`,`kb_document`.`kb_document`.`status` AS `status`,`kb_document`.`kb_document`.`view_count` AS `view_count`,`kb_document`.`kb_document`.`like_count` AS `like_count`,`kb_document`.`kb_document`.`favorite_count` AS `favorite_count`,`kb_document`.`kb_document`.`comment_count` AS `comment_count`,`kb_document`.`kb_document`.`is_public` AS `is_public`,`kb_document`.`kb_document`.`is_top` AS `is_top`,`kb_document`.`kb_document`.`is_recommend` AS `is_recommend`,`kb_document`.`kb_document`.`document_type` AS `document_type`,`kb_document`.`kb_document`.`source` AS `source`,`kb_document`.`kb_document`.`cover_image` AS `cover_image`,`kb_document`.`kb_document`.`summary` AS `summary`,`kb_document`.`kb_document`.`sort` AS `sort`,`kb_document`.`kb_document`.`allow_comment` AS `allow_comment`,`kb_document`.`kb_document`.`publish_time` AS `publish_time`,`kb_document`.`kb_document`.`created_at` AS `created_at`,`kb_document`.`kb_document`.`updated_at` AS `updated_at`,`kb_document`.`kb_document`.`create_by` AS `create_by`,`kb_document`.`kb_document`.`update_by` AS `update_by`,`kb_document`.`kb_document`.`deleted` AS `deleted` from `kb_document`.`kb_document` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `kb_operation_log`
--

/*!50001 DROP VIEW IF EXISTS `kb_operation_log`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `kb_operation_log` AS select `kb_foundation`.`kb_operation_log`.`id` AS `id`,`kb_foundation`.`kb_operation_log`.`module` AS `module`,`kb_foundation`.`kb_operation_log`.`operation_type` AS `operation_type`,`kb_foundation`.`kb_operation_log`.`operation_desc` AS `operation_desc`,`kb_foundation`.`kb_operation_log`.`request_method` AS `request_method`,`kb_foundation`.`kb_operation_log`.`request_url` AS `request_url`,`kb_foundation`.`kb_operation_log`.`request_params` AS `request_params`,`kb_foundation`.`kb_operation_log`.`response_result` AS `response_result`,`kb_foundation`.`kb_operation_log`.`user_id` AS `user_id`,`kb_foundation`.`kb_operation_log`.`username` AS `username`,`kb_foundation`.`kb_operation_log`.`ip_address` AS `ip_address`,`kb_foundation`.`kb_operation_log`.`location` AS `location`,`kb_foundation`.`kb_operation_log`.`user_agent` AS `user_agent`,`kb_foundation`.`kb_operation_log`.`execute_time` AS `execute_time`,`kb_foundation`.`kb_operation_log`.`status` AS `status`,`kb_foundation`.`kb_operation_log`.`error_msg` AS `error_msg`,`kb_foundation`.`kb_operation_log`.`created_at` AS `created_at`,`kb_foundation`.`kb_operation_log`.`updated_at` AS `updated_at`,`kb_foundation`.`kb_operation_log`.`create_by` AS `create_by`,`kb_foundation`.`kb_operation_log`.`update_by` AS `update_by`,`kb_foundation`.`kb_operation_log`.`deleted` AS `deleted` from `kb_foundation`.`kb_operation_log` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `kb_user`
--

/*!50001 DROP VIEW IF EXISTS `kb_user`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `kb_user` AS select `kb_user`.`kb_user`.`id` AS `id`,`kb_user`.`kb_user`.`username` AS `username`,`kb_user`.`kb_user`.`real_name` AS `real_name`,`kb_user`.`kb_user`.`avatar` AS `avatar`,`kb_user`.`kb_user`.`status` AS `status`,`kb_user`.`kb_user`.`email` AS `email`,`kb_user`.`kb_user`.`phone` AS `phone`,`kb_user`.`kb_user`.`department` AS `department`,`kb_user`.`kb_user`.`position` AS `position`,`kb_user`.`kb_user`.`last_login_time` AS `last_login_time`,`kb_user`.`kb_user`.`created_at` AS `created_at`,`kb_user`.`kb_user`.`updated_at` AS `updated_at`,`kb_user`.`kb_user`.`deleted` AS `deleted` from `kb_user`.`kb_user` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Current Database: `kb_notification`
--

USE `kb_notification`;

--
-- Current Database: `kb_graph`
--

USE `kb_graph`;

--
-- Current Database: `kb_common`
--

USE `kb_common`;

--
-- Current Database: `kb_foundation`
--

USE `kb_foundation`;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-19 10:38:34
