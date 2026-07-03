@echo off
REM ============================================================================
REM  Achivo Agent — installer
REM  Copies the agent to a stable folder, starts it hidden, and registers it to
REM  launch automatically every time you sign in to Windows.
REM ============================================================================
setlocal EnableExtensions

set "TARGET=%LOCALAPPDATA%\Achivo\Agent"
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SRC=%~dp0"

echo.
echo   Installing Achivo Agent...
echo   Destination: %TARGET%
echo.

if not exist "%TARGET%" mkdir "%TARGET%"

copy /Y "%SRC%SAM.Agent.exe"        "%TARGET%\" >nul || goto :fail
copy /Y "%SRC%SAM.Agent.exe.config" "%TARGET%\" >nul
copy /Y "%SRC%SAM.API.dll"          "%TARGET%\" >nul || goto :fail
copy /Y "%SRC%run-hidden.vbs"       "%TARGET%\" >nul || goto :fail

REM --- Autostart: a Startup-folder shortcut that runs the hidden launcher. ----
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$w=New-Object -ComObject WScript.Shell; $s=$w.CreateShortcut('%STARTUP%\Achivo Agent.lnk'); $s.TargetPath='wscript.exe'; $s.Arguments='\"%TARGET%\run-hidden.vbs\"'; $s.WorkingDirectory='%TARGET%'; $s.Description='Achivo local unlock agent'; $s.Save()"

REM --- Start it now (hidden), so you don't have to reboot. --------------------
start "" wscript.exe "%TARGET%\run-hidden.vbs"

echo   Done.
echo.
echo   The agent now runs in the background and starts with Windows.
echo   Next: open Steam and sign in, then open the Achivo web app.
echo.
pause
exit /b 0

:fail
echo.
echo   [!] Install failed — could not copy files.
echo       Make sure SAM.Agent.exe and SAM.API.dll are next to this script.
echo.
pause
exit /b 1
