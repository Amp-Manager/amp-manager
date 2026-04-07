@echo off
:: ==========================================================
:: AMP-MANAGER
:: Post-clean-dist.bat
:: A simple batch script to clean unused executables
:: Author: Nuno Luciano
:: Date: 2026-02-25
:: Version: 1.01.0
:: LICENSE: MIT
:: ==========================================================
setlocal enabledelayedexpansion

echo ================================================
echo AMP Manager - Clean Build Artifacts
echo ================================================

set "BUILD_DIR=dist\amp-manager"

if not exist "%BUILD_DIR%" (
    echo [ERROR] Build directory not found: %BUILD_DIR%
    echo Run "npm run build:app" first.
    pause
    exit /b 1
)

echo Cleaning non-Windows build artifacts...

:: Remove Linux directories
for /d %%D in ("%BUILD_DIR%\*-linux*") do (
    echo Removing: %%~nxD
    rmdir /S /Q "%%D" 2>nul
)

:: Remove macOS directories
for /d %%D in ("%BUILD_DIR%\*-mac*") do (
    echo Removing: %%~nxD
    rmdir /S /Q "%%D" 2>nul
)

:: Remove ARM Windows directories
for /d %%D in ("%BUILD_DIR%\*-win_arm*") do (
    echo Removing: %%~nxD
    rmdir /S /Q "%%D" 2>nul
)

echo.
echo ================================================
echo Current build contents:
echo ================================================
dir "%BUILD_DIR%"

echo.
echo Done! Windows x64 build ready.
echo.

endlocal