@echo off
:: ==========================================================
:: AMP-MANAGER - Post Build Script
:: Applies UAC manifest + builds release tree
::
:: Usage:
::   Local:   post-build.bat
::   CI:     set CI=true && post-build.bat
:: ==========================================================
setlocal EnableDelayedExpansion

:: Get escape character for colored output
for /F "delims=" %%A in ('echo prompt $E^| cmd') do set "ESC=%%A"

echo %ESC%[34m================================================
echo AMP Manager - Post Build Script
echo ================================================%ESC%[0m

:: CONFIGURATION
set "SCRIPT_DIR=%~dp0"
set "RESOURCE_HACKER=%SCRIPT_DIR%resource_hacker\ResourceHacker.exe"
set "APP_NAME=AMP-Manager"
set "MANIFEST_FILE=requireAdmin.manifest"
set "DEST=amp-manager"

:: ============ Find Build Output Directory (CI + Local) ============
set "BUILD_DIR="
if exist "dist\amp-manager\amp-manager" (
    set "BUILD_DIR=dist\amp-manager\amp-manager"
) else if exist "dist\amp-manager" (
    set "BUILD_DIR=dist\amp-manager"
) else if exist "dist\amp-manager-win_x64" (
    set "BUILD_DIR=dist\amp-manager-win_x64"
)

if not defined BUILD_DIR (
    echo %ESC%[31m[ERROR] Could not find build output in dist folder%ESC%[0m
    if "%CI%"=="" pause
    exit /b 1
)

echo [AMP] Build directory: %BUILD_DIR%

:: ============ Step 1: Find EXECUTABLE (ALL modes) ============
for /f "delims=" %%A in ('dir /b /a-d "%BUILD_DIR%\*-win_x64.exe" 2^>nul ^| sort') do set "EXE_FILE=%%A"
if not defined EXE_FILE (
    echo %ESC%[31m[ERROR] Could not find *-win_x64.exe in %BUILD_DIR%%ESC%[0m
    if "%CI%"=="" pause
    exit /b 1
)

set "FULL_EXE=%BUILD_DIR%\%EXE_FILE%"
echo Found executable: %EXE_FILE%

:: ============ Step 2: CI Mode Check ============
if "%CI%"=="true" (
    echo %ESC%[33m[CI] CI mode detected - skipping prompts%ESC%[0m
    goto :APPLY_UAC
)

:: ============ LOCAL: Show Clean Option ============
echo.
echo %ESC%[34m================================================
echo Cleanup Option
echo ================================================%ESC%[0m
echo This will remove Linux, macOS, and ARM Windows build files.
echo.
echo [C] Clean now   - Remove non-Windows files
echo [S] Skip        - Keep all build files
echo [E] Exit        - Exit without changes
echo.
set /p CHOICE="Choose (C/S/E): "

if /i "%CHOICE%"=="C" (
    call post-clean-dist.bat
) else if /i "%CHOICE%"=="E" (
    echo Exiting.
    endlocal
    exit /b 0
)

:: ============ Step 3: Apply UAC Manifest ============
:APPLY_UAC
echo %ESC%[34m[AMP] Applying UAC manifest...%ESC%[0m

"%RESOURCE_HACKER%" -open "%FULL_EXE%" -save "%FULL_EXE%" -action addoverwrite -res "%MANIFEST_FILE%" -mask MANIFEST,1,1033 -log nul
if %errorlevel% neq 0 (
    echo %ESC%[31m[ERROR] Failed to apply UAC manifest%ESC%[0m
    if "%CI%"=="" pause
    exit /b 1
)

echo %ESC%[32m[AMP] ✅ UAC manifest applied%ESC%[0m

:: ============ Step 4: Build Release Tree ============
echo %ESC%[34m[AMP] Building release tree...%ESC%[0m

:: Clean and create destination folder
if exist "%DEST%" rmdir /s /q "%DEST%"
mkdir "%DEST%"

:: Copy executable + resources.neu
copy "%BUILD_DIR%\%EXE_FILE%" "%DEST%\" >nul
copy "%BUILD_DIR%\resources.neu" "%DEST%\" >nul

:: Copy scripts + config files
copy "amp-tasks.bat" "%DEST%\" >nul
copy "docker-compose.yml" "%DEST%\" >nul
copy "docker-compose.override.yml" "%DEST%\" >nul
if exist ".env" copy ".env" "%DEST%\" >nul
copy "LICENSE" "%DEST%\" >nul

:: Copy folders WITH content
xcopy "angie_cache" "%DEST%\angie_cache" /E /I /Q /Y >nul
xcopy "config" "%DEST%\config" /E /I /Q /Y >nul
xcopy "data" "%DEST%\data" /E /I /Q /Y >nul
xcopy "logs" "%DEST%\logs" /E /I /Q /Y >nul
xcopy "www" "%DEST%\www" /E /I /Q /Y >nul

echo %ESC%[32m[AMP] ✅ Release tree ready: %DEST%%ESC%[0m

:: ============ Step 5: Exit ============
if "%CI%"=="true" exit /b 0

:: LOCAL: Show summary
echo.
dir /b "%DEST%"
echo.
echo %ESC%[32m[AMP] Done.%ESC%[0m

endlocal
pause