@echo off
chcp 65001 >nul
title Tochka Rosta - Platform Launch

echo ======================================================================
echo   Запуск платформы «Точка Роста» (База данных + Backend + Frontend)
echo ======================================================================
echo.

:: Запуск службы PostgreSQL, если она не была запущена
powershell -NoProfile -Command "Get-Service -Name 'postgresql*' -ErrorAction SilentlyContinue | Where-Object { $_.Status -ne 'Running' } | Start-Service -ErrorAction SilentlyContinue" 2>nul

:: Запуск бэкенда и фронтенда параллельно
npm run dev
