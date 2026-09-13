#Requires -Version 5.1
<#
.SYNOPSIS
  Static checks for Admin UI wiring (routes, nav, page files).

.EXAMPLE
  .\verify-admin-ui.ps1
#>
param(
    [string]$FrontendRoot = ""
)

$ErrorActionPreference = "Stop"
$script:PassCount = 0
$script:FailCount = 0

if (-not $FrontendRoot) {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $deployDir = Split-Path -Parent $scriptDir
    $repoRoot = Split-Path -Parent $deployDir
    $FrontendRoot = Join-Path $repoRoot "frontend"
}

# Write one UI check line and bump counters
function Write-UiResult {
    param(
        [string]$Name,
        [ValidateSet("PASS", "FAIL")]
        [string]$Status,
        [string]$Detail = ""
    )
    switch ($Status) {
        "PASS" { $script:PassCount++ ; $color = "Green" }
        "FAIL" { $script:FailCount++ ; $color = "Red" }
    }
    $msg = if ($Detail) { "$Name - $Detail" } else { $Name }
    Write-Host "[$Status] $msg" -ForegroundColor $color
}

# Assert file exists under frontend root
function Test-FrontendFile {
    param([string]$RelativePath)
    return Test-Path (Join-Path $FrontendRoot $RelativePath)
}

# Assert file content contains pattern
function Test-FrontendContent {
    param(
        [string]$RelativePath,
        [string]$Pattern
    )
    $path = Join-Path $FrontendRoot $RelativePath
    if (-not (Test-Path $path)) { return $false }
    return (Select-String -Path $path -Pattern $Pattern -Quiet)
}

Write-Host ""
Write-Host "=== Admin UI static checks ===" -ForegroundColor Cyan
Write-Host ("Frontend: " + $FrontendRoot)
Write-Host ""

$coreFiles = @(
    "src/components/layout/AdminLayout.tsx",
    "src/constants/admin-nav.ts",
    "src/components/common/AdminPageHeader.tsx"
)
foreach ($f in $coreFiles) {
    if (Test-FrontendFile -RelativePath $f) {
        Write-UiResult -Name $f -Status "PASS"
    }
    else {
        Write-UiResult -Name $f -Status "FAIL" -Detail "missing"
    }
}

if (Test-FrontendContent -RelativePath "src/router/index.tsx" -Pattern "AdminLayout") {
    Write-UiResult -Name "router AdminLayout" -Status "PASS"
}
else {
    Write-UiResult -Name "router AdminLayout" -Status "FAIL"
}

if (Test-FrontendContent -RelativePath "src/components/layout/MainLayout.tsx" -Pattern "/admin") {
    Write-UiResult -Name "MainLayout hides sidebar on /admin" -Status "PASS"
}
else {
    Write-UiResult -Name "MainLayout hides sidebar on /admin" -Status "FAIL"
}

$adminPages = @(
    "src/pages/admin/PermissionsPage.tsx",
    "src/pages/admin/StatisticsPage.tsx",
    "src/pages/admin/SettingsPage.tsx",
    "src/pages/admin/TeamsPage.tsx",
    "src/pages/admin/CategoriesPage.tsx",
    "src/pages/admin/RolesPage.tsx",
    "src/pages/admin/ReviewPage.tsx"
)
$headerOk = 0
foreach ($p in $adminPages) {
    if (Test-FrontendContent -RelativePath $p -Pattern "AdminPageHeader") {
        $headerOk++
    }
}
if ($headerOk -eq $adminPages.Count) {
    Write-UiResult -Name "AdminPageHeader on 7 subpages" -Status "PASS"
}
else {
    Write-UiResult -Name "AdminPageHeader on 7 subpages" -Status "FAIL" -Detail ("$headerOk/" + $adminPages.Count)
}

$navPath = Join-Path $FrontendRoot "src/constants/admin-nav.ts"
$navCount = 0
if (Test-Path $navPath) {
    $navCount = (Select-String -Path $navPath -Pattern "path:" -AllMatches).Matches.Count
}
if ($navCount -ge 7) {
    Write-UiResult -Name "admin-nav routes" -Status "PASS" -Detail ("paths=$navCount")
}
else {
    Write-UiResult -Name "admin-nav routes" -Status "FAIL" -Detail ("paths=$navCount")
}

Write-Host ""
Write-Host "--- Summary ---" -ForegroundColor Cyan
Write-Host ("PASS: " + $PassCount + "  FAIL: " + $FailCount)
if ($FailCount -gt 0) {
    Write-Host "Result: FAILED" -ForegroundColor Red
    exit 1
}
Write-Host "Result: ALL PASS" -ForegroundColor Green
exit 0
