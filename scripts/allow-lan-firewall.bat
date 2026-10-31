@echo off
:: LIFORA - Allow LAN Firewall Helper
:: Self-elevates to Administrator if not already elevated

NET SESSION >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo Requesting Administrator privileges to add Windows Firewall rules...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0allow-lan-firewall.ps1"
echo.
pause
