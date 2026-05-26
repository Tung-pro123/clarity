@echo off
title Hanh Trinh Hy Vong 2026 - Push to GitHub
echo =====================================================================
echo    SITIGROUP - HANH TRINH HY VONG 2026 - DAY MA NGUON LEN GITHUB
echo =====================================================================
echo.

:: Check if git is installed
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo [Loi] Khong tim thay Git tren may tinh cua ban.
    echo Vui long tai va cai dat Git tai: https://git-scm.com/
    pause
    exit /b
)

echo [*] Dang khoi tao kho luu tru Git (git init)...
git init

echo [*] Dang ghep tat ca cac tap tin (git add)...
git add .

echo [*] Dang tao phien ban cam ket (git commit)...
git commit -m "Initial commit - Hanh Trinh Hy Vong 2026 - Thau Sao Det Sang"

echo [*] Dang chuyen sang nhanh chinh (git branch main)...
git branch -M main

echo [*] Dang thiet lap kho luu tru tu xa (git remote origin)...
git remote remove origin >nul 2>&1
git remote add origin https://github.com/Tung-pro123/clarity.git

echo.
echo =====================================================================
echo    BAT DAU PUSH DULIEU LEN GITHUB (git push)
echo    * Neu day la lan dau, trinh duyet co the hien thi bang dang nhap
echo      de ban xac thuc tai khoan GitHub cua minh.
echo =====================================================================
echo.

git push -u origin main

echo.
if %errorlevel% equ 0 (
    echo [Thanh cong] Ma nguon da duoc dua len Github tai:
    echo https://github.com/Tung-pro123/clarity.git
) else (
    echo [Loi] Co loi xay ra khi push. Vui long kiem tra lai quyen truy cap
    echo hoac xac thuc tai khoan GitHub cua ban tren trinh duyet.
)
echo.
pause
