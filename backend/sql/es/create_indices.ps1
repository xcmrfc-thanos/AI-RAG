# Intelligence BC — 创建 ES 索引（Windows）
param(
    [string]$EsHost = "http://127.0.0.1:20920",
    [string]$EsUser = "elastic",
    [string]$EsPass = "",
    [string]$DocumentIndex = "kb_document",
    [string]$ChunkIndex = "kb_chunk"
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$headers = @{ "Content-Type" = "application/json" }

function Put-Index {
    param([string]$Name, [string]$JsonFile)
    $uri = "$EsHost/$Name"
    $body = Get-Content -Raw -Path $JsonFile -Encoding UTF8
    Write-Host ">>> PUT $Name"
    if ($EsPass) {
        $pair = "${EsUser}:${EsPass}"
        $bytes = [System.Text.Encoding]::ASCII.GetBytes($pair)
        $base64 = [Convert]::ToBase64String($bytes)
        $headers["Authorization"] = "Basic $base64"
    }
    Invoke-RestMethod -Method Put -Uri $uri -Headers $headers -Body $body
}

Put-Index -Name $DocumentIndex -JsonFile (Join-Path $ScriptDir "kb_document_index.json")
Put-Index -Name $ChunkIndex -JsonFile (Join-Path $ScriptDir "kb_chunk_index.json")
Write-Host "Done. Indices: $DocumentIndex, $ChunkIndex"
