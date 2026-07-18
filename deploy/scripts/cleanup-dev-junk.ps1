#Requires -Version 5.1
<#
.SYNOPSIS
  清理本地联调/冒烟产生的垃圾数据（保留 seed 样例与人工业务数据）

.DESCRIPTION
  删除范围：
  - Search ACL 探测文档（title LIKE acl-private-% / phase7-perm-%）及投影
  - Agent 冒烟工作流 smoke-agent-qa、session title=smoke、相关 run/step/version
  - E2E 对话（title 含 E2EAccept / title=test）及消息
  - 对应检索历史、孤儿通知（related 文档已不存在）

.PARAMETER MysqlPassword
  MySQL root 密码

.PARAMETER Container
  MySQL 容器名
#>
param(
    [string]$MysqlPassword = $(if ($env:MYSQL_ROOT_PASSWORD) { $env:MYSQL_ROOT_PASSWORD } else { "123456" }),
    [string]$Container = "kb-mysql"
)

$ErrorActionPreference = "Stop"

$sql = @'
SET NAMES utf8mb4;
USE kb_document;

-- 1) 收集垃圾文档 ID
DROP TEMPORARY TABLE IF EXISTS tmp_junk_doc_ids;
CREATE TEMPORARY TABLE tmp_junk_doc_ids (id BIGINT PRIMARY KEY);
INSERT INTO tmp_junk_doc_ids (id)
SELECT id FROM kb_document.kb_document
WHERE title LIKE 'acl-private-%'
   OR title LIKE 'phase7-perm-%';

SELECT COUNT(*) AS junk_docs FROM tmp_junk_doc_ids;

-- 2) 文档关联表
DELETE a FROM kb_document.kb_document_access a INNER JOIN tmp_junk_doc_ids j ON a.document_id = j.id;
DELETE t FROM kb_document.kb_document_tag t INNER JOIN tmp_junk_doc_ids j ON t.document_id = j.id;
DELETE c FROM kb_document.kb_comment c INNER JOIN tmp_junk_doc_ids j ON c.document_id = j.id;
DELETE l FROM kb_document.kb_like l INNER JOIN tmp_junk_doc_ids j ON l.target_id = j.id AND l.target_type = 1;
DELETE f FROM kb_document.kb_user_favorite f INNER JOIN tmp_junk_doc_ids j ON f.document_id = j.id;
DELETE v FROM kb_document.kb_document_version v INNER JOIN tmp_junk_doc_ids j ON v.document_id = j.id;
DELETE r FROM kb_document.kb_document_review r INNER JOIN tmp_junk_doc_ids j ON r.document_id = j.id;
DELETE r FROM kb_document.tb_document_review r INNER JOIN tmp_junk_doc_ids j ON r.document_id = j.id;
DELETE s FROM kb_document.kb_document_share s INNER JOIN tmp_junk_doc_ids j ON s.document_id = j.id;
DELETE d FROM kb_document.kb_document d INNER JOIN tmp_junk_doc_ids j ON d.id = j.id;

-- 3) 统计投影
DELETE s FROM kb_statistics.stat_document s INNER JOIN tmp_junk_doc_ids j ON s.id = j.id;
DELETE s FROM kb_statistics.kb_document_statistics s INNER JOIN tmp_junk_doc_ids j ON s.document_id = j.id;
DELETE v FROM kb_statistics.kb_view_history v INNER JOIN tmp_junk_doc_ids j ON v.document_id = j.id;

-- 4) 检索历史（ACL/冒烟关键字）
DELETE FROM kb_intelligence.kb_search_history
WHERE keyword LIKE 'acl-private-%'
   OR keyword LIKE 'phase7-perm-%'
   OR keyword LIKE 'Agent%smoke%'
   OR keyword LIKE '%draft smoke%';

-- 5) E2E 对话与消息
DROP TEMPORARY TABLE IF EXISTS tmp_junk_conv_ids;
CREATE TEMPORARY TABLE tmp_junk_conv_ids (id BIGINT PRIMARY KEY);
INSERT INTO tmp_junk_conv_ids (id)
SELECT id FROM kb_intelligence.conversation
WHERE title LIKE '%E2EAccept%'
   OR title = 'test';
DELETE m FROM kb_intelligence.message m INNER JOIN tmp_junk_conv_ids j ON m.conversation_id = j.id;
DELETE c FROM kb_intelligence.conversation c INNER JOIN tmp_junk_conv_ids j ON c.id = j.id;
DELETE s FROM kb_statistics.stat_ai_message s
WHERE s.conversation_id IN (SELECT id FROM tmp_junk_conv_ids);
DELETE s FROM kb_statistics.stat_ai_conversation s
WHERE s.id IN (SELECT id FROM tmp_junk_conv_ids);

-- 6) Agent 冒烟：smoke 工作流 / session / run
DROP TEMPORARY TABLE IF EXISTS tmp_junk_wf_ids;
CREATE TEMPORARY TABLE tmp_junk_wf_ids (id BIGINT PRIMARY KEY);
INSERT INTO tmp_junk_wf_ids (id)
SELECT id FROM kb_agent.agent_workflow WHERE name LIKE 'smoke%';

DROP TEMPORARY TABLE IF EXISTS tmp_junk_ver_ids;
CREATE TEMPORARY TABLE tmp_junk_ver_ids (id BIGINT PRIMARY KEY);
INSERT INTO tmp_junk_ver_ids (id)
SELECT v.id FROM kb_agent.agent_workflow_version v
INNER JOIN tmp_junk_wf_ids w ON v.workflow_id = w.id;

DROP TEMPORARY TABLE IF EXISTS tmp_junk_sess_ids;
CREATE TEMPORARY TABLE tmp_junk_sess_ids (id BIGINT PRIMARY KEY);
INSERT INTO tmp_junk_sess_ids (id)
SELECT id FROM kb_agent.agent_session WHERE title IN ('smoke', '1');

DELETE s FROM kb_agent.agent_run_step s
INNER JOIN kb_agent.agent_run r ON r.id = s.run_id
LEFT JOIN tmp_junk_ver_ids v ON r.workflow_version_id = v.id
LEFT JOIN tmp_junk_sess_ids sess ON r.session_id = sess.id
WHERE v.id IS NOT NULL OR sess.id IS NOT NULL;

DELETE r FROM kb_agent.agent_run r
LEFT JOIN tmp_junk_ver_ids v ON r.workflow_version_id = v.id
LEFT JOIN tmp_junk_sess_ids sess ON r.session_id = sess.id
WHERE v.id IS NOT NULL OR sess.id IS NOT NULL;

UPDATE kb_agent.agent_workflow w
INNER JOIN tmp_junk_wf_ids j ON w.id = j.id
SET w.published_version_id = NULL;

DELETE v FROM kb_agent.agent_workflow_version v INNER JOIN tmp_junk_ver_ids j ON v.id = j.id;
DELETE w FROM kb_agent.agent_workflow w INNER JOIN tmp_junk_wf_ids j ON w.id = j.id;
DELETE s FROM kb_agent.agent_session s INNER JOIN tmp_junk_sess_ids j ON s.id = j.id;

-- 6b) 残留 DRAFT 试跑（无 session / 无版本）
DELETE s FROM kb_agent.agent_run_step s
INNER JOIN kb_agent.agent_run r ON r.id = s.run_id
WHERE r.run_source = 'DRAFT';
DELETE FROM kb_agent.agent_run WHERE run_source = 'DRAFT';

-- 7) 孤儿通知（related 文档已不存在）
DELETE FROM kb_foundation.kb_notification
WHERE related_type = 'document'
  AND related_id IS NOT NULL
  AND related_id NOT IN (SELECT id FROM kb_document.kb_document);

SELECT '=== after cleanup ===' AS stage;
SELECT COUNT(*) AS docs FROM kb_document.kb_document;
SELECT COUNT(*) AS acl_left FROM kb_document.kb_document WHERE title LIKE 'acl-private-%' OR title LIKE 'phase7-perm-%';
SELECT COUNT(*) AS workflows FROM kb_agent.agent_workflow;
SELECT COUNT(*) AS smoke_wf_left FROM kb_agent.agent_workflow WHERE name LIKE 'smoke%';
SELECT COUNT(*) AS sessions FROM kb_agent.agent_session;
SELECT COUNT(*) AS runs FROM kb_agent.agent_run;
SELECT COUNT(*) AS steps FROM kb_agent.agent_run_step;
SELECT COUNT(*) AS conversations FROM kb_intelligence.conversation;
SELECT COUNT(*) AS search_hist FROM kb_intelligence.kb_search_history;
SELECT COUNT(*) AS notifications FROM kb_foundation.kb_notification;
SELECT COUNT(*) AS stat_docs FROM kb_statistics.stat_document;
'@

$tmp = Join-Path $env:TEMP ("cleanup-dev-junk-" + [guid]::NewGuid().ToString("N") + ".sql")
[System.IO.File]::WriteAllText($tmp, $sql, [System.Text.UTF8Encoding]::new($false))
try {
    Write-Host "=== cleanup-dev-junk ===" -ForegroundColor Cyan
    docker cp $tmp "${Container}:/tmp/cleanup-dev-junk.sql"
    docker exec $Container mysql -uroot "-p$MysqlPassword" --default-character-set=utf8mb4 -e "source /tmp/cleanup-dev-junk.sql"
    Write-Host "MySQL 垃圾数据清理完成" -ForegroundColor Green
}
finally {
    Remove-Item $tmp -Force -ErrorAction SilentlyContinue
}
