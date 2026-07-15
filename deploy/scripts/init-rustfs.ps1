#Requires -Version 5.1
# 创建 RustFS bucket（S3 兼容，使用 mc 客户端）
$ErrorActionPreference = "Stop"
$Bucket = if ($env:RUSTFS_BUCKET) { $env:RUSTFS_BUCKET } else { "kb-files" }
$AccessKey = if ($env:RUSTFS_ACCESS_KEY) { $env:RUSTFS_ACCESS_KEY } else { "rustfsadmin" }
$SecretKey = if ($env:RUSTFS_SECRET_KEY) { $env:RUSTFS_SECRET_KEY } else { "rustfsadmin" }
$Network = if ($env:COMPOSE_PROJECT_NAME) { "$($env:COMPOSE_PROJECT_NAME)_default" } else { "ai-rag_default" }

docker run --rm --network $Network --entrypoint /bin/sh minio/mc:latest -c "
  mc alias set rustfs http://kb-rustfs:9000 $AccessKey $SecretKey &&
  mc mb -p rustfs/$Bucket 2>/dev/null || true &&
  echo bucket $Bucket ready
"
Write-Host "RustFS bucket '$Bucket' 就绪 (S3 :20090)" -ForegroundColor Green
