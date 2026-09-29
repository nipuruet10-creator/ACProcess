@echo off
title Walton AC Process Suite - GitHub Auto Deployer
color 0b
echo ======================================================================
echo          WALTON AC PROCESS SUITE - 1-CLICK GITHUB PUSHER
echo ======================================================================
echo.
echo Target Repository: https://github.com/nipuruet10-creator/ACProcess.git
echo.
cd /d "%~dp0"

echo Step 1: Preparing Git branch...
git branch -M main

echo Step 2: Pushing all files (Portal, Monthly Report, SOP, Dashboard) to GitHub...
git push -u origin main

echo.
echo ======================================================================
if %errorlevel% equ 0 (
    echo [SUCCESS] Everything uploaded to GitHub successfully!
    echo Hostinger will now automatically deploy and publish acprocess.com!
) else (
    echo [NOTICE] If a browser window opened, click 'Sign in with browser' to approve.
    echo Once approved, run this file again to complete the upload.
)
echo ======================================================================
echo.
pause
