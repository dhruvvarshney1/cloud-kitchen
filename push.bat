@echo off
REM Automated Git Push Script
REM Usage: push.bat

echo Adding all files to staging...
git add .

echo Committing with timestamp...
for /f "tokens=1-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)
for /f "tokens=1-2 delims=: " %%a in ('time /t') do (set mytime=%%a:%%b)
git commit -m "Automated commit: %mydate% %mytime%"

echo Pushing to remote...
git push

echo.
echo Done!
