@echo off
REM Torre Tempo - Commit Profile Fix and Deploy
REM This script commits ONLY the profile navigation fix

echo ========================================
echo Torre Tempo - Profile Fix Commit
echo ========================================
echo.

REM Check if we're in the right directory
if not exist apps\web\src\components\layout\TopNav.tsx (
    echo [ERROR] Not in Torre Tempo directory
    echo Please run this script from the project root
    pause
    exit /b 1
)

echo [1/5] Checking what files will be committed...
echo.
echo Files to commit:
echo   - apps/web/src/components/layout/TopNav.tsx (FIXED)
echo   - PROFILE_COMPLETE_SUMMARY.md (NEW)
echo   - PROFILE_FIX_DEPLOYMENT.md (NEW)
echo   - deploy-profile-fix.sh (NEW)
echo   - commit-and-deploy.bat (NEW)
echo.

echo [2/5] Showing TopNav.tsx changes...
git diff apps\web\src\components\layout\TopNav.tsx
echo.

pause
echo.

echo [3/5] Staging files...
git add apps\web\src\components\layout\TopNav.tsx
git add PROFILE_COMPLETE_SUMMARY.md
git add PROFILE_FIX_DEPLOYMENT.md
git add deploy-profile-fix.sh
git add commit-and-deploy.bat
echo [OK] Files staged
echo.

echo [4/5] Creating commit...
git commit -m "fix: correct Profile menu navigation from /app/settings to /app/profile" -m "The Profile button in the user menu dropdown was incorrectly navigating to /app/settings instead of /app/profile." -m "" -m "Changes:" -m "- TopNav.tsx line 158: navigate('/app/settings') -> navigate('/app/profile')" -m "- TopNav.tsx line 165: 'Profile' -> {t('profile.title')} (i18n)" -m "" -m "Documentation added:" -m "- PROFILE_COMPLETE_SUMMARY.md - Complete analysis" -m "- PROFILE_FIX_DEPLOYMENT.md - Deployment guide" -m "- deploy-profile-fix.sh - Automated deployment"
echo.

if %ERRORLEVEL% EQU 0 (
    echo [OK] Commit created successfully
    echo.
    echo [5/5] Showing commit...
    git log --oneline -1
    echo.
    git show --stat HEAD
    echo.
    echo ========================================
    echo Commit Complete!
    echo ========================================
    echo.
    echo ** READY TO PUSH AND DEPLOY **
    echo.
    echo Next Steps:
    echo.
    echo 1. Push to GitHub:
    echo    git push origin main
    echo.
    echo 2. SSH into your VPS:
    echo    ssh user@your-vps-ip
    echo.
    echo 3. Deploy the fix:
    echo    cd /opt/torre-tempo
    echo    ./deploy-profile-fix.sh
    echo.
    echo    OR use existing deploy script:
    echo    ./deploy-quick.sh
    echo.
    echo 4. Test the fix:
    echo    a. Visit: https://time.lsltgroup.es
    echo    b. Click your avatar ^(top-right^)
    echo    c. Click "Profile" in dropdown
    echo    d. Verify: You're on /app/profile page
    echo.
    echo Documentation:
    echo - PROFILE_COMPLETE_SUMMARY.md - Full analysis ^& fix
    echo - PROFILE_FIX_DEPLOYMENT.md - Deployment details
    echo.
) else (
    echo [ERROR] Commit failed
    echo.
    echo This might happen if:
    echo - No changes to commit ^(already committed^)
    echo - Git user.name or user.email not configured
    echo.
    echo To configure git:
    echo   git config user.name "Your Name"
    echo   git config user.email "your@email.com"
)

pause
