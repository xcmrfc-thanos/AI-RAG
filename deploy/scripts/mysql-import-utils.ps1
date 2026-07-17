#Requires -Version 5.1
# MySQL 文件导入工具：通过 docker cp 导入，避免 PowerShell 管道破坏 UTF-8 中文

<#
.SYNOPSIS
    将 SQL 文件复制进 MySQL 容器后执行 source，保证 UTF-8 中文不被转成问号。
#>
function Invoke-MysqlFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        [string]$Container = $(if ($env:MYSQL_CONTAINER) { $env:MYSQL_CONTAINER } else { "kb-mysql" }),
        [string]$Password = $(if ($env:MYSQL_ROOT_PASSWORD) { $env:MYSQL_ROOT_PASSWORD } else { "123456" })
    )

    if (-not (Test-Path $Path)) {
        throw "SQL file not found: $Path"
    }

    $resolved = (Resolve-Path $Path).Path
    $containerPath = "/tmp/mysql-import-$([guid]::NewGuid().ToString('N')).sql"
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        docker cp $resolved "${Container}:${containerPath}" 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            throw "docker cp failed: $Path"
        }
        $output = docker exec $Container mysql -uroot "-p$Password" --default-character-set=utf8mb4 -e "source $containerPath" 2>&1
        $text = ($output | Out-String)
        if ($LASTEXITCODE -ne 0 -and $text -notmatch 'ERROR 1062') {
            throw "mysql import failed: $Path`n$text"
        }
        if ($text -match 'ERROR 1062') {
            Write-Host "  (skip duplicate rows)" -ForegroundColor DarkYellow
        }
    } finally {
        docker exec $Container rm -f $containerPath 2>&1 | Out-Null
        $ErrorActionPreference = $prev
    }
}
