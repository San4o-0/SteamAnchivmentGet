@echo off
REM ============================================================================
REM  Achivo Agent — uninstaller
REM  Stops the agent, removes autostart, and deletes the installed files.
REM ============================================================================
setlocal EnableExtensions

set "TARGET=%LOCALAPPDATA%\Achivo\Agent"
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"

echo.
echo   Removing Achivo Agent...

REM Stop the running process (ignore error if it isn't running).
taskkill /IM SAM.Agent.exe /F >nul 2>&1

REM Remove the autostart shortcut.
if exist "%STARTUP%\Achivo Agent.lnk" del /F /Q "%STARTUP%\Achivo Agent.lnk"

REM Remove the installed folder.
if exist "%TARGET%" rmdir /S /Q "%TARGET%"

echo   Done. The agent is uninstalled.
echo.
pause
exit /b 0
