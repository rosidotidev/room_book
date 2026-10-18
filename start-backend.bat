@echo off
rem RoomBook backend: http://localhost:8080 (needs JDK 21; Maven is not required, the wrapper is used)
title RoomBook backend
cd /d "%~dp0backend"
call mvnw.cmd spring-boot:run
echo.
echo The backend stopped.
pause
