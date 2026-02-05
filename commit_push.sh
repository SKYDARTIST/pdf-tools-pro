#!/bin/bash
set -x
git add src/screens/LandingPage.tsx >> git_log.txt 2>&1
git commit -m "fix(navigation): remove auto-redirect from landing page to allow manual workspace launch" >> git_log.txt 2>&1
git push >> git_log.txt 2>&1
git log -1 >> git_log.txt 2>&1
