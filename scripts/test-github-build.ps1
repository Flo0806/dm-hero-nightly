# Test GitHub Actions Build locally
# Run this in PowerShell from C:\Projects\dm-hero

Write-Host "=== Simulating GitHub Actions Build ===" -ForegroundColor Cyan

# Step 1: Clean slate (like fresh checkout)
Write-Host "`n[1/5] Cleaning node_modules..." -ForegroundColor Yellow
if (Test-Path "node_modules") { Remove-Item -Recurse -Force "node_modules" }
if (Test-Path "packages/app/node_modules") { Remove-Item -Recurse -Force "packages/app/node_modules" }
if (Test-Path "packages/landing/node_modules") { Remove-Item -Recurse -Force "packages/landing/node_modules" }
if (Test-Path "packages/app/.output") { Remove-Item -Recurse -Force "packages/app/.output" }
if (Test-Path "packages/app/dist-electron") { Remove-Item -Recurse -Force "packages/app/dist-electron" }

# Step 2: Install dependencies
Write-Host "`n[2/5] Installing dependencies (pnpm install)..." -ForegroundColor Yellow
pnpm install
if ($LASTEXITCODE -ne 0) { Write-Host "FAILED: pnpm install" -ForegroundColor Red; exit 1 }

# Step 3: Build Nuxt
Write-Host "`n[3/5] Building Nuxt (pnpm --filter @dm-hero/app build)..." -ForegroundColor Yellow
pnpm --filter @dm-hero/app build
if ($LASTEXITCODE -ne 0) { Write-Host "FAILED: nuxt build" -ForegroundColor Red; exit 1 }

# Step 4: Rebuild better-sqlite3 for Electron
Write-Host "`n[4/5] Rebuilding better-sqlite3 for Electron..." -ForegroundColor Yellow
pnpm --filter @dm-hero/app electron:rebuild
if ($LASTEXITCODE -ne 0) { Write-Host "FAILED: electron:rebuild" -ForegroundColor Red; exit 1 }

# Step 5: Build Electron app
Write-Host "`n[5/5] Building Electron app..." -ForegroundColor Yellow
Set-Location packages/app
pnpm exec electron-builder --win
if ($LASTEXITCODE -ne 0) { Write-Host "FAILED: electron-builder" -ForegroundColor Red; exit 1 }
Set-Location ../..

Write-Host "`n=== Build Complete ===" -ForegroundColor Green
Write-Host "Output: packages/app/dist-electron/" -ForegroundColor Green

# List output
Get-ChildItem packages/app/dist-electron/*.zip | ForEach-Object { Write-Host "  $_" }
