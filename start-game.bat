@echo off
title Offroad Motorcycle Trail Adventure

echo ========================================
echo  Offroad Motorcycle Trail Adventure
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] Mengecek dependensi...
if not exist "node_modules" (
    echo Menginstall paket via npm...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo.
        echo Gagal install dependensi. Pastikan Node.js terinstall.
        pause
        exit /b
    )
)

echo [2/3] Mengecek library Three.js & Cannon-es...
if not exist "public\lib" mkdir "public\lib"

if not exist "public\lib\three.module.js" (
    if exist "node_modules\three\build\three.module.js" (
        copy "node_modules\three\build\three.module.js" "public\lib\three.module.js" >nul
    )
)

if not exist "public\lib\cannon-es.js" (
    if exist "node_modules\cannon-es\dist\cannon-es.js" (
        copy "node_modules\cannon-es\dist\cannon-es.js" "public\lib\cannon-es.js" >nul
    )
)

echo [3/3] Menyalakan server di http://localhost:3000 ...
echo.
echo Silakan buka browser Anda di: http://localhost:3000
echo Klik tombol "KLIK UNTUK MEMULAI" atau tekan Spasi/Enter.
echo.
echo (Tekan Ctrl+C di terminal ini jika ingin menghentikan server)
echo ========================================
echo.

call npm start
pause
