@echo off
REM Wait for Vite dev server on port 9245 before launching the Wails binary.
REM Wails3 alpha launches the primary command before the background vite is ready.

set TIMEOUT_SECS=30
set PORT=9245

echo Waiting for Vite dev server on port %PORT%...

for /L %%i in (1,1,%TIMEOUT_SECS%) do (
    powershell -NoProfile -Command "try { Invoke-WebRequest -Uri 'http://127.0.0.1:%PORT%' -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
    if not errorlevel 1 (
        echo Vite dev server is ready!
        goto :run
    )
    echo   ...waiting (%%i/%TIMEOUT_SECS%)
    timeout /t 1 /nobreak >nul
)

echo ERROR: Vite dev server did not start within %TIMEOUT_SECS% seconds.
exit /b 1

:run
set FRONTEND_DEVSERVER_URL=http://127.0.0.1:9245
wails3 task run
