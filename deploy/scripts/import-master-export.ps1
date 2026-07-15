#Requires -Version 5.1
param(
    [string]$ExportFile = "",
    [switch]$SkipSchema
)

$ErrorActionPreference = "Stop"
$DeployDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent (Split-Path -Parent $DeployDir)
$SqlDir = Join-Path $RootDir "backend\sql"
$MasterDir = Join-Path $SqlDir "master-sql"
$Password = if ($env:MYSQL_ROOT_PASSWORD) { $env:MYSQL_ROOT_PASSWORD } else { "123456" }
$MysqlContainer = if ($env:MYSQL_CONTAINER) { $env:MYSQL_CONTAINER } else { "kb-mysql" }

if (-not $ExportFile) {
    $ExportFile = Join-Path $MasterDir "knowledge_base_export_2026-06-23.sql"
}
if (-not (Test-Path $ExportFile)) {
    throw "Export file not found: $ExportFile"
}

. (Join-Path $PSScriptRoot "mysql-import-utils.ps1")

function Invoke-MysqlFileLocal {
    param([string]$Path)
    Invoke-MysqlFile -Path $Path -Container $MysqlContainer -Password $Password
}

function Invoke-MysqlSql {
    param([string]$Sql)
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $Sql | docker exec -i $MysqlContainer mysql -uroot "-p$Password" --default-character-set=utf8mb4 2>&1
    } finally {
        $ErrorActionPreference = $prev
    }
}

function Apply-ExplicitColumns {
    param([string]$SqlLine, [string]$TableName, [string]$Columns)
    if ($SqlLine -match "^REPLACE INTO ``$TableName`` VALUES") {
        return $SqlLine -replace "^REPLACE INTO ``$TableName`` VALUES", "REPLACE INTO ``$TableName`` ($Columns) VALUES"
    }
    return $SqlLine
}

function Trim-UserTenantId {
    param([string]$SqlLine)
    return $SqlLine -replace ',(0|1),NULL\)([;,]|$)', ',$1)$2'
}

$dbMap = @{
    'kb_ai' = 'kb_intelligence'
    'kb_search' = 'kb_intelligence'
    'kb_common' = 'kb_foundation'
    'kb_notification' = 'kb_foundation'
}

$tableMap = @{
    'tb_file' = 'kb_file'
    'tb_tag' = 'kb_tag'
    'tb_comment' = 'kb_comment'
    'tb_like' = 'kb_like'
}

$skipTables = @('kb_tag','kb_comment','kb_file','kb_category','kb_document','conversation','message','kb_ai_conversation','kb_ai_message','kb_notification_template','kb_operation_log')

$explicitColumns = @{
    'tb_tag' = '`id`,`tag_name`,`tag_color`,`description`,`use_count`,`created_at`,`updated_at`,`create_by`,`update_by`,`deleted`,`color`'
    'tb_file' = '`id`,`original_name`,`stored_name`,`file_path`,`file_size`,`file_type`,`mime_type`,`file_hash`,`storage_type`,`bucket_name`,`uploader_id`,`access_level`,`download_count`,`status`,`deleted`,`created_at`,`updated_at`,`create_by`,`update_by`,`duration`,`resolution`,`bitrate`,`transcode_status`,`hls_path`,`thumbnail_path`'
    'tb_comment' = '`id`,`document_id`,`content`,`user_id`,`user_name`,`user_avatar`,`parent_id`,`reply_to_id`,`reply_to_name`,`like_count`,`reply_count`,`status`,`created_at`,`updated_at`,`create_by`,`update_by`,`deleted`'
    'kb_permission' = '`id`,`parent_id`,`permission_name`,`permission_code`,`permission_type`,`menu_url`,`api_url`,`method`,`icon`,`sort`,`status`,`created_at`,`updated_at`,`deleted`,`create_by`,`update_by`'
    'kb_user' = '`id`,`username`,`password`,`email`,`email_verified`,`activation_token`,`activation_token_expiry`,`phone`,`avatar`,`real_name`,`department`,`position`,`remark`,`status`,`last_login_time`,`last_login_ip`,`created_at`,`updated_at`,`create_by`,`update_by`,`deleted`'
    'kb_team' = '`id`,`team_name`,`team_code`,`description`,`icon`,`leader_id`,`parent_id`,`sort`,`level`,`path`,`member_count`,`doc_count`,`status`,`created_at`,`updated_at`,`create_by`,`update_by`,`deleted`'
    'kb_dict_data' = '`id`,`dict_id`,`dict_code`,`dict_label`,`dict_value`,`dict_sort`,`css_class`,`is_default`,`status`,`created_at`,`updated_at`,`create_by`,`update_by`,`deleted`'
    'kb_search_history' = '`id`,`user_id`,`keyword`,`search_count`,`search_type`,`result_count`,`search_params`,`created_at`'
    'kb_user_favorite' = '`id`,`user_id`,`document_id`,`document_title`,`document_category_id`,`favorite_time`,`created_at`,`updated_at`,`deleted`,`create_by`,`update_by`'
    'tb_document_review' = '`id`,`document_id`,`reviewer_id`,`reviewer_name`,`review_result`,`review_round`,`review_comment`,`before_status`,`reviewed_at`,`review_level`,`created_at`'
}

Write-Host "=== master-sql absorb + real data import ===" -ForegroundColor Cyan

if (-not $SkipSchema) {
    foreach ($m in @('007_schema_absorb_master.sql', '008_schema_align_export_data.sql')) {
        $migration = Join-Path $SqlDir "migration\$m"
        if (Test-Path $migration) {
            Write-Host "[schema] $m ..." -ForegroundColor Yellow
            Invoke-MysqlFileLocal -Path $migration | Out-Null
        }
    }
}

Write-Host "[parse] export..." -ForegroundColor Yellow
$outDir = Join-Path $SqlDir "data\generated"
if (Test-Path $outDir) { Remove-Item $outDir -Recurse -Force }
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$dbWriters = @{}
$currentDb = $null

function Ensure-DbWriter {
    param([string]$Db)
    if (-not $dbWriters.ContainsKey($Db)) {
        $path = Join-Path $outDir "$Db.sql"
        $sw = New-Object System.IO.StreamWriter($path, $false, [System.Text.UTF8Encoding]::new($false))
        $sw.WriteLine('SET NAMES utf8mb4;')
        $sw.WriteLine("USE ``$Db``;")
        $sw.WriteLine('SET FOREIGN_KEY_CHECKS = 0;')
        $dbWriters[$Db] = $sw
    }
}

$lines = Get-Content $ExportFile -Encoding UTF8
foreach ($line in $lines) {
    if ($line -match '^USE `([^`]+)`') {
        $currentDb = $matches[1]
        if ($dbMap.ContainsKey($currentDb)) {
            $currentDb = $dbMap[$currentDb]
        }
        continue
    }
    if ($line -notmatch '^INSERT INTO `([^`]+)`') { continue }
    if (-not $currentDb) { continue }

    $table = $matches[1]
    if ($skipTables -contains $table) { continue }

    $targetTable = if ($tableMap.ContainsKey($table)) { $tableMap[$table] } else { $table }
    $sqlLine = $line -replace '^INSERT INTO', 'REPLACE INTO'
    $sqlLine = $sqlLine -replace "``$table``", "``$targetTable``"

    $colKey = if ($explicitColumns.ContainsKey($table)) { $table } elseif ($explicitColumns.ContainsKey($targetTable)) { $targetTable } else { $null }
    if ($colKey) {
        $sqlLine = Apply-ExplicitColumns -SqlLine $sqlLine -TableName $targetTable -Columns $explicitColumns[$colKey]
    }

    if ($targetTable -eq 'kb_user') {
        $sqlLine = Trim-UserTenantId -SqlLine $sqlLine
    }

    Ensure-DbWriter -Db $currentDb
    $dbWriters[$currentDb].WriteLine($sqlLine)
}

foreach ($sw in $dbWriters.Values) {
    $sw.WriteLine('SET FOREIGN_KEY_CHECKS = 1;')
    $sw.Close()
}

Write-Host "  generated $($dbWriters.Count) database files" -ForegroundColor DarkGray

Write-Host "[import] data..." -ForegroundColor Yellow

$seedFiles = @(
    'data\init_master_category.sql',
    'data\init_master_kb_document.sql',
    'data\init_notification_template.sql'
)
foreach ($rel in $seedFiles) {
    $path = Join-Path $SqlDir $rel
    if (Test-Path $path) {
        Write-Host "  $rel ..." -ForegroundColor DarkGray
        $out = Invoke-MysqlFileLocal -Path $path
        if ($out -match 'ERROR') { Write-Host "  WARN: $out" -ForegroundColor Yellow }
    }
}

if ($dbWriters.Count -gt 0) {
    Get-ChildItem $outDir -Filter "*.sql" | Sort-Object Name | ForEach-Object {
        Write-Host "  $($_.Name) ..." -ForegroundColor DarkGray
        $out = Invoke-MysqlFileLocal -Path $_.FullName
        if ($out -match 'ERROR') {
            Write-Host "  WARN: $($out -replace '`n',' ' | Select-Object -First 1)" -ForegroundColor Yellow
        }
    }
}

Write-Host "[verify] row counts..." -ForegroundColor Yellow
$verifySql = @"
SELECT 'kb_document' t, COUNT(*) c FROM kb_document.kb_document
UNION ALL SELECT 'kb_file', COUNT(*) FROM kb_file.kb_file
UNION ALL SELECT 'kb_category', COUNT(*) FROM kb_document.kb_category
UNION ALL SELECT 'tb_document_review', COUNT(*) FROM kb_document.tb_document_review
UNION ALL SELECT 'kb_document_access', COUNT(*) FROM kb_document.kb_document_access
UNION ALL SELECT 'kb_user', COUNT(*) FROM kb_user.kb_user
UNION ALL SELECT 'kb_permission', COUNT(*) FROM kb_user.kb_permission;
"@
Invoke-MysqlSql -Sql $verifySql

Write-Host "Done." -ForegroundColor Green
