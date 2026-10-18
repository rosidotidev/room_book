@echo off
rem RoomBook frontend: http://localhost:4200 (needs Node.js; /api is proxied to the backend on port 8080)
title RoomBook frontend
cd /d "%~dp0frontend"
if not exist node_modules (
  echo Installing dependencies for the first time...
  call npm install
)
call npm start
echo.
echo The frontend stopped.
pause
