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

:: Remove Linux files (they are executables in root)
del /Q "%BUILD_DIR%\*-linux*" 2>nul
del /Q "%BUILD_DIR%\*-linux*" 2>nul

:: Remove macOS files
del /Q "%BUILD_DIR%\*-mac*" 2>nul
del /Q "%BUILD_DIR%\*-mac*" 2>nul

:: Remove ARM Windows files  
del /Q "%BUILD_DIR%\*-win_arm*" 2>nul
del /Q "%BUILD_DIR%\*-win_arm*" 2>nul

:: Remove bin/ folder
if exist "%BUILD_DIR%\bin" (
    echo Removing: bin\
    rmdir /S /Q "%BUILD_DIR%\bin" 2>nul
)

:: Also remove any directories that may exist
for /d %%D in ("%BUILD_DIR%") do (
    echo Checking: %%~nxD
)

echo.
echo ================================================
echo Current build contents:
echo ================================================
dir "%BUILD_DIR%\*.*"

echo.
echo Done! Windows x64 build ready.
echo.

endlocal
