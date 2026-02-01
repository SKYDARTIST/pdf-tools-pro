# Node.js Update & Android Sync Guide for Gemini

## Overview
You need to update Node.js from v20.19.0 to v22+ to run `npx cap sync android` and deploy the credit protection fixes to the Android app.

**Current Issue**: Capacitor CLI requires Node.js >=22.0.0
**Your Version**: v20.19.0
**Required**: v22.0.0 or higher

Follow each step carefully and **REPORT BACK** after completing each step.

---

## 🔴 STEP 1: Check Current Node.js Version

### Task
Verify the current Node.js version to confirm the issue.

### Command
```bash
node -v
```

### Expected Output
```
v20.19.0
```

### ✅ REPORT BACK:
- Current Node.js version: ___________
- Is it less than v22.0.0? (Yes/No): ___________

---

## 🔴 STEP 2: Check if NVM is Installed

### Task
Check if Node Version Manager (nvm) is available on the system. NVM makes it easy to switch Node.js versions.

### Command
```bash
nvm --version
```

### Expected Outcomes

**If NVM is installed**:
```
0.39.x (or similar version number)
```

**If NVM is NOT installed**:
```
command not found: nvm
```

### ✅ REPORT BACK:
- NVM installed? (Yes/No): ___________
- If Yes, version: ___________
- If No, proceed to Step 3a or 3b based on preference

---

## 🔴 STEP 3a: Install Node.js v22 Using NVM (Recommended)

**Only do this step if NVM is installed (from Step 2)**

### Task
Use NVM to install and activate Node.js v22 LTS.

### Commands
```bash
# Install Node.js v22 (latest LTS)
nvm install 22

# Use Node.js v22
nvm use 22

# Set as default (optional but recommended)
nvm alias default 22

# Verify the update
node -v
```

### Expected Output
```
Downloading and installing node v22.x.x...
Now using node v22.x.x
v22.x.x
```

### ✅ REPORT BACK:
- Install command output: [paste output]
- New Node.js version: ___________
- Is it v22 or higher? (Yes/No): ___________
- Any errors? (None / List errors): ___________

**If successful, SKIP Step 3b and go to Step 4**

---

## 🔴 STEP 3b: Install Node.js v22 Manually (Alternative)

**Only do this step if NVM is NOT installed (Step 2 said "command not found")**

### Task
Download and install Node.js v22 from the official website.

### Instructions

**For macOS**:
```bash
# Download Node.js v22 LTS using curl
curl -o ~/Downloads/node-v22-macos.pkg https://nodejs.org/dist/latest-v22.x/node-v22.*.pkg

# OR visit in browser:
# https://nodejs.org/en/download/
# Download: "macOS Installer (.pkg)" for LTS version
```

After downloading:
1. Open the `.pkg` file from Downloads
2. Follow the installer wizard
3. Click "Continue" → "Agree" → "Install"
4. Enter your password when prompted
5. Wait for installation to complete

**Verify Installation**:
```bash
# Close and reopen terminal, then:
node -v
```

### Expected Output
```
v22.x.x
```

### ✅ REPORT BACK:
- Download method used: (curl / browser): ___________
- Installation completed? (Yes/No): ___________
- New Node.js version: ___________
- Is it v22 or higher? (Yes/No): ___________
- Any errors during installation? (None / Describe): ___________

---

## 🔴 STEP 4: Verify NPM Version

### Task
Check that npm (Node Package Manager) was also updated. It comes bundled with Node.js.

### Command
```bash
npm -v
```

### Expected Output
```
10.x.x (or higher)
```

### ✅ REPORT BACK:
- NPM version: ___________
- Is it npm 10 or higher? (Yes/No): ___________

---

## 🔴 STEP 5: Navigate to Project Directory

### Task
Ensure you're in the correct project directory before running Capacitor commands.

### Command
```bash
cd /Users/cryptobulla/.gemini/antigravity/scratch/Projects/pdf-tools-pro

# Verify you're in the right place
pwd
ls package.json
```

### Expected Output
```
/Users/cryptobulla/.gemini/antigravity/scratch/Projects/pdf-tools-pro
package.json
```

### ✅ REPORT BACK:
- Current directory: ___________
- package.json exists? (Yes/No): ___________

---

## 🔴 STEP 6: Clear NPM Cache (Precaution)

### Task
Clear the npm cache to avoid any package conflicts with the new Node.js version.

### Command
```bash
npm cache clean --force
```

### Expected Output
```
npm WARN using --force Recommended protections disabled.
```

### ✅ REPORT BACK:
- Cache cleared successfully? (Yes/No): ___________
- Any errors? (None / List errors): ___________

---

## 🔴 STEP 7: Sync Web Build to Android

### Task
Run Capacitor sync to copy the web build (with credit protection fixes) to the Android native project.

### Command
```bash
npx cap sync android
```

### Expected Output (Success)
```
✔ Copying web assets from dist to android/app/src/main/assets/public in 1.23s
✔ Creating capacitor.config.json in android/app/src/main/assets in 2.34ms
✔ copy android in 1.45s
✔ Updating Android plugins in 123.45ms
✔ update android in 234.56ms
✔ Syncing Gradle in 3.45s
✔ sync finished in 5.67s
```

### Possible Errors

**Error 1: "Capacitor CLI requires Node.js >=22.0.0"**
- **Solution**: Go back to Step 1 and verify Node.js was updated correctly
- Run `node -v` again

**Error 2: "Android project not found"**
- **Solution**: Run `npx cap add android` first, then retry sync

**Error 3: "Gradle build failed"**
- **Solution**: This is okay for now - the sync still copied files
- Report the error but proceed

### ✅ REPORT BACK:
- Command output: [paste full output]
- Sync completed successfully? (Yes/No): ___________
- Time taken: ___________
- Any errors or warnings? (None / List): ___________

---

## 🔴 STEP 8: Verify Android Directory Updated

### Task
Check that the Android project received the updated web assets.

### Commands
```bash
# Check that web assets were copied
ls -lh android/app/src/main/assets/public/assets/index-*.js | head -1

# Check modification time (should be recent)
stat -f "%Sm" android/app/src/main/assets/public/index.html
```

### Expected Output
```
-rw-r--r--  1 user  staff  341K Feb  1 11:30 android/app/src/main/assets/public/assets/index-DIMZ_7Hv.js
Feb  1 11:30:45 2026
```

### ✅ REPORT BACK:
- Assets folder exists? (Yes/No): ___________
- Files have recent timestamp? (Yes/No): ___________
- Approximate file count in public/assets: ___________

---

## 🔴 STEP 9: (Optional) Open in Android Studio

### Task
Open the Android project in Android Studio to build and test on emulator/device.

**Only do this if**:
- Android Studio is installed
- You want to test immediately
- You have an emulator or physical device

### Command
```bash
npx cap open android
```

### Expected Behavior
- Android Studio launches
- Project opens at `pdf-tools-pro/android/`
- Gradle sync starts automatically

### ✅ REPORT BACK:
- Did you run this step? (Yes/No): ___________
- Android Studio opened? (Yes/No/Not Installed): ___________
- Gradle sync successful? (Yes/No/Skipped): ___________

---

## 🎯 FINAL VERIFICATION

### Checklist

Complete this checklist to confirm everything is ready:

- [ ] Node.js updated to v22 or higher
- [ ] NPM version is 10 or higher
- [ ] `npx cap sync android` completed without critical errors
- [ ] Android assets folder populated with recent files
- [ ] Ready to test on Android device/emulator

### ✅ FINAL REPORT:

```
Node.js Update & Android Sync - Final Status

Node.js Version: ___________
NPM Version: ___________
Capacitor Sync: [SUCCESS / PARTIAL / FAILED]

Android Project Status:
- Assets copied: [YES / NO]
- Last modified: ___________
- Ready for testing: [YES / NO]

Issues Encountered:
- [None / List any issues]

Next Steps:
- [ ] Test on Android emulator
- [ ] Test on physical device
- [ ] Run manual tests (VERIFICATION_REPORT.md)

Overall Status: [COMPLETE / BLOCKED]
If blocked, reason: ___________
```

---

## 🆘 TROUBLESHOOTING

### Problem: "nvm: command not found"
**Solution**: NVM not installed. Use Step 3b (manual install) instead.

### Problem: Node.js still shows v20 after update
**Solution**:
1. Close and reopen terminal
2. If using NVM: `nvm use 22`
3. Verify: `node -v`

### Problem: "Permission denied" during npm install
**Solution**:
```bash
# Fix npm permissions (macOS/Linux)
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules
```

### Problem: Capacitor sync fails with "Cannot find module"
**Solution**:
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
npx cap sync android
```

### Problem: Android folder doesn't exist
**Solution**:
```bash
# Add Android platform
npx cap add android
npx cap sync android
```

### Problem: Gradle build errors during sync
**Solution**: Usually safe to ignore if assets were copied. Check Step 8 to verify files exist.

---

## 📝 TESTING AFTER SYNC

After successful sync, you should test the credit protection fixes on Android:

### Test 1: Successful AI Request
1. Open app on Android
2. Make AI request (e.g., Ask AI in Reader)
3. **Expected**: Credit deducted, result shown

### Test 2: Network Failure
1. Turn off WiFi and mobile data
2. Try AI request
3. **Expected**: Error shown, credit NOT deducted

### Test 3: Uninstall Recovery
1. Note current credits
2. Uninstall app from device
3. Reinstall app
4. Login with same Google account
5. **Expected**: Credits restored

See full testing instructions in `VERIFICATION_REPORT.md`

---

## ✅ SUCCESS CRITERIA

You're done when:
- ✅ Node.js is v22 or higher
- ✅ `npx cap sync android` completes successfully
- ✅ Android assets folder has recent timestamp
- ✅ No critical errors reported
- ✅ Ready to test on device

---

**Good luck! Report back after each step.**
