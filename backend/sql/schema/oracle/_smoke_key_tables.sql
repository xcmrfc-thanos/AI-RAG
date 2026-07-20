-- Smoke assertions (run as SYSTEM after install_all)
SELECT COUNT(*) AS c FROM all_tables WHERE owner = 'KB_USER' AND table_name = 'KB_USER';
SELECT COUNT(*) AS c FROM all_tables WHERE owner = 'KB_DOCUMENT' AND table_name = 'KB_DOCUMENT';
SELECT COUNT(*) AS c FROM all_tables WHERE owner = 'KB_FILE' AND table_name = 'KB_FILE';
SELECT COUNT(*) AS c FROM all_tables WHERE owner = 'KB_STATISTICS' AND table_name = 'STAT_DOCUMENT';
SELECT COUNT(*) AS c FROM all_tables WHERE owner = 'KB_INTELLIGENCE' AND table_name = 'KB_SEARCH_HISTORY';
SELECT COUNT(*) AS c FROM all_tables WHERE owner = 'KB_AGENT' AND table_name = 'AGENT_SESSION';
EXIT;
