param (
    [switch]$Clean
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " AI Assistant - Full Release Build Script " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Check dependencies
if (!(Test-Path "backend\.venv\Scripts\pyinstaller.exe")) {
    Write-Host "[ERROR] PyInstaller not found. Please install it in backend\.venv" -ForegroundColor Red
    exit 1
}

if ($Clean) {
    Write-Host "`n[*] Cleaning previous build artifacts..." -ForegroundColor Yellow
    if (Test-Path "backend\build") { Remove-Item -Recurse -Force "backend\build" }
    if (Test-Path "backend\dist") { Remove-Item -Recurse -Force "backend\dist" }
    if (Test-Path "src-tauri\target") { Remove-Item -Recurse -Force "src-tauri\target" }
}

Write-Host "`n[1/3] Compiling Python Backend Sidecar..." -ForegroundColor Green
Push-Location backend
& .venv\Scripts\pyinstaller.exe backend.spec --clean --noconfirm
$pybuildStatus = $LASTEXITCODE
Pop-Location

if ($pybuildStatus -ne 0 -or !(Test-Path "backend\dist\backend.exe")) {
    Write-Host "[ERROR] Failed to compile Python backend!" -ForegroundColor Red
    exit 1
}

Write-Host "`n[2/3] Copying Backend Binary to Tauri sidecar directory..." -ForegroundColor Green
$targetDir = "src-tauri\binaries"
if (!(Test-Path $targetDir)) { New-Item -ItemType Directory -Path $targetDir | Out-Null }
Copy-Item "backend\dist\backend.exe" -Destination "$targetDir\backend-x86_64-pc-windows-msvc.exe" -Force
Write-Host " -> Copied to $targetDir\backend-x86_64-pc-windows-msvc.exe" -ForegroundColor DarkGray

Write-Host "`n[3/3] Packaging Application with Tauri..." -ForegroundColor Green
# Running the npm build
npm run tauri build

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n==========================================" -ForegroundColor Cyan
    Write-Host " BUILD COMPLETE! " -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "Your installer is ready at:"
    Write-Host " -> src-tauri\target\release\bundle\nsis\" -ForegroundColor Yellow
} else {
    Write-Host "`n[ERROR] Tauri build failed!" -ForegroundColor Red
    exit 1
}
