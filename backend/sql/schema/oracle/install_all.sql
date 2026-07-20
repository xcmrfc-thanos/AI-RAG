-- =====================================================
-- Oracle 一键装载（翻译稿，需人工/冒烟验证）
-- 前置：以 SYSTEM（或 DBA）连接 PDB，先执行 00_create_users.sql
-- =====================================================

WHENEVER SQLERROR EXIT SQL.SQLCODE

PROMPT === kb_user ===
@@kb_user.sql

PROMPT === kb_document + favorite ===
@@kb_document.sql
@@kb_favorite.sql

PROMPT === kb_file ===
@@kb_file.sql

PROMPT === kb_statistics ===
@@kb_statistics.sql

PROMPT === kb_foundation + notification_template ===
@@kb_foundation.sql
@@kb_notification_template.sql

PROMPT === kb_intelligence ===
@@kb_intelligence.sql

PROMPT === kb_agent ===
@@kb_agent.sql

PROMPT Oracle install_all finished
