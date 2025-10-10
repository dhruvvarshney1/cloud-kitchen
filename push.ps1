# Automated Git Push Script
# Usage: .\push.ps1

Write-Host "Adding all files to staging..." -ForegroundColor Cyan
git add .

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Write-Host "Committing with timestamp: $timestamp" -ForegroundColor Cyan
git commit -m "Automated commit: $timestamp"

Write-Host "Pushing to remote..." -ForegroundColor Cyan
git push

Write-Host "`nDone!" -ForegroundColor Green
