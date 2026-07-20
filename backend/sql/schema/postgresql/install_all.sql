-- =====================================================
-- PostgreSQL 一键装载（翻译稿，需人工验证）
-- 用法：
--   psql -U postgres -f 00_create_schemas.sql
--   psql -U postgres -f install_all.sql
-- 权威 DDL 仍为 ../mysql/
-- =====================================================

\echo '=== kb_user ==='
\i kb_user.sql

\echo '=== kb_document + favorite ==='
\i kb_document.sql
\i kb_favorite.sql

\echo '=== kb_file ==='
\i kb_file.sql

\echo '=== kb_statistics ==='
\i kb_statistics.sql

\echo '=== kb_foundation + notification_template ==='
\i kb_foundation.sql
\i kb_notification_template.sql

\echo '=== kb_intelligence (pilot) ==='
\i kb_intelligence.sql

\echo '=== kb_agent ==='
\i kb_agent.sql

\echo 'PostgreSQL install_all finished'
