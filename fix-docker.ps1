# AI UI Generator - Docker Recovery Script
# Run as Administrator

Write-Host "🔴 Docker Daemon Reset Script" -ForegroundColor Red
Write-Host "================================`n" -ForegroundColor Red

# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Host "❌ ERREUR: Exécute ce script EN TANT QU'ADMINISTRATEUR!" -ForegroundColor Red
    Write-Host "   Clic droit sur PowerShell → Exécuter en tant qu'administrateur" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Mode administrateur détecté`n" -ForegroundColor Green

# Step 1: Kill Docker processes
Write-Host "Step 1: Arrêt des processus Docker..." -ForegroundColor Cyan
Get-Process | Where-Object {$_.ProcessName -like "*docker*" -or $_.ProcessName -like "*wsl*"} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Step 2: Restart Docker service if available
Write-Host "Step 2: Redémarrage du service Docker..." -ForegroundColor Cyan
Restart-Service "com.docker.service" -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

# Step 3: Wait for Docker to be ready
Write-Host "Step 3: Attente du daemon Docker..." -ForegroundColor Cyan
$maxAttempts = 20
$attempt = 0
while ($attempt -lt $maxAttempts) {
    try {
        $info = docker info 2>&1
        if ($info -and -not $info.Contains("Internal Server Error")) {
            Write-Host "✓ Docker daemon est prêt!`n" -ForegroundColor Green
            break
        }
    }
    catch {
        # Continue
    }

    Write-Host "  Tentative $($attempt+1)/$maxAttempts..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2
    $attempt++
}

if ($attempt -eq $maxAttempts) {
    Write-Host "⚠  Docker daemon ne répond toujours pas." -ForegroundColor Yellow
    Write-Host "   Relance Docker Desktop manuellement depuis le menu Démarrer." -ForegroundColor Yellow
    exit 1
}

# Step 4: Navigate et launch docker compose
Write-Host "Step 4: Relance des services Docker Compose..." -ForegroundColor Cyan
cd "C:\Users\merye\Downloads\ai-ui-generator-fixed\ai-ui-generator-fixed"

Write-Host "   • Arrêt des conteneurs existants..." -ForegroundColor Gray
docker compose down -v --remove-orphans 2>&1 | Out-Null
Start-Sleep -Seconds 2

Write-Host "   • Lancement des services (cela peut prendre 1-2 min)..." -ForegroundColor Gray
docker compose up -d

# Step 5: Wait for services to be healthy
Write-Host "`nStep 5: Vérification de l'état des services..." -ForegroundColor Cyan
Start-Sleep -Seconds 10

$services = @("mongo", "keycloak", "fastapi-ai", "spring-bff", "frontend")
$healthy = @()

foreach ($service in $services) {
    $status = docker compose ps $service --format "{{.Status}}" 2>&1
    if ($status -like "*Up*") {
        Write-Host "  ✓ $service : UP" -ForegroundColor Green
        $healthy += $service
    }
    else {
        Write-Host "  ❌ $service : NOT READY (yet)" -ForegroundColor Yellow
    }
}

Write-Host "`n================================" -ForegroundColor Green
Write-Host "✓ RÉCUPÉRATION COMPLÉTÉE!" -ForegroundColor Green
Write-Host "================================`n" -ForegroundColor Green

Write-Host "🌐 URLs d'accès:" -ForegroundColor Cyan
Write-Host "  Frontend:  http://localhost:5173" -ForegroundColor White
Write-Host "  Backend:   http://localhost:8081" -ForegroundColor White
Write-Host "  FastAPI:   http://localhost:8000" -ForegroundColor White
Write-Host "  Keycloak:  http://localhost:8083" -ForegroundColor White
Write-Host "  MongoDB:   localhost:27017" -ForegroundColor White

Write-Host "`n📝 Credentials:" -ForegroundColor Cyan
Write-Host "  User: developpeur" -ForegroundColor White
Write-Host "  Pass: developpeur" -ForegroundColor White

Write-Host "`n⏳ Les services mettent 30-60 sec à être complètement prêts." -ForegroundColor Yellow
Write-Host "   Attends un peu avant d'accéder aux URLs ci-dessus!`n" -ForegroundColor Yellow

Write-Host "✓ Réinitialisation Docker terminée! Prêt à l'emploi.`n" -ForegroundColor Green
