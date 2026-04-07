@echo off
:: ==========================================================
:: AMP-MANAGER
:: Post-build.bat
:: A simple batch script to manage add manifestAdmin to executable
:: Author: Nuno Luciano
:: Date: 2026-02-25
:: Version: 1.01.0
:: LICENSE: MIT
:: ==========================================================
setlocal enabledelayedexpansion

echo ================================================
echo AMP Manager - Post Build Script (Require Admin)
echo ================================================

:: CONFIGURATION
:: Put ResourceHacker.exe in project root or update path
:: Change APP_NAME to the exact app name from neutralino.config.json
set "SCRIPT_DIR=%~dp0"
set "RESOURCE_HACKER=%SCRIPT_DIR%resource_hacker\ResourceHacker.exe"
set "APP_NAME=AMP-Manager"                  
set "BUILD_DIR=dist\amp-manager"
set "MANIFEST_FILE=requireAdmin.manifest"
  
:: Find the latest Windows x64 executable
for /f "delims=" %%A in ('dir /b /a-d "%BUILD_DIR%\%APP_NAME%-win_x64.exe" 2^>nul') do set "EXE_FILE=%%A"
if not defined EXE_FILE (
    for /f "delims=" %%A in ('dir /b /a-d "%BUILD_DIR%\*-win_x64.exe" 2^>nul ^| sort') do set "EXE_FILE=%%A"
)

if not defined EXE_FILE (
    echo [ERROR] Could not find any *-win_x64.exe in %BUILD_DIR%
    echo Make sure you ran "neu build" first.
    pause
    exit /b 1
)

set "FULL_EXE=%BUILD_DIR%\%EXE_FILE%"

echo Found executable: %EXE_FILE%
echo Applying requireAdministrator manifest...

:: Apply the manifest using Resource Hacker (add overwrite = replace if exists)
"%RESOURCE_HACKER%" -open "%FULL_EXE%" -save "%FULL_EXE%" -action addoverwrite -res "%MANIFEST_FILE%" -mask MANIFEST,1,1033 -log console

if %errorlevel% neq 0 (
    echo [ERROR] Failed to apply manifest. Make sure ResourceHacker.exe is in the project root.
    pause
    exit /b 1
)

echo.
echo Success! Admin manifest applied to: %EXE_FILE%
echo Users will now see UAC prompt when launching the app (required for amp-tasks.bat + Docker).
echo.
echo You can distribute the file from: %FULL_EXE%
echo.

:: Ask user if they want to clean up non-Windows build artifacts
echo ================================================
echo Cleanup Option
echo ================================================
echo This will remove Linux, macOS, and ARM Windows build files.
echo.
echo [C] Clean now   - Remove non-Windows files
echo [S] Skip        - Keep all build files
echo [E] Exit        - Exit without changes
echo.
set /p CHOICE="Choose (C/S/E): "

if /i "%CHOICE%"=="C" (
    call post-clean-dist.bat
) else if /i "%CHOICE%"=="S" (
    echo Skipping cleanup.
) else if /i "%CHOICE%"=="E" (
    echo Exiting.
    endlocal
    exit /b 0
) else (
    echo Invalid choice. Skipping cleanup.
)

endlocal
pause