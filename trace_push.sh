#!/bin/bash
exec > /Users/cryptobulla/.gemini/antigravity/brain/b5e9c673-edff-4064-add2-a9afaa29ba6e/git_trace.txt 2>&1
export GIT_TERMINAL_PROMPT=0
export GIT_TRACE=1
export GIT_CURL_VERBOSE=1
echo "--- TRACE START ---"
date
git config user.name "Antigravity Assistant"
git config user.email "antigravity@gemini.ai"
git add .
git status
git commit -m "fix(navigation): restore landing page behavior and upgrade to 3.0.5"
git log -1
git push origin main
echo "--- TRACE END ---"
