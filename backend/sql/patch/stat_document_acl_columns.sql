-- Statistics 文档投影补充 ACL 字段（热门/最新服务端过滤）
-- 存量行默认 is_public=1，避免升级后全部不可见；后续文档 upsert 会写成真实值

ALTER TABLE `stat_document`
  ADD COLUMN `is_public` TINYINT NOT NULL DEFAULT 1 COMMENT '是否公开 0/1' AFTER `summary`,
  ADD COLUMN `team_id` BIGINT DEFAULT NULL COMMENT '所属团队ID' AFTER `is_public`;
