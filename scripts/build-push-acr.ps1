# Build all service images and push to Azure Container Registry
# Usage: .\scripts\build-push-acr.ps1 [-Tag latest]

param(
    [string]$Tag = "latest"
)

$ACR      = "aiuigeneratoracr.azurecr.io"
$ACR_USER = "aiuigeneratoracr"
$ACR_PASS = "8VqGCVlfnjXWlIc1tAJ0rbDbKDD2udolYW8Csj2uyLBoyljwUUi0JQQJ99CFAC5RqLJEqg7NAAACAZCRjT3Y"

Set-StrictMode -Off
$ErrorActionPreference = "Stop"

$Root = Split-Path $PSScriptRoot -Parent

Write-Host "=== Login to ACR ===" -ForegroundColor Cyan
docker login $ACR -u $ACR_USER -p $ACR_PASS
if ($LASTEXITCODE -ne 0) { throw "ACR login failed" }

function Push-WithRetry {
    param([string]$Image, [int]$MaxRetries = 5)
    for ($i = 1; $i -le $MaxRetries; $i++) {
        Write-Host "  Push attempt $i/$MaxRetries..." -ForegroundColor DarkGray
        docker push $Image
        if ($LASTEXITCODE -eq 0) { return }
        if ($i -lt $MaxRetries) {
            Write-Host "  Retrying in 10s..." -ForegroundColor Yellow
            Start-Sleep -Seconds 10
        }
    }
    throw "Push failed after $MaxRetries attempts: $Image"
}

function Build-And-Push {
    param([string]$Name, [string]$Context, [string]$Dockerfile = "Dockerfile")
    $img = "${ACR}/${Name}:${Tag}"
    Write-Host "`n=== Building $img ===" -ForegroundColor Cyan
    docker build -t $img -f "$Root/$Context/$Dockerfile" "$Root/$Context"
    if ($LASTEXITCODE -ne 0) { throw "Build failed for $Name" }
    Write-Host "=== Pushing $img ===" -ForegroundColor Cyan
    Push-WithRetry -Image $img
}

Build-And-Push -Name "frontend"             -Context "frontend"
Build-And-Push -Name "spring-bff"           -Context "spring-bff"
Build-And-Push -Name "fastapi-ai"           -Context "fastapi-ai"
Build-And-Push -Name "transcript-streaming" -Context "transcript-ai" -Dockerfile "Dockerfile.streaming"

Write-Host "`n=== All images pushed to $ACR (tag: $Tag) ===" -ForegroundColor Green
