#Requires -Version 5.1
<#
.SYNOPSIS
  验证 Phase 7 所需的文档与 Agent 角色权限矩阵。
#>

param(
    [string]$MysqlContainer = "kb-mysql"
)

$ErrorActionPreference = "Stop"
$deployDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$envFile = Join-Path $deployDir ".env"
$passwordLine = Get-Content -LiteralPath $envFile | Where-Object { $_ -match '^MYSQL_ROOT_PASSWORD=' } | Select-Object -First 1
if (-not $passwordLine) {
    Write-Host "[FAIL] MYSQL_ROOT_PASSWORD missing in deploy/.env" -ForegroundColor Red
    exit 1
}
$password = ($passwordLine -split '=', 2)[1]

function Get-RolePermissions {
    param([string]$RoleCode)

    $sql = @"
SELECT p.permission_code
FROM kb_user.kb_role_permission rp
JOIN kb_user.kb_role r ON r.id = rp.role_id AND r.deleted = 0
JOIN kb_user.kb_permission p ON p.id = rp.permission_id AND p.deleted = 0
WHERE r.role_code = '$RoleCode'
ORDER BY p.permission_code;
"@
    $rows = docker exec -e MYSQL_PWD=$password $MysqlContainer mysql -uroot -N -e $sql
    if ($LASTEXITCODE -ne 0) { throw "mysql query failed for $RoleCode" }
    return @($rows | ForEach-Object { ([string]$_).Trim() } | Where-Object { $_ })
}

function Test-ExactPermissionSubset {
    param(
        [string]$RoleCode,
        [string[]]$Required,
        [string[]]$Forbidden = @()
    )

    $actual = Get-RolePermissions -RoleCode $RoleCode
    $missing = @($Required | Where-Object { $actual -notcontains $_ })
    $unexpected = @($Forbidden | Where-Object { $actual -contains $_ })
    if ($missing.Count -eq 0 -and $unexpected.Count -eq 0) {
        Write-Host "[PASS] $RoleCode permission matrix" -ForegroundColor Green
        return $true
    }
    Write-Host "[FAIL] $RoleCode missing=[$($missing -join ',')] forbidden=[$($unexpected -join ',')]" -ForegroundColor Red
    return $false
}

$documentPermissions = @('document:list', 'document:create', 'document:edit', 'document:delete')
$agentRunPermissions = @('agent:workflow:view', 'agent:run')
$agentAdminPermissions = @('agent:workflow:view', 'agent:run', 'agent:workflow:edit', 'agent:workflow:publish')
$failCount = 0

if (-not (Test-ExactPermissionSubset -RoleCode 'ROLE_EDITOR' -Required $documentPermissions)) { $failCount++ }
if (-not (Test-ExactPermissionSubset -RoleCode 'ROLE_USER' -Required ($documentPermissions + $agentRunPermissions) `
        -Forbidden @('agent:workflow:edit', 'agent:workflow:publish'))) { $failCount++ }
if (-not (Test-ExactPermissionSubset -RoleCode 'ROLE_ADMIN' -Required $agentAdminPermissions)) { $failCount++ }

if ($failCount -gt 0) {
    Write-Host "Result: FAILED ($failCount role(s))" -ForegroundColor Red
    exit 1
}

Write-Host "Result: PHASE7 PERMISSIONS PASS" -ForegroundColor Green
exit 0
