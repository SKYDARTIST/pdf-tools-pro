# Android Build Fix Guide - Clean Rebuild

## Status Check ✅

### Issue 1: Kotlin Coroutines Missing
**Status**: ✅ **ALREADY FIXED** in `android/app/build.gradle`

Lines 30-34 already have the correct Kotlin version forcing:
```gradle
configurations.all {
    exclude group: 'org.jetbrains.kotlin', module: 'kotlin-stdlib-jdk7'
    exclude group: 'org.jetbrains.kotlin', module: 'kotlin-stdlib-jdk8'
    resolutionStrategy {
        force 'org.jetbrains.kotlin:kotlin-stdlib:1.9.22'
        force 'org.jetbrains.kotlinx:kotlinx-coroutines-core:1.8.1'
        force 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1'
    }
}
```

### Issue 2: Play Integrity Null Pointer
**Status**: ✅ **ALREADY FIXED** in Play Integrity plugin

The plugin in `node_modules/@capacitor-community/play-integrity` has proper null safety:
```java
Long projectNumberObj = call.getLong("googleCloudProjectNumber");
long googleCloudProjectNumber = projectNumberObj != null ? projectNumberObj : 0L;
```

The error logs were from a previous version. The current version is correct.

---

## Problem: Why Are You Still Getting Errors?

The errors in your crash logs are from **cached compiled classes** from the previous build. When Gradle compiled the old version, it cached those class files. Even though the source code is now fixed, the old compiled classes are being used.

---

## Solution: Clean Rebuild

Follow these steps to clear all caches and rebuild:

### Step 1: Clean npm and Gradle Caches
```bash
cd /Users/cryptobulla/BUILD/pdf-tools-pro

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Gradle cache (THIS IS CRITICAL)
cd android
rm -rf .gradle
rm -rf app/build
cd ..
```

### Step 2: Rebuild Capacitor
```bash
# Rebuild the native bindings
npx cap sync android
```

This will regenerate the platform-specific code and ensure all plugins are synced correctly.

### Step 3: Build Android APK
```bash
# Option A: If using Android Studio
# 1. Open Android Studio
# 2. Click "Build" > "Clean Project"
# 3. Click "Build" > "Build Bundle(s) / APK(s)" > "Build APK(s)"

# Option B: Via terminal
cd android
./gradlew clean
./gradlew build
```

### Step 4: Run on Android Device/Emulator
```bash
npx cap run android
```

---

## Why This Fixes It

1. **npm install**: Gets fresh copies of all packages including Play Integrity plugin
2. **rm -rf android/.gradle**: Forces Gradle to regenerate the build cache from scratch
3. **rm -rf android/app/build**: Removes old compiled class files (the real culprit)
4. **npx cap sync android**: Regenerates Java bindings and syncs plugin sources
5. **./gradlew clean**: Final cache clear before build

---

## Expected Result After These Steps

✅ Kotlin coroutines will resolve correctly (uses forced v1.9.22)
✅ Play Integrity plugin will compile with proper null safety
✅ App will start without native crashes
✅ AuthModal will appear when clicking AI features
✅ Google Sign In will work correctly

---

## If You Still Get Errors

If you're still seeing crashes after these steps:

1. **Verify Android SDK is installed**:
   ```bash
   android list sdk
   ```
   Should have API 34+ and build-tools 34+

2. **Check Java version**:
   ```bash
   java -version
   ```
   Should be Java 17+ (the build.gradle specifies VERSION_21)

3. **Check Gradle wrapper version**:
   ```bash
   cd android && ./gradlew --version
   ```
   Capacitor 8 requires Gradle 8.1+

4. **Force offline mode off**:
   If Gradle is set to offline mode, clear it:
   ```bash
   ./gradlew --rerun-tasks
   ```

---

## Verification Checklist

After rebuild, verify:

- [ ] App launches without crashing
- [ ] Kotlin NoClassDefFoundError is gone
- [ ] Play Integrity NullPointerException is gone
- [ ] AuthModal appears when clicking AI features
- [ ] Google Sign In button works
- [ ] Successful login shows "Subscription: ✅ Restored state from Supabase"

---

## Next Steps After Successful Build

1. Test Google Auth flow end-to-end on device
2. Verify credits sync to Supabase
3. Test AI feature usage and credit deduction
4. Build release APK for Play Store submission
