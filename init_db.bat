@echo off
title Hanh Trinh Hy Vọng 2026 - Khoi Tao Database
echo =====================================================================
echo    SITIGROUP - HANH TRINH HY VONG 2026 - KHOI TAO CSDL TOAN CAU
echo =====================================================================
echo.

:: Check if curl is installed
where curl >nul 2>&1
if %errorlevel% neq 0 (
    echo [Loi] Khong tim thay cong cu curl tren may cua ban.
    echo Vui long mo trinh duyet va truy cap: https://kvdb.io
    pause
    exit /b
)

echo [*] Dang gui yeu cau khoi tao Bucket moi len kvdb.io...
for /f "delims=" %%i in ('curl -s -d "email=siti_hope_2026@fptu.edu.vn" https://kvdb.io') do set BUCKET_ID=%%i

if "%BUCKET_ID%"=="" (
    echo [Loi] Khong the ket noi den may chu kvdb.io de tao Bucket.
    pause
    exit /b
)

echo [+] Da khoi tao thanh cong Bucket ID tren kvdb.io: %BUCKET_ID%
echo [*] Dang dang ky Bucket ID nay len cong trung gian keyvalue.immanuel.co...

curl -s -X POST "https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/sitihope/bucket_id/%BUCKET_ID%" >nul

echo.
echo =====================================================================
echo    KHOI TAO DATABASE PHAN PHOI HOAN TAT!
echo    * Ke tu bay gio, tat ca cac may tinh, dien thoai cua nguoi dung
echo      khi truy cap trang web cua ban se tu dong chia se chung
echo      Bucket ID nay va nhin thay thong diep cua nhau!
echo    * Dia chi Web CSDL: https://kvdb.io/%BUCKET_ID%/messages
echo =====================================================================
echo.
pause
