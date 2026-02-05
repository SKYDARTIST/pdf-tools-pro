#!/bin/bash
exec > debug_git.txt 2>&1
echo "--- NEW RUN ---"
date
pwd
git --version
git status
echo "--- ADDING FILES ---"
git add src/screens/LandingPage.tsx package.json android/app/build.gradle
echo "--- STATUS AFTER ADD ---"
git status
echo "--- COMMITTING ---"
git commit -m "fix(navigation): restore landing page on start and bump version to 3.0.5"
echo "--- LOG AFTER COMMIT ---"
git log -1 --oneline
echo "--- PUSHING ---"
git push origin main
echo "--- FINAL STATUS ---"
git log -1 --oneline
git rev-parse HEAD
