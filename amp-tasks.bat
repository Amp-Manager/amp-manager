@echo off
:: ==========================================================
:: AMP-MANAGER.BAT
:: A simple batch script to manage the local dev AMP stack
:: Designed for Windows with Angie, MariaDB, PHP, and mkcert (SSL).
:: Provides configuration checks, tasks for domain management, and CA handling.
:: Author: Nuno Luciano
:: Date: 2026-02-25
:: Version: 1.11.3
:: LICENSE: MIT
:: ==========================================================
chcp 65001 >nul
setlocal EnableDelayedExpansion


:MAIN_LOGIC
:: ENVIRONMENT SETUP
cd /d "%~dp0"

:: drive
set "DRV=%~d0\"

:: HOSTS
set "HOSTS=%windir%\System32\drivers\etc\hosts"

:: PROJECT ROOT = folder where amp-tasks.bat lives
set "PROJECT_ROOT=%~dp0"
set "PROJECT_ROOT=%PROJECT_ROOT:~0,-1%"

set "CONFIG_FOLDER=%PROJECT_ROOT%\config"
set "SERVER_FOLDER=%PROJECT_ROOT%\config\angie-sites"
set "CERT_FOLDER=%PROJECT_ROOT%\config\certs"
set "DATA_FOLDER=%PROJECT_ROOT%\data"
set "WWW_FOLDER=%PROJECT_ROOT%\www"
set "MKCERT=%CONFIG_FOLDER%\mkcert.exe"
:: default
set "URL=https://angie.local/"


:: TASK DISPATCHER
if "%~1"=="" goto :HELP

:: Environment & Runtime
if /i "%~1"=="env_status"        goto :ENV_STATUS
if /i "%~1"=="runtime_status"    goto :RUNTIME_STATUS

:: Domain management
if /i "%~1"=="scan_domains"      goto :SCAN_DOMAINS
if /i "%~1"=="list_domains"      goto :LIST_DOMAINS
if /i "%~1"=="new_domain"        goto :NEW_DOMAIN
if /i "%~1"=="remove_domain"     goto :REMOVE_DOMAIN
if /i "%~1"=="generate_config"   goto :GENERATE_CONFIG
if /i "%~1"=="angie_live_status" goto :ANGIE_LIVE_STATUS

:: Status & Health
if /i "%~1"=="status"            goto :STATUS
if /i "%~1"=="env_status"        goto :ENV_STATUS
if /i "%~1"=="runtime_status"    goto :RUNTIME_STATUS
if /i "%~1"=="php_extensions"    goto :PHP_EXTENSIONS

:: Certificate Authority
if /i "%~1"=="ca_status"         goto :CA_STATUS
if /i "%~1"=="ca_reset"          goto :CA_RESET
if /i "%~1"=="ca_uninstall"      goto :CA_UNINSTALL
if /i "%~1"=="regenerate_ssl"    goto :REGENERATE_SSL
if /i "%~1"=="regenerate_all_ssl" goto :REGENERATE_ALL_SSL

:: SSH Key Management
if /i "%~1"=="ssh_key_status"    goto :SSH_KEY_STATUS
if /i "%~1"=="ssh_key_generate"  goto :SSH_KEY_GENERATE

:: Docker / Angie
if /i "%~1"=="docker_up"         goto :DOCKER_UP
if /i "%~1"=="docker_stop"       goto :DOCKER_STOP
if /i "%~1"=="docker_restart"    goto :DOCKER_RESTART
if /i "%~1"=="restart_angie"     goto :RESTART_ANGIE
if /i "%~1"=="restart_runtime"   goto :RESTART_RUNTIME
if /i "%~1"=="docker_env_metrics" goto :DOCKER_SUMMARY
if /i "%~1"=="docker_desktop_launch" goto :DOCKER_DESKTOP_LAUNCH
if /i "%~1"=="db_query"           goto :DB_QUERY

:: Workflow 
if /i "%~1"=="workflow_action"    goto :WORKFLOW_ACTION
if /i "%~1"=="workflow_git"       goto :WORKFLOW_GIT
if /i "%~1"=="workflow_sftp"      goto :WORKFLOW_SFTP
if /i "%~1"=="workflow_webhook"   goto :WORKFLOW_WEBHOOK

:: Maintenance
if /i "%~1"=="clear_cache"       goto :CLEAR_CACHE
if /i "%~1"=="clear_logs"        goto :CLEAR_LOGS

:: Version
if /i "%~1"=="version" goto :VERSION

goto :HELP

:: Tasks supported
:HELP
echo {"status":"error","message":"Invalid or missing task","supported":["status","env_status","runtime_status","scan_domains","list_domains","new_domain","remove_domain","generate_config","ca_status","ca_reset","ca_uninstall","regenerate_ssl","regenerate_all_ssl","ssh_key_status","ssh_key_generate","docker_desktop_launch","docker_up","docker_stop","restart_angie","restart_runtime","docker_restart","docker_env_metrics","clear_cache","clear_logs","version"]}
exit /b 1

:STATUS
setlocal EnableDelayedExpansion
:: Check Docker version availability
docker --version >nul 2>&1
if errorlevel 1 (
    echo {"status":"error","message":"Docker is not recognized as an internal or external command. Please ensure Docker Desktop is installed and in your PATH."}
    endlocal & exit /b 1
)

:: Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo {"status":"error","message":"Docker is installed but not running. Please start Docker Desktop."}
    endlocal & exit /b 1
)

:: Get container status
set "RUNNING_COUNT=0"
for /f "tokens=*" %%i in ('docker compose ps --format "{{.Service}}:{{.State}}" 2^>nul') do (
    set "LINE=%%i"
    if "!LINE:running=!" neq "!LINE!" set /a RUNNING_COUNT+=1
)

echo {"status":"ok","message":"System is operational","docker":"running","containers_running":!RUNNING_COUNT!,"timestamp":"%DATE% %TIME%"}
endlocal
exit /b 0

:PHP_EXTENSIONS
setlocal EnableDelayedExpansion
docker info >nul 2>&1 || (echo {"status":"error","message":"Docker not running"} & endlocal & exit /b 1)

:: Run the command you tested
for /f "usebackq tokens=*" %%i in (`docker compose exec -T php php -r "echo json_encode(get_loaded_extensions());" 2^>nul`) do (
    set "EXTS=%%i"
)

if "!EXTS!"=="" (
    echo {"status":"error","message":"Failed to retrieve extensions. Is the PHP container running?"}
) else (
    echo {"status":"ok","extensions":!EXTS!}
)
endlocal
exit /b 0

:VERSION
setlocal EnableDelayedExpansion
echo {"status":"ok","version":"1.0.0","build":"2026-03-07","engine":"amp-manager-batch"}
endlocal
exit /b 0

:CLEAR_CACHE
setlocal EnableDelayedExpansion
set "TGT=%PROJECT_ROOT%\angie_cache"
if exist "!TGT!" (
    for /d %%i in ("!TGT!\*") do rmdir /s /q "%%i" >nul 2>&1
    del /q /f "!TGT!\*.*" >nul 2>&1
)
echo {"status":"ok","message":"Cache cleared"}
endlocal
exit /b 0

:CLEAR_LOGS
setlocal EnableDelayedExpansion
set "TGT=%PROJECT_ROOT%\logs"
if exist "!TGT!" (
    for /d %%i in ("!TGT!\*") do rmdir /s /q "%%i" >nul 2>&1
    del /q /f "!TGT!\*.*" >nul 2>&1
)
echo {"status":"ok","message":"Logs cleared"}
endlocal
exit /b 0

:WORKFLOW_ACTION
setlocal EnableDelayedExpansion
set "WF_DOMAIN=%~2"
set "WF_CMD=%~3"

:: Resolve path
set "WF_PATH=%WWW_FOLDER%\!WF_DOMAIN!"
if not exist "!WF_PATH!" mkdir "!WF_PATH!"

:: Execute
pushd "!WF_PATH!"
!WF_CMD! >"%TEMP%\wf_action.log" 2>&1
set "ERR=!ERRORLEVEL!"
popd

if "!ERR!"=="0" (
    echo {"status":"ok","message":"Action completed","command":"!WF_CMD!"}
) else (
    set /p LOG=<"%TEMP%\wf_action.log"
    echo {"status":"error","message":"Action failed","details":"!LOG!"}
)
endlocal & exit /b !ERR!
:WORKFLOW_GIT
setlocal EnableDelayedExpansion
set "WF_DOMAIN=%~2"
set "WF_CMD=%~3"

:: Resolve path
set "WF_PATH=%WWW_FOLDER%\!WF_DOMAIN!"
if not exist "!WF_PATH!" mkdir "!WF_PATH!"

:: Capability check: git installed?
git --version >nul 2>&1
if errorlevel 1 (
    echo {"status":"error","message":"Git is not installed"}
    endlocal & exit /b 1
)

:: Execute git command
pushd "!WF_PATH!"
git !WF_CMD! >"%TEMP%\git_cmd.log" 2>&1
set "ERR=!ERRORLEVEL!"

:: If clone into current dir failed, it might be because the dir is not empty (e.g. scaffolded index.php)
if !ERR! neq 0 (
    echo !WF_CMD! | findstr /i /c:"clone" | findstr /c:" ." >nul
    if !errorlevel! equ 0 (
        :: Try to remove default scaffold files and retry
        if exist "index.php" del /q "index.php"
        if exist "index.html" del /q "index.html"
        git !WF_CMD! >"%TEMP%\git_cmd.log" 2>&1
        set "ERR=!ERRORLEVEL!"
    )
)
popd

if "!ERR!"=="0" (
    echo {"status":"ok","message":"Git command completed","command":"git !WF_CMD!"}
) else (
    set /p LOG=<"%TEMP%\git_cmd.log"
    echo {"status":"error","message":"Git command failed","details":"!LOG!"}
)
endlocal & exit /b !ERR!

:WORKFLOW_SFTP
setlocal EnableDelayedExpansion

:: Parameters: host, username, localPath, remotePath, keyFilePath, keyType
:: keyType: "temp" (delete after use) or "permanent" (keep, e.g. AMP Manager key)
set "WF_HOST=%~2"
set "WF_USER=%~3"
set "WF_LOCAL=%~4"
set "WF_REMOTE=%~5"
set "WF_KEY_FILE=%~6"
set "WF_KEY_TYPE=%~7"

:: Validate required parameters
if "!WF_HOST!"=="" (
    echo {"status":"error","message":"SFTP host is required"}
    endlocal & exit /b 1
)
if "!WF_USER!"=="" (
    echo {"status":"error","message":"SFTP username is required"}
    endlocal & exit /b 1
)
if "!WF_KEY_FILE!"=="" (
    echo {"status":"error","message":"SFTP requires SSH key authentication. Please select an SSH credential."}
    endlocal & exit /b 1
)
if "!WF_LOCAL!"=="" set "WF_LOCAL=."
if "!WF_REMOTE!"=="" set "WF_REMOTE=/"

:: Capability check: sftp installed?
where sftp >nul 2>&1
if errorlevel 1 (
    echo {"status":"error","message":"SFTP client is not available on this system"}
    endlocal & exit /b 1
)

:: Verify key file exists
if not exist "!WF_KEY_FILE!" (
    echo {"status":"error","message":"SSH key file not found: !WF_KEY_FILE!"}
    endlocal & exit /b 1
)

:: Resolve local path (relative to domain folder or absolute)
set "WF_LOCAL_PATH=!WF_LOCAL!"
if "!WF_LOCAL:~1,1!" neq ":" (
    if not exist "!WF_LOCAL!" (
        set "WF_LOCAL_PATH=%WWW_FOLDER%\!WF_LOCAL!"
    )
)

:: Verify local path exists
if not exist "!WF_LOCAL_PATH!" (
    echo {"status":"error","message":"Local path not found: !WF_LOCAL_PATH!"}
    :: Cleanup temp key file before exit (only if temp)
    if /i "!WF_KEY_TYPE!"=="temp" del /f /q "!WF_KEY_FILE!" >nul 2>&1
    endlocal & exit /b 1
)

:: Create temp batch file for SFTP commands
set "SFTP_BATCH=%TEMP%\amp_sftp_cmd_!RANDOM!.txt"

:: Determine if local is a file or directory
set "IS_DIR=false"
if exist "!WF_LOCAL_PATH!\*" set "IS_DIR=true"

:: Write SFTP commands to batch file
if "!IS_DIR!"=="true" (
    echo cd "!WF_REMOTE!" > "!SFTP_BATCH!"
    echo put -r "!WF_LOCAL_PATH!" >> "!SFTP_BATCH!"
) else (
    echo put "!WF_LOCAL_PATH!" "!WF_REMOTE!" >> "!SFTP_BATCH!"
)

:: Execute SFTP
sftp -i "!WF_KEY_FILE!" -o StrictHostKeyChecking=no -o BatchMode=yes -b "!SFTP_BATCH!" "!WF_USER!@!WF_HOST!" >"%TEMP%\sftp_output.txt" 2>&1
set "SFTP_ERR=!ERRORLEVEL!"

:: Cleanup: Only delete key file if it's a temp file (not permanent AMP key)
if /i "!WF_KEY_TYPE!"=="temp" (
    del /f /q "!WF_KEY_FILE!" >nul 2>&1
)
:: Always delete temp batch file
del /f /q "!SFTP_BATCH!" >nul 2>&1

:: Read output for error details
set "SFTP_OUTPUT="
if exist "%TEMP%\sftp_output.txt" (
    for /f "usebackq delims=" %%a in ("%TEMP%\sftp_output.txt") do (
        set "line=%%a"
        set "line=!line:"='!"
        if not defined SFTP_OUTPUT (
            set "SFTP_OUTPUT=!line!"
        ) else (
            set "SFTP_OUTPUT=!SFTP_OUTPUT! | !line!"
        )
    )
    del /f /q "%TEMP%\sftp_output.txt" >nul 2>&1
)

if "!SFTP_ERR!"=="0" (
    echo {"status":"ok","message":"SFTP transfer completed","host":"!WF_HOST!","local":"!WF_LOCAL_PATH!","remote":"!WF_REMOTE!"}
) else (
    if not defined SFTP_OUTPUT set "SFTP_OUTPUT=Unknown SFTP error"
    echo {"status":"error","message":"SFTP transfer failed","details":"!SFTP_OUTPUT!","host":"!WF_HOST!"}
)

endlocal & exit /b !SFTP_ERR!

:WORKFLOW_WEBHOOK
setlocal EnableDelayedExpansion
set "WF_URL=%~2"
set "WF_PAYLOAD=%~3"

:: Use powershell to send webhook
powershell -NoProfile -Command ^
    "try { $r = Invoke-WebRequest -Method Post -Uri '!WF_URL!' -Body '!WF_PAYLOAD!' -ContentType 'application/json' -UseBasicParsing; Write-Output '{\"ok\":true,\"status\":' + $r.StatusCode + '}' } catch { Write-Output '{\"ok\":false,\"error\":\"' + $_.Exception.Message + '\"}' }" ^
    >"%TEMP%\webhook_output.json" 2>&1

set "ERR=!ERRORLEVEL!"

:: Read result
set /p RESULT=<"%TEMP%\webhook_output.json"

:: Cleanup
del "%TEMP%\webhook_output.json" >nul 2>&1

:: Return JSON to UI
if "!ERR!"=="0" (
    echo {"status":"ok","message":"Webhook executed","response":!RESULT!}
) else (
    echo {"status":"error","message":"Webhook failed","details":!RESULT!}
)
endlocal & exit /b !ERR!



:SCAN_DOMAINS
:: ALL DOMAINS FROM WINDOWS FILE HOSTS
setlocal EnableDelayedExpansion
set "COUNT=0"
set "DOMAINS=["
set "COMMA="

for /f "tokens=2 delims=	 " %%D in ('findstr /i /r /c:"127.0.0.1" "%HOSTS%" ^| findstr /i ".local"') do (
    set "DOMAIN=%%D"
    set "DOMAIN=!DOMAIN: =!"
    
    :: Skip if domain starts with # (comment)
    if not "!DOMAIN:~0,1!"=="#" (
        if not "!DOMAIN!"=="" (
            set "DOMAINS=!DOMAINS!!COMMA!"!DOMAIN!""
            set "COMMA=,"
            set /a COUNT+=1
        )
    )
)

set "DOMAINS=!DOMAINS!]"
echo {"status":"ok","count":!COUNT!,"domains":!DOMAINS!}
endlocal
exit /b 0


:LIST_DOMAINS
:: ONLY RETURNS DOMAINS CREATED AND MANAGED BY AMP-MANAGER
:: Also validates SSL certificates by comparing CA vs cert timestamps
setlocal EnableDelayedExpansion
set "OUTPUT=["
set "COMMA="

:: Check if root CA files exist and get timestamp
set "CA_OK=false"
set "CA_TIMESTAMP=0"
if exist "%MKCERT%" (
    for /f "delims=" %%i in ('"%MKCERT%" -CAROOT 2^>nul') do set "CAROOT=%%i"
    if defined CAROOT (
        if exist "!CAROOT!\rootCA.pem" if exist "!CAROOT!\rootCA-key.pem" (
            set "CA_OK=true"
            :: Get CA rootCA.pem timestamp (Windows file time in ticks)
            for %%T in ("!CAROOT!\rootCA.pem") do set "CA_TIMESTAMP=%%~tT"
        )
    )
)

if exist "%SERVER_FOLDER%\*.conf" (
    for %%F in ("%SERVER_FOLDER%\*.conf") do (
        set "DOMAIN=%%~nF"
        
        set "HAS_CONF=true"
        set "HAS_SSL=false"
        set "SSL_VALID=false"
        
        :: Only report SSL=true when BOTH certificate AND CA exist
        set "CERT_FILE=%CERT_FOLDER%\!DOMAIN!.pem"
        if exist "!CERT_FILE!" if "!CA_OK!"=="true" set "HAS_SSL=true"
        
        :: Compare timestamps to determine SSL validity
        if "!HAS_SSL!"=="true" (
            for %%T in ("!CERT_FILE!") do (
                set "CERT_TIMESTAMP=%%~tT"
                :: If cert timestamp >= CA timestamp, SSL is valid (generated after CA was installed/reset)
                if "!CERT_TIMESTAMP!" geq "!CA_TIMESTAMP!" set "SSL_VALID=true"
            )
        )
        
        set "OUTPUT=!OUTPUT!!COMMA!{"domain":"!DOMAIN!","config":!HAS_CONF!,"ssl":!HAS_SSL!,"ssl_valid":!SSL_VALID!}"
        set "COMMA=,"
    )
)

set "OUTPUT=!OUTPUT!]"
echo {"status":"ok","domains":!OUTPUT!}
endlocal
exit /b 0


:NEW_DOMAIN
setlocal EnableDelayedExpansion
set "NAME=%~2"
set "SCAFFOLD_FLAG=%~3"
if "%NAME%"=="" echo {"status":"error","message":"No project name provided"} & exit /b 1

:: Clean name → domain (lowercase)
set "NAME=!NAME: =!"
set "NAME=!NAME:.local=!"
:: Convert to lowercase
for /f "delims=" %%i in ('powershell -NoProfile -Command "'!NAME!'.ToLower()"') do set "NAME=%%i"
set "DOMAIN=!NAME!.local"

:: Domain already exists?
findstr /i /c:"127.0.0.1 !DOMAIN!" "%HOSTS%" >nul
if !errorlevel! equ 0 (
    echo {"status":"error","message":"Domain already exists in hosts file"} & exit /b 1
)

:: SAFETY BACKUP of hosts before any modification
copy /y "%HOSTS%" "%HOSTS%.bak" >nul 2>&1

set "TARGET_DIR=%WWW_FOLDER%\!DOMAIN!"

set "SCAFFOLDED=false"
if not exist "!TARGET_DIR!\" (
    mkdir "!TARGET_DIR!" >nul 2>&1
    if exist "!TARGET_DIR!\" set "SCAFFOLDED=true"
    
    if /i "!SCAFFOLD_FLAG!"=="scaffold" (
        if exist "%WWW_FOLDER%\_scaffold\" (
            robocopy "%WWW_FOLDER%\_scaffold" "!TARGET_DIR!" /E /NFL /NDL /NJH /NJS >nul 2>&1
            if errorlevel 8 (
                set "SCAFFOLD_WARNING=Failed to copy scaffold files"
                > "!TARGET_DIR!\index.php" echo ^<?php echo "Welcome to !DOMAIN!"; ?^>
            ) else if exist "!TARGET_DIR!\index.php" (
                powershell -Command "(Get-Content '!TARGET_DIR!\index.php') -replace '\{\{DOMAIN\}\}', '!DOMAIN!' | Set-Content '!TARGET_DIR!\index.php'" >nul 2>&1
            )
        ) else (
            set "SCAFFOLD_WARNING=Scaffold template not found"
            > "!TARGET_DIR!\index.php" echo ^<?php echo "Welcome to !DOMAIN!"; ?^>
        )
    )
)

:: Add to hosts
set "HOSTS_ADDED=false"
(echo 127.0.0.1 !DOMAIN!   # AMPMANAGER)>>"%HOSTS%" && set "HOSTS_ADDED=true"

set "WARNING="
if "!HOSTS_ADDED!"=="false" (
    set "WARNING=Failed to add entry to hosts file. Please run AMP Manager as Administrator or add '127.0.0.1 !DOMAIN!' manually."
)
if defined SCAFFOLD_WARNING (
    if defined WARNING (
        set "WARNING=!WARNING! | !SCAFFOLD_WARNING!"
    ) else (
        set "WARNING=!SCAFFOLD_WARNING!"
    )
)

ipconfig /flushdns >nul 2>&1

:: Generate certificates
"%MKCERT%" -cert-file "%CERT_FOLDER%\!DOMAIN!.pem" -key-file "%CERT_FOLDER%\!DOMAIN!-key.pem" "!DOMAIN!" >nul 2>&1
if errorlevel 1 (
    del "%CERT_FOLDER%\!DOMAIN!.pem" >nul 2>&1
    del "%CERT_FOLDER%\!DOMAIN!-key.pem" >nul 2>&1
    echo {"status":"error","message":"mkcert failed to generate certificate for !DOMAIN!"}
    exit /b 1
)

:: Create config from template
if not exist "%SERVER_FOLDER%" mkdir "%SERVER_FOLDER%"
set "CONF_FILE=%SERVER_FOLDER%\!DOMAIN!.conf"

set "TEMPLATE=%PROJECT_ROOT%\config\default.local.conf"
if not exist "!TEMPLATE!" (
    echo {"status":"error","message":"Template not found: !TEMPLATE!"} & exit /b 1
)
copy /y "!TEMPLATE!" "!CONF_FILE!" >nul

:: Replace {{DOMAIN}}
powershell -NoProfile -Command ^
    "(Get-Content '!CONF_FILE!') -replace '{{DOMAIN}}','!DOMAIN!' | Set-Content '!CONF_FILE!'"

:: Update docker-compose.override.yml
call :ADD_EXTRA_HOST "!DOMAIN!"

:: Restart angie so it loads the new config
pushd "%PROJECT_ROOT%"
docker compose up -d angie >nul 2>&1
set "RESTART_ERR=!ERRORLEVEL!"
popd

if "!RESTART_ERR!"=="0" (
    set "ESCAPED_TARGET_DIR=!TARGET_DIR:\=\\!"
    set "ESCAPED_CONF_FILE=!CONF_FILE:\=\\!"
    set "ESCAPED_CERT_FILE=%CERT_FOLDER%\!DOMAIN!.pem"
    set "ESCAPED_CERT_FILE=!ESCAPED_CERT_FILE:\=\\!"
    set "ESCAPED_KEY_FILE=%CERT_FOLDER%\!DOMAIN!-key.pem"
    set "ESCAPED_KEY_FILE=!ESCAPED_KEY_FILE:\=\\!"
    set "ESCAPED_HOSTS=%HOSTS:\=\\%"
    if defined WARNING (
        echo {"status":"ok","warning":"!WARNING!","domain":"!DOMAIN!","folder":"!ESCAPED_TARGET_DIR!","scaffolded":!SCAFFOLDED!,"config":"!ESCAPED_CONF_FILE!","cert":"!ESCAPED_CERT_FILE!","key":"!ESCAPED_KEY_FILE!","hosts_added":!HOSTS_ADDED!,"docker_override_updated":true,"steps":[{"name":"scaffold","label":"Project folder","success":!SCAFFOLDED!,"path":"!ESCAPED_TARGET_DIR!"},{"name":"ssl","label":"SSL certificate","success":true,"path":"!ESCAPED_CERT_FILE!"},{"name":"config","label":"Angie configuration","success":true,"path":"!ESCAPED_CONF_FILE!"},{"name":"hosts","label":"Hosts file entry","success":!HOSTS_ADDED!,"path":"!ESCAPED_HOSTS!"}]}
    ) else (
        echo {"status":"ok","domain":"!DOMAIN!","folder":"!ESCAPED_TARGET_DIR!","scaffolded":!SCAFFOLDED!,"config":"!ESCAPED_CONF_FILE!","cert":"!ESCAPED_CERT_FILE!","key":"!ESCAPED_KEY_FILE!","hosts_added":!HOSTS_ADDED!,"docker_override_updated":true,"steps":[{"name":"scaffold","label":"Project folder","success":!SCAFFOLDED!,"path":"!ESCAPED_TARGET_DIR!"},{"name":"ssl","label":"SSL certificate","success":true,"path":"!ESCAPED_CERT_FILE!"},{"name":"config","label":"Angie configuration","success":true,"path":"!ESCAPED_CONF_FILE!"},{"name":"hosts","label":"Hosts file entry","success":!HOSTS_ADDED!,"path":"!ESCAPED_HOSTS!"}]}
    )
) else (
    set "ESCAPED_TARGET_DIR=!TARGET_DIR:\=\\!"
    set "ESCAPED_CONF_FILE=!CONF_FILE:\=\\!"
    set "ESCAPED_CERT_FILE=%CERT_FOLDER%\!DOMAIN!.pem"
    set "ESCAPED_CERT_FILE=!ESCAPED_CERT_FILE:\=\\!"
    set "ESCAPED_KEY_FILE=%CERT_FOLDER%\!DOMAIN!-key.pem"
    set "ESCAPED_KEY_FILE=!ESCAPED_KEY_FILE:\=\\!"
    set "ESCAPED_HOSTS=%HOSTS:\=\\%"
    
    set "FINAL_WARNING=Failed to restart Angie. The domain was created but may not be accessible until Angie is restarted."
    if defined WARNING set "FINAL_WARNING=!FINAL_WARNING! | !WARNING!"
    
    echo {"status":"ok","warning":"!FINAL_WARNING!","domain":"!DOMAIN!","folder":"!ESCAPED_TARGET_DIR!","scaffolded":!SCAFFOLDED!,"config":"!ESCAPED_CONF_FILE!","cert":"!ESCAPED_CERT_FILE!","key":"!ESCAPED_KEY_FILE!","hosts_added":!HOSTS_ADDED!,"docker_override_updated":true,"steps":[{"name":"scaffold","label":"Project folder","success":!SCAFFOLDED!,"path":"!ESCAPED_TARGET_DIR!"},{"name":"ssl","label":"SSL certificate","success":true,"path":"!ESCAPED_CERT_FILE!"},{"name":"config","label":"Angie configuration","success":true,"path":"!ESCAPED_CONF_FILE!"},{"name":"hosts","label":"Hosts file entry","success":!HOSTS_ADDED!,"path":"!ESCAPED_HOSTS!"}]}
)

endlocal
exit /b 0


:REMOVE_DOMAIN
:: SAFELY REMOVE AMP-MANAGED DOMAIN
setlocal EnableDelayedExpansion

:: Normalize domain
set "DOMAIN=%~2"
if "%DOMAIN%"=="" echo {"status":"error","message":"No domain provided"} & exit /b 1

set "DOMAIN=%DOMAIN: =%"
set "DOMAIN=%DOMAIN:.local=%"
set "DOMAIN=%DOMAIN%.local"

set "CONF_FILE=%SERVER_FOLDER%\%DOMAIN%.conf"
set "CERT_FILE=%CERT_FOLDER%\%DOMAIN%.pem"
set "KEY_FILE=%CERT_FOLDER%\%DOMAIN%-key.pem"

:: Create backup before any modification
set "HOSTS_BACKUP=%HOSTS%.bak"
copy /y "%HOSTS%" "!HOSTS_BACKUP!" >nul 2>&1
if not exist "!HOSTS_BACKUP!" (
    echo {"status":"error","message":"Failed to create hosts backup"} & exit /b 1
)

:: Check if domain exists in hosts
set "EXISTS_IN_HOSTS=false"
findstr /i /c:"127.0.0.1 %DOMAIN%" "%HOSTS%" >nul && set "EXISTS_IN_HOSTS=true"

:: Check if any files exist
set "ANY_FILE_EXISTS=false"
if exist "!CONF_FILE!" set "ANY_FILE_EXISTS=true"
if exist "!CERT_FILE!" set "ANY_FILE_EXISTS=true"
if exist "!KEY_FILE!" set "ANY_FILE_EXISTS=true"

:: If nothing exists at all, then it's an error
if "!EXISTS_IN_HOSTS!"=="false" if "!ANY_FILE_EXISTS!"=="false" (
    echo {"status":"error","message":"Domain not found (no files or hosts entry)"} & exit /b 1
)

:: Remove hosts entry (using findstr for robustness)
set "HOSTS_REMOVED=false"
if "!EXISTS_IN_HOSTS!"=="true" (
    :: Create temp file with lines that don't contain the domain
    set "TEMP_HOSTS=%TEMP%\hosts_temp_!RANDOM!.txt"
    
    :: Use findstr /v to exclude lines containing the domain
    findstr /v /i "%DOMAIN%" "%HOSTS%" > "!TEMP_HOSTS!" 2>nul
    
    :: Verify temp file exists and has content
    if exist "!TEMP_HOSTS!" (
        for %%A in ("!TEMP_HOSTS!") do set "TEMP_SIZE=%%~zA"
        if !TEMP_SIZE! gtr 0 (
            copy /y "!TEMP_HOSTS!" "%HOSTS%" >nul 2>&1 && set "HOSTS_REMOVED=true"
        )
        del "!TEMP_HOSTS!" >nul 2>&1
    )
) else (
    :: Not in hosts, so technically "removed" or "not present"
    set "HOSTS_REMOVED=true"
)

:: Validate hosts file is not corrupted after modification
if "!HOSTS_REMOVED!"=="true" (
    for %%A in ("%HOSTS%") do set "HOSTS_SIZE=%%~zA"
    if !HOSTS_SIZE! lss 10 (
        :: Hosts file corrupted (less than 10 bytes), restore from backup
        copy /y "!HOSTS_BACKUP!" "%HOSTS%" >nul 2>&1
        set "HOSTS_REMOVED=false"
        set "WARNING=Hosts file was corrupted during removal. Restored from backup."
    )
)

ipconfig /flushdns >nul 2>&1

:: Remove from docker-compose.override.yml (TUI sync pattern)
set "OV_FILE=%PROJECT_ROOT%\docker-compose.override.yml"
set "TEMP_OV=%PROJECT_ROOT%\docker-compose.override.tmp"
set "MASTER_COMPOSE=%PROJECT_ROOT%\docker-compose.yml"
set "DOCKER_CLEANED=false"

if exist "!OV_FILE!" (
    powershell -NoProfile -Command "$c = Get-Content '!OV_FILE!'; $c | Where-Object { $_ -notmatch '!DOMAIN!' } | Set-Content '!TEMP_OV!'"
    if exist "!TEMP_OV!" (
        move /y "!TEMP_OV!" "!OV_FILE!" >nul
        set "DOCKER_CLEANED=true"
    )
    
    docker info >nul 2>&1
    if !errorlevel! equ 0 (
        docker compose -f "!MASTER_COMPOSE!" -f "!OV_FILE!" up -d --no-deps php >nul 2>&1
    )
)

:: Remove config + SSL
set "CONF_REMOVED=false"
if exist "!CONF_FILE!" (
    del /f /q "!CONF_FILE!" >nul 2>&1 && set "CONF_REMOVED=true"
) else (
    set "CONF_REMOVED=true"
)

set "SSL_REMOVED=false"
set "SSL_FILES_EXIST=false"
if exist "!CERT_FILE!" set "SSL_FILES_EXIST=true"
if exist "!KEY_FILE!" set "SSL_FILES_EXIST=true"

if "!SSL_FILES_EXIST!"=="true" (
    del /f /q "!CERT_FILE!" >nul 2>&1
    del /f /q "!KEY_FILE!" >nul 2>&1 && set "SSL_REMOVED=true"
) else (
    set "SSL_REMOVED=true"
)

:: Reload Angie
set "ANGIE_RELOADED=false"
docker compose exec -T angie angie -s reload >nul 2>&1 && set "ANGIE_RELOADED=true"

set "ESCAPED_CONF_FILE=!CONF_FILE:\=\\!"
set "ESCAPED_CERT_FILE=!CERT_FILE:\=\\!"
set "ESCAPED_HOSTS=%HOSTS:\=\\%"

:: Build warning message (WARNING may already be set from validation)
if "!EXISTS_IN_HOSTS!"=="false" (
    if defined WARNING (
        set "WARNING=Domain was not found in hosts file. !WARNING!"
    ) else (
        set "WARNING=Domain was not found in hosts file."
    )
)
if defined HOSTS_BACKUP (
    set "ESCAPED_HOSTS_BACKUP=!HOSTS_BACKUP:\=\\!"
)

echo {"status":"ok","warning":"!WARNING!","domain":"%DOMAIN%","amp_managed":true,"hosts_removed":!HOSTS_REMOVED!,"config_removed":!CONF_REMOVED!,"ssl_removed":!SSL_REMOVED!,"angie_reloaded":!ANGIE_RELOADED!,"docker_override_cleaned":!DOCKER_CLEANED!,"backup":"!ESCAPED_HOSTS_BACKUP!","steps":[{"name":"config","label":"Remove configuration","success":!CONF_REMOVED!,"path":"!ESCAPED_CONF_FILE!"},{"name":"ssl","label":"Remove SSL certificates","success":!SSL_REMOVED!,"path":"!ESCAPED_CERT_FILE!"},{"name":"hosts","label":"Remove hosts entry","success":!HOSTS_REMOVED!,"path":"!ESCAPED_HOSTS!"},{"name":"reload","label":"Reload Angie server","success":!ANGIE_RELOADED!}]}

endlocal
exit /b 0


:GENERATE_CONFIG
:: REGENERATE SSL + CONFIG FOR A DOMAIN
setlocal EnableDelayedExpansion
set "DOMAIN=%~2"
if "%DOMAIN%"=="" echo {"status":"error","message":"No domain provided"} & exit /b 1

:: Normalize domain
set "DOMAIN=%DOMAIN: =%"
set "DOMAIN=%DOMAIN:.local=%"
set "DOMAIN=%DOMAIN%.local"

set "CONF_FILE=%SERVER_FOLDER%\%DOMAIN%.conf"
set "CERT_FILE=%CERT_FOLDER%\%DOMAIN%.pem"
set "KEY_FILE=%CERT_FOLDER%\%DOMAIN%-key.pem"

:: Normal domains use default.local.conf
set "TEMPLATE=%PROJECT_ROOT%\config\default.local.conf"
if not exist "!TEMPLATE!" (
    echo {"status":"error","message":"Template not found: !TEMPLATE!"} & exit /b 1
)

copy /y "!TEMPLATE!" "!CONF_FILE!" >nul

:: Replace {{DOMAIN}}
powershell -NoProfile -Command ^
    "(Get-Content '!CONF_FILE!') -replace '{{DOMAIN}}','%DOMAIN%' | Set-Content '!CONF_FILE!'"


:GEN_SSL
:: Regenerate SSL
"%MKCERT%" -cert-file "!CERT_FILE!" -key-file "!KEY_FILE!" "%DOMAIN%" >nul 2>&1
if errorlevel 1 (
    del "!CERT_FILE!" >nul 2>&1
    del "!KEY_FILE!" >nul 2>&1
    echo {"status":"error","message":"mkcert failed to generate certificate for !DOMAIN!"}
    exit /b 1
)

set "ESCAPED_CONF_FILE=!CONF_FILE:\=\\!"
set "ESCAPED_CERT_FILE=!CERT_FILE:\=\\!"
set "ESCAPED_KEY_FILE=!KEY_FILE:\=\\!"
echo {"status":"ok","domain":"%DOMAIN%","config":"!ESCAPED_CONF_FILE!","cert":"!ESCAPED_CERT_FILE!","key":"!ESCAPED_KEY_FILE!"}
endlocal
exit /b 0


:ANGIE_LIVE_STATUS
setlocal EnableDelayedExpansion
:: Fetch status from inside the container to bypass host-side networking/SSL/CORS issues
:: We use docker compose exec to target the service correctly regardless of container name
:: -L follows redirects (301), -k ignores SSL issues for internal localhost check
docker compose exec -T angie curl -s -L -k http://localhost/status/api/ 2>nul
if errorlevel 1 (
    docker compose exec -T angie wget -qO- --no-check-certificate http://localhost/status/api/ 2>nul
    if errorlevel 1 (
        echo {"status":"error","message":"Failed to fetch Angie status from inside container"}
    )
)
endlocal
exit /b 0


:ADD_EXTRA_HOST
:: setlocal prevent variables to leak into NEW_DOMAIN or other subroutines
setlocal EnableDelayedExpansion

set "DOMAIN=%~1"
set "OV_FILE=%PROJECT_ROOT%\docker-compose.override.yml"

:: Create override file if missing
if not exist "!OV_FILE!" (
    >"!OV_FILE!" echo services:
    >>"!OV_FILE!" echo   php:
    >>"!OV_FILE!" echo     extra_hosts:
    >>"!OV_FILE!" echo.
)

:: Add entry if missing
:: findstr /i /c:"!DOMAIN!:host-gateway" "!OV_FILE!" >nul
:: replace with exact match 
findstr /i /r /c:"^[ ]*-[ ]*\"!DOMAIN!:host-gateway\"" "!OV_FILE!" >nul

if errorlevel 1 (
    powershell -NoProfile -Command ^
        "Add-Content -Path '!OV_FILE!' -Value '      - \"!DOMAIN!:host-gateway\"' -Encoding ascii" >nul 2>&1
)

:: Recreate PHP container so Angie sees the new host
docker compose -f "%PROJECT_ROOT%\docker-compose.yml" -f "!OV_FILE!" up -d --no-deps php >nul 2>&1

endlocal
:: endlocal prevent variables to leak into NEW_DOMAIN or other subroutines
exit /b 0


:CA_STATUS
setlocal EnableDelayedExpansion

set "MKCERT_PRESENT=fail"
set "CAROOT_OK=fail"
set "CAROOT="
set "VALID_UNTIL=Unknown"

:: Check mkcert exists
if exist "%MKCERT%" set "MKCERT_PRESENT=ok"

:: Get system CAROOT directly from mkcert
if "%MKCERT_PRESENT%"=="ok" (
    for /f "delims=" %%i in ('powershell -NoProfile -Command ^& "%MKCERT%" -CAROOT 2^>^&1') do (
        set "CAROOT=%%i"
    )
)

:: Validate CAROOT
if defined CAROOT (
    if exist "%CAROOT%\rootCA.pem" if exist "%CAROOT%\rootCA-key.pem" (
        set "CAROOT_OK=ok"
        :: Get expiration date via powershell
        for /f "delims=" %%v in ('powershell -NoProfile -Command "(New-Object System.Security.Cryptography.X509Certificates.X509Certificate2('%CAROOT%\rootCA.pem')).NotAfter.ToString('yyyy-MM-dd')" 2^>nul') do (
            set "VALID_UNTIL=%%v"
        )
    )
)

:: Escape backslashes for JSON
set "ESCAPED_CAROOT=%CAROOT:\=\\%"

echo {"status":"ok","mkcert":"%MKCERT_PRESENT%","caroot_ok":"%CAROOT_OK%","location":"!ESCAPED_CAROOT!","valid_until":"!VALID_UNTIL!"}

endlocal
exit /b 0


:CA_RESET
setlocal EnableDelayedExpansion

:: mkcert must exist
if not exist "%MKCERT%" (
    echo {"status":"error","message":"mkcert not found"}
    endlocal & exit /b 1
)

:: Uninstall existing CA
"%MKCERT%" -uninstall >nul 2>&1

:: Get CAROOT
set "CAROOT="
for /f "delims=" %%i in ('"%MKCERT%" -CAROOT 2^>nul') do set "CAROOT=%%i"

:: Remove CAROOT folder if it exists
if defined CAROOT if exist "!CAROOT!" (
    rmdir /s /q "!CAROOT!" >nul 2>&1
)

:: Install new CA
"%MKCERT%" -install >nul 2>&1

:: Wait a moment for Windows cert store
timeout /t 2 >nul

:: Refresh CAROOT
set "CAROOT="
for /f "delims=" %%i in ('"%MKCERT%" -CAROOT 2^>nul') do set "CAROOT=%%i"

:: Validate new CA
if defined CAROOT (
    if exist "!CAROOT!\rootCA.pem" if exist "!CAROOT!\rootCA-key.pem" (
        set "ESCAPED_CAROOT=!CAROOT:\=\\!"
        echo {"status":"ok","message":"CA reset and reinstalled","caroot":"!ESCAPED_CAROOT!"}
        endlocal & exit /b 0
    )
)

echo {"status":"error","message":"CA reset failed"}
endlocal
exit /b 1


:CA_UNINSTALL
setlocal EnableDelayedExpansion

if not exist "%MKCERT%" (
    echo {"status":"error","message":"mkcert not found"}
    endlocal & exit /b 1
)

:: Uninstall CA
"%MKCERT%" -uninstall >nul 2>&1

:: Get CAROOT
set "CAROOT="
for /f "delims=" %%i in ('"%MKCERT%" -CAROOT 2^>nul') do set "CAROOT=%%i"

:: Remove CAROOT folder
if defined CAROOT if exist "!CAROOT!" (
    rmdir /s /q "!CAROOT!" >nul 2>&1
)

echo {"status":"ok","message":"CA uninstalled"}
endlocal
exit /b 0


:REGENERATE_SSL
:: Regenerate SSL certificate for a single domain
setlocal EnableDelayedExpansion
set "DOMAIN=%~2"
if "%DOMAIN%"=="" echo {"status":"error","message":"No domain provided"} & exit /b 1

:: Normalize domain
set "DOMAIN=%DOMAIN: =%"
set "DOMAIN=%DOMAIN:.local=%"
set "DOMAIN=%DOMAIN%.local"

:: Verify mkcert exists
if not exist "%MKCERT%" (
    echo {"status":"error","message":"mkcert not found"}
    exit /b 1
)

set "CERT_FILE=%CERT_FOLDER%\%DOMAIN%.pem"
set "KEY_FILE=%CERT_FOLDER%\%DOMAIN%-key.pem"

:: Verify domain exists in hosts
findstr /i /c:"%DOMAIN%" "%HOSTS%" >nul
if errorlevel 1 (
    echo {"status":"error","message":"Domain not found: %DOMAIN%"}
    exit /b 1
)

:: Generate SSL
"%MKCERT%" -cert-file "!CERT_FILE!" -key-file "!KEY_FILE!" "%DOMAIN%" >nul 2>&1
if errorlevel 1 (
    echo {"status":"error","message":"mkcert failed to regenerate SSL for %DOMAIN%"}
    exit /b 1
)

set "ESCAPED_CERT_FILE=!CERT_FILE:\=\\!"
set "ESCAPED_KEY_FILE=!KEY_FILE:\=\\!"
endlocal
echo {"status":"ok","domain":"%DOMAIN%","cert":"!ESCAPED_CERT_FILE!","key":"!ESCAPED_KEY_FILE!"}
exit /b 0


:REGENERATE_ALL_SSL
:: Regenerate SSL certificates for all existing domains
setlocal EnableDelayedExpansion

:: Verify mkcert exists
if not exist "%MKCERT%" (
    echo {"status":"error","message":"mkcert not found"}
    exit /b 1
)

set "COUNT=0"
set "FAILED=0"
set "SUCCESS_DOMAINS=["

:: Loop through all domain config files
for %%F in ("%SERVER_FOLDER%\*.conf") do (
    set "FILENAME=%%~nF"
    set "DOMAIN=!FILENAME!"
    set "CERT_FILE=%CERT_FOLDER%\!DOMAIN!.pem"
    set "KEY_FILE=%CERT_FOLDER%\!DOMAIN!-key.pem"
    
    :: Generate SSL for this domain
    "%MKCERT%" -cert-file "!CERT_FILE!" -key-file "!KEY_FILE!" "!DOMAIN!" >nul 2>&1
    if errorlevel 1 (
        set /a FAILED+=1
    ) else (
        set /a COUNT+=1
        if !COUNT! equ 1 (
            set "SUCCESS_DOMAINS=!SUCCESS_DOMAINS!"!DOMAIN!""
        ) else (
            set "SUCCESS_DOMAINS=!SUCCESS_DOMAINS!,"!DOMAIN!""
        )
    )
)

set "SUCCESS_DOMAINS=!SUCCESS_DOMAINS!]"
endlocal
echo {"status":"ok","regenerated":!COUNT!,"failed":!FAILED!,"domains":!SUCCESS_DOMAINS!}
exit /b 0


:SSH_KEY_STATUS
setlocal EnableDelayedExpansion
set "SSH_DIR=%USERPROFILE%\.ssh"
set "KEY_FILE=%SSH_DIR%\id_ed25519"
set "PUB_FILE=%SSH_DIR%\id_ed25519.pub"

if not exist "%KEY_FILE%" (
    echo {"status":"error","message":"SSH key not found","key_exists":false}
    endlocal
    exit /b 1
)

set "FINGERPRINT="
for /f "tokens=2" %%i in ('ssh-keygen -lf "%KEY_FILE%" 2^>nul') do set "FINGERPRINT=%%i"

set "PUBLIC_KEY="
for /f "usebackq delims=" %%a in ("%PUB_FILE%") do set "PUBLIC_KEY=%%a"

set "ESCAPED_KEY_FILE=!KEY_FILE:\=\\!"
echo {"status":"ok","key_exists":true,"fingerprint":"!FINGERPRINT!","public_key":"!PUBLIC_KEY!","key_path":"!ESCAPED_KEY_FILE!"}

endlocal
exit /b 0


:SSH_KEY_GENERATE
setlocal EnableDelayedExpansion

set "USERNAME=%~2"
if "%USERNAME%"=="" (
    echo {"status":"error","message":"No username provided"}
    endlocal
    exit /b 1
)

set "SSH_DIR=%USERPROFILE%\.ssh"
set "KEY_FILE=%SSH_DIR%\id_ed25519"
set "PUB_FILE=%SSH_DIR%\id_ed25519.pub"

if not exist "%SSH_DIR%" mkdir "%SSH_DIR%"

if exist "%KEY_FILE%" (
    set "PUBLIC_KEY="
    for /f "usebackq delims=" %%a in ("%PUB_FILE%") do set "PUBLIC_KEY=%%a"
    set "FINGERPRINT="
    for /f "tokens=2" %%i in ('ssh-keygen -lf "%KEY_FILE%" 2^>nul') do set "FINGERPRINT=%%i"
    set "ESCAPED_KEY_FILE=!KEY_FILE:\=\\!"
    echo {"status":"ok","message":"SSH key already exists","key_path":"!ESCAPED_KEY_FILE!","fingerprint":"!FINGERPRINT!","public_key":"!PUBLIC_KEY!"}
    endlocal
    exit /b 0
)

ssh-keygen -t ed25519 -C "%USERNAME%" -f "%KEY_FILE%" -N "" >nul 2>&1
if errorlevel 1 (
    echo {"status":"error","message":"Failed to generate SSH key"}
    endlocal
    exit /b 1
)

set "PUBLIC_KEY="
for /f "usebackq delims=" %%a in ("%PUB_FILE%") do set "PUBLIC_KEY=%%a"

set "FINGERPRINT="
for /f "tokens=2" %%i in ('ssh-keygen -lf "%KEY_FILE%" 2^>nul') do set "FINGERPRINT=%%i"

set "ESCAPED_KEY_FILE=!KEY_FILE:\=\\!"
echo {"status":"ok","message":"SSH key generated","key_path":"!ESCAPED_KEY_FILE!","fingerprint":"!FINGERPRINT!","public_key":"!PUBLIC_KEY!"}

endlocal
exit /b 0



:: DOCKER ACTIONS
:DOCKER_UP
setlocal EnableDelayedExpansion

docker info >nul 2>&1 || (echo {"status":"error","message":"Docker not running"} & endlocal & exit /b 1)

docker compose version >nul 2>&1
if errorlevel 1 (
    echo {"status":"error","message":"Docker Compose not available"} 
    endlocal & exit /b 1
)

pushd "%PROJECT_ROOT%"
docker compose up -d >nul 2>&1
set "ERR=!ERRORLEVEL!"
popd

if "!ERR!"=="0" (
    echo {"status":"ok","message":"Docker stack started"}
) else (
    echo {"status":"error","message":"Failed to start Docker stack"}
)

endlocal & exit /b !ERR!


:DOCKER_STOP
setlocal EnableDelayedExpansion

docker info >nul 2>&1 || (echo {"status":"error","message":"Docker not running"} & endlocal & exit /b 1)

docker compose version >nul 2>&1
if errorlevel 1 (
    echo {"status":"error","message":"Docker Compose not available"} 
    endlocal & exit /b 1
)

pushd "%PROJECT_ROOT%"
docker compose stop -t 0 >nul 2>&1
set "ERR=!ERRORLEVEL!"
popd

if "!ERR!"=="0" (
    echo {"status":"ok","message":"Docker stack stopped"}
) else (
    echo {"status":"error","message":"Failed to stop Docker stack"}
)

endlocal & exit /b !ERR!


:DOCKER_RESTART
setlocal EnableDelayedExpansion

docker info >nul 2>&1 || (echo {"status":"error","message":"Docker not running"} & endlocal & exit /b 1)

docker compose version >nul 2>&1
if errorlevel 1 (
    echo {"status":"error","message":"Docker Compose not available"} 
    endlocal & exit /b 1
)

pushd "%PROJECT_ROOT%"
docker compose restart --no-health >nul 2>&1
set "ERR=!ERRORLEVEL!"
popd

if "!ERR!"=="0" (
    echo {"status":"ok","message":"Docker stack restarted"}
) else (
    echo {"status":"error","message":"Failed to restart Docker stack"}
)

endlocal & exit /b !ERR!


:DOCKER_DESKTOP_LAUNCH
setlocal EnableDelayedExpansion

set "dockerPath=%ProgramFiles%\Docker\Docker\Docker Desktop.exe"

if exist "%dockerPath%" (
    start "" "%dockerPath%"
    rem Escape backslashes for JSON
    set "jsonPath=%dockerPath:\=\\%"
    echo {"status":"ok","message":"Docker Desktop launched","path":"!jsonPath!"}
) else (
    start "" "Docker Desktop"
    echo {"status":"ok","message":"Docker Desktop launched via PATH","path":"Docker Desktop"}
)

endlocal
exit /b 0


:RESTART_ANGIE
setlocal EnableDelayedExpansion

docker info >nul 2>&1 || (echo {"status":"error","message":"Docker not running"} & endlocal & exit /b 1)

docker compose version >nul 2>&1
if errorlevel 1 (
    echo {"status":"error","message":"Docker Compose not available"} 
    endlocal & exit /b 1
)

pushd "%PROJECT_ROOT%"
docker compose up -d angie >nul 2>&1
set "ERR=!ERRORLEVEL!"
popd

if "!ERR!"=="0" (
    echo {"status":"ok","message":"Angie restarted"}
) else (
    echo {"status":"error","message":"Failed to restart Angie"}
)

endlocal & exit /b !ERR!


:RESTART_RUNTIME
setlocal EnableDelayedExpansion

docker info >nul 2>&1 || (echo {"status":"error","message":"Docker not running"} & endlocal & exit /b 1)

docker compose version >nul 2>&1
if errorlevel 1 (
    echo {"status":"error","message":"Docker Compose not available"} 
    endlocal & exit /b 1
)

pushd "%PROJECT_ROOT%"
:: Restart php and db 
docker compose restart php db >nul 2>&1
set "ERR=!ERRORLEVEL!"
popd

if "!ERR!"=="0" (
    echo {"status":"ok","message":"Runtime restarted"}
) else (
    echo {"status":"error","message":"Failed to restart Runtime"}
)

endlocal & exit /b !ERR!


:: Database

:DB_QUERY
setlocal EnableDelayedExpansion
set "QUERY=%~2"

:: PRE-PROCESS: Detect operation type
if /i "!QUERY!"=="LIST" (
    set "QUERY=SHOW DATABASES;"
) else if "!QUERY:~0,6!"=="delete" (
    :: Parse deleteDbName - extract name after "delete"
    set "DB_NAME=!QUERY:~6!"
    if not defined DB_NAME goto :missing_arg
    set "QUERY=DROP DATABASE IF EXISTS `!DB_NAME!`;"
) else if "!QUERY!"=="!QUERY:|||=!" (
    :: No ||| found, treat as raw SQL (backward compatibility)
    rem QUERY already set
) else (
    :: Parse dbname|||user|||pass for CREATE
    set "PARSED=!QUERY:|||=§!"
    for /f "tokens=1,2,3 delims=§" %%a in ("!PARSED!") do (
        set "DB_NAME=%%a"
        set "DB_USER=%%b"
        set "DB_PW=%%c"
    )
    if not defined DB_NAME goto :missing_arg
    if not defined DB_USER goto :missing_arg
    if not defined DB_PW goto :missing_arg
    set "QUERY=CREATE DATABASE IF NOT EXISTS `!DB_NAME!` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE USER IF NOT EXISTS '!DB_USER!'@'%%' IDENTIFIED BY '!DB_PW!'; GRANT ALL PRIVILEGES ON `!DB_NAME!`.* TO '!DB_USER!'@'%%'; FLUSH PRIVILEGES;"
)
:: END PRE-PROCESS

docker info >nul 2>&1 || (echo {"status":"error","message":"Docker not running"} & endlocal & exit /b 1)

pushd "%PROJECT_ROOT%"
:: Dynamically retrieve the root password from the container environment
for /f "usebackq tokens=*" %%i in (`docker compose exec -T db sh -c "echo $MYSQL_ROOT_PASSWORD"`) do set "DB_PASS=%%i"

if not defined DB_PASS (
    popd
    echo {"status":"error","message":"Could not retrieve root password from container"}
    endlocal & exit /b 1
)

:: Execute the query using the retrieved password. -N (no headers), -s (silent/raw)
docker compose exec -T db mysql -u root -p!DB_PASS! -N -s -e "!QUERY!" >"%TEMP%\db_out.txt" 2>"%TEMP%\db_err.txt"
set "ERR=!ERRORLEVEL!"
popd

if "!ERR!"=="0" (
    :: Read the entire file and join with \n, escaping quotes for JSON safety
    set "FULL_OUT="
    for /f "usebackq delims=" %%a in ("%TEMP%\db_out.txt") do (
        set "line=%%a"
        set "line=!line:"='!"
        if not defined FULL_OUT (
            set "FULL_OUT=!line!"
        ) else (
            set "FULL_OUT=!FULL_OUT!\n!line!"
        )
    )
    echo {"status":"ok","stdOut":"!FULL_OUT!","exitCode":0}
) else (
    set "ERR_MSG="
    if exist "%TEMP%\db_err.txt" (
        for /f "usebackq delims=" %%a in ("%TEMP%\db_err.txt") do (
            if not defined ERR_MSG (
                set "ERR_MSG=%%a"
            ) else (
                set "ERR_MSG=!ERR_MSG! %%a"
            )
        )
    )
    if not defined ERR_MSG set "ERR_MSG=Unknown database error"
    set "ERR_MSG=!ERR_MSG:"='!"
    echo {"status":"error","message":"!ERR_MSG!","exitCode":!ERR!}
)
endlocal & exit /b !ERR!

:missing_arg
popd 2>nul
echo {"status":"error","message":"Invalid format. Use LIST, deleteDbName, or dbname|||user|||pass","exitCode":1}
endlocal & exit /b 1


:: Environment status
:ENV_STATUS
setlocal EnableDelayedExpansion

set "status=ok"

:: Check docker-compose.yml
if exist "%PROJECT_ROOT%\docker-compose.yml" (
    set "docker_compose=ok"
) else (
    set "docker_compose=fail"
    set "status=error"
)

:: Check Angie config
if exist "%CONFIG_FOLDER%\angie.conf" (
    set "angie_conf=ok"
    for %%f in ("%CONFIG_FOLDER%\angie.conf") do set "angie_conf_date=%%~tf"
) else (
    set "angie_conf=fail"
    set "angie_conf_date="
    set "status=error"
)

:: Check DB init folder
if exist "%CONFIG_FOLDER%\db-init" (
    set "db_init=ok"
) else (
    set "db_init=fail"
    set "status=error"
)

:: Check PHP ini
if exist "%CONFIG_FOLDER%\php.ini" (
    set "php_ini=ok"
) else (
    set "php_ini=fail"
    set "status=error"
)

:: Check data folder
if exist "%DATA_FOLDER%" (
    set "data_folder=ok"
) else (
    set "data_folder=fail"
    set "status=error"
)

:: Check www folder
if exist "%WWW_FOLDER%" (
    set "www_folder=ok"
    for %%f in ("%WWW_FOLDER%") do set "www_folder_date=%%~tf"
) else (
    set "www_folder=fail"
    set "www_folder_date="
    set "status=error"
)

:: Check certificate file
if exist "%CERT_FOLDER%" (
    set "cert_file=ok"
    for %%f in ("%CERT_FOLDER%\rootCA.pem") do set "cert_file_date=%%~tf"
) else (
    set "cert_file=fail"
    set "cert_file_date="
    set "status=error"
)

:: Check mkcert
if exist "%MKCERT%" (
    set "mkcert=ok"
) else (
    set "mkcert=fail"
    set "status=error"
)

:: Check CAROOT
set "caroot_ok=fail"
set "CAROOT="
if "%mkcert%"=="ok" (
    for /f "delims=" %%i in ('powershell -NoProfile -Command ^& "%MKCERT%" -CAROOT 2^>^&1') do (
        set "CAROOT=%%i"
    )
)
if defined CAROOT (
    if exist "%CAROOT%\rootCA.pem" if exist "%CAROOT%\rootCA-key.pem" set "caroot_ok=ok"
)

if "!caroot_ok!"=="fail" set "status=error"

:: Check Docker running (with timeout to prevent hangs)
powershell -Command "try { $job = Start-Job { docker info *>$null; $LASTEXITCODE }; if ($job | Wait-Job -Timeout 5) { $code = Receive-Job $job; exit $code } else { Stop-Job $job; exit 1 } } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
    set "docker_running=fail"
    set "status=error"
) else (
    set "docker_running=ok"
)

:: Output JSON (single line)
set "ESCAPED_ROOT=%PROJECT_ROOT:\=\\%"
echo {"status":"!status!","project_root":"!ESCAPED_ROOT!","docker_compose":"!docker_compose!","angie_conf":"!angie_conf!","db_init":"!db_init!","php_ini":"!php_ini!","data_folder":"!data_folder!","www_folder":"!www_folder!","cert_file":"!cert_file!","mkcert":"!mkcert!","caroot_ok":"!caroot_ok!","docker_running":"!docker_running!","angie_conf_date":"!angie_conf_date!","cert_file_date":"!cert_file_date!","www_folder_date":"!www_folder_date!"}

endlocal & exit /b 0


:RUNTIME_STATUS
setlocal EnableDelayedExpansion

set "status=ok"

:: Check Docker engine (with timeout to prevent hangs)
powershell -Command "try { $job = Start-Job { docker info *>$null; $LASTEXITCODE }; if ($job | Wait-Job -Timeout 5) { $code = Receive-Job $job; exit $code } else { Stop-Job $job; exit 1 } } catch { exit 1 }" >nul 2>&1
if !errorlevel! == 0 (
    set "docker_engine=true"
) else (
    set "docker_engine=false"
    set "status=error"
)

:: If Docker is running, check containers
if "!docker_engine!"=="true" (
    docker ps --filter "status=running" | findstr /i "angie" >nul && (
        set "angie_running=true"
    ) || (
        set "angie_running=false"
        set "status=error"
    )

    docker ps --filter "status=running" | findstr /i "php" >nul && (
        set "php_running=true"
    ) || (
        set "php_running=false"
        set "status=error"
    )

    docker ps --filter "status=running" | findstr /i "db" >nul && (
        set "db_running=true"
    ) || (
        set "db_running=false"
        set "status=error"
    )
) else (
    set "angie_running=false"
    set "php_running=false"
    set "db_running=false"
)

echo {"status":"!status!","docker":!docker_engine!,"angie":!angie_running!,"php":!php_running!,"db":!db_running!}

endlocal & exit /b 0


:DOCKER_SUMMARY
setlocal EnableDelayedExpansion

:: Default status
set "status=ok"

:: Check Docker availability
docker info --format "{{json .}}" >"%TEMP%\docker_info.json" 2>nul
if !errorlevel! neq 0 (
    echo {"status":"error","message":"Docker engine is not available"}
    endlocal & exit /b 1
)

:: Get docker info JSON
set /p DOCKER_INFO=<"%TEMP%\docker_info.json"

:: Manual count of running containers to be sure
set "RUNNING_COUNT=0"
for /f %%i in ('docker ps -q ^| find /c /v ""') do set "RUNNING_COUNT=%%i"

:: Get docker system df JSON
docker system df --format "{{json .}}" >"%TEMP%\docker_df.json" 2>nul
if !errorlevel! neq 0 (
    echo {"status":"error","message":"Failed to retrieve Docker disk usage"}
    endlocal & exit /b 1
)

set /p DOCKER_DF=<"%TEMP%\docker_df.json"

:: Output combined JSON
echo {"status":"ok","info":!DOCKER_INFO!,"df":!DOCKER_DF!,"running_count":!RUNNING_COUNT!}

endlocal & exit /b 0