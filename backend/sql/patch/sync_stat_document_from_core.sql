-- 将 kb_document 文档投影同步到 kb_statistics.stat_document
-- 用于修复「去假数据后首页空白」：分类计数来自 Core，首页/热门来自统计投影，投影滞后会显得没数据。
-- 用法：在 MySQL 执行本脚本（需可跨库访问 kb_document / kb_statistics）

INSERT INTO kb_statistics.stat_document (
  id, title, author_id, category_id, status, view_count, like_count, favorite_count,
  summary, is_public, team_id, created_at, updated_at, deleted
)
SELECT
  d.id, d.title, d.author_id, d.category_id, d.status,
  IFNULL(d.view_count, 0), IFNULL(d.like_count, 0), IFNULL(d.favorite_count, 0),
  LEFT(IFNULL(d.summary, ''), 500), IFNULL(d.is_public, 1), d.team_id,
  d.created_at, d.updated_at, IFNULL(d.deleted, 0)
FROM kb_document.kb_document d
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  author_id = VALUES(author_id),
  category_id = VALUES(category_id),
  status = VALUES(status),
  view_count = VALUES(view_count),
  like_count = VALUES(like_count),
  favorite_count = VALUES(favorite_count),
  summary = VALUES(summary),
  is_public = VALUES(is_public),
  team_id = VALUES(team_id),
  created_at = VALUES(created_at),
  updated_at = VALUES(updated_at),
  deleted = VALUES(deleted);
