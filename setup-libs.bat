@echo off
title Setup Local Libraries - Offroad Motorcycle

echo ========================================
echo  Mengunduh dan menyiapkan library lokal
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] Menjalankan npm install...
npm install

if %ERRORLEVEL% neq 0 (
    echo.
    echo Gagal menjalankan npm install. Pastikan Node.js sudah terinstall.
    pause
    exit /b
)

echo.
echo [2/3] Menyalin Three.js dan Cannon-es ke public\lib\...

if not exist "public\lib" mkdir "public\lib"

copy "node_modules\three\build\three.module.js" "public\lib\three.module.js" >nul
copy "node_modules\cannon-es\dist\cannon-es.js" "public\lib\cannon-es.js" >nul

if exist "public\lib\three.module.js" (
    echo   [OK] three.module.js tersalin
) else (
    echo   [GAGAL] three.module.js tidak ditemukan
)

if exist "public\lib\cannon-es.js" (
    echo   [OK] cannon-es.js tersalin
) else (
    echo   [GAGAL] cannon-es.js tidak ditemukan
)

echo.
echo [3/3] Selesai!
echo.
echo Sekarang jalankan server dengan: npm start
echo Lalu buka browser: http://localhost:3000
echo.
pause
