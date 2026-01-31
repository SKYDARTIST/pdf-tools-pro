# Android Native Fixes - Guide for Gemini

## Current Situation

The Android build is failing with **Kotlin metadata parsing errors in R8/D8 compiler**. This is a Kotlin version compatibility issue, not a source code issue.

The error:
```
WARNING: D8: An error occurred when parsing kotlin metadata. This normally happens when using a newer version of kotlin than the kotlin version released when this version of R8 was created.
```

**Root Cause**: R8 compiler in AGP 8.7.2 doesn't fully support Kotlin 1.9.22 metadata format.

---

## What You Need To Do (For Gemini)

### Step 1: Downgrade Kotlin Version (FIX THE ROOT CAUSE)

Tell Gemini to modify `android/app/build.gradle`:

**Find this line (around line 31)**:
```gradle
force 'org.jetbrains.kotlin:kotlin-stdlib:1.9.22'
```

**Change it to**:
```gradle
force 'org.jetbrains.kotlin:kotlin-stdlib:1.9.20'
```

Also update the coroutines line (around line 32):
```gradle
force 'org.jetbrains.kotlinx:kotlinx-coroutines-core:1.8.0'
force 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.0'
```

**Why**: Kotlin 1.9.20 is fully compatible with R8 8.7.18 (the compiler in AGP 8.7.2). Kotlin 1.9.22 has metadata format changes that R8 8.7.18 doesn't understand.

---

### Step 2: Clear All Gradle/npm Caches

```bash
cd /Users/cryptobulla/BUILD/pdf-tools-pro

# Clear npm cache
rm -rf node_modules package-lock.json
npm install

# Clear Gradle cache
cd android
rm -rf .gradle
rm -rf app/build
cd ..
```

---

### Step 3: Sync Capacitor

```bash
npx cap sync android
```

---

### Step 4: Build Android

```bash
cd android
./gradlew clean build
cd ..
```

---

### Step 5: Test on Device/Emulator

```bash
npx cap run android
```

---

## Expected Results

After these steps:

✅ **Build succeeds without R8 Kotlin metadata errors**
✅ **App launches without crashing**
✅ **AuthModal appears when clicking AI features**
✅ **Google Sign In works end-to-end**
✅ **Subscription syncs from Supabase**

---

## What You Should Tell Gemini

> "The Android build is failing because R8 8.7.18 (in AGP 8.7.2) doesn't support Kotlin 1.9.22's metadata format. We need to downgrade Kotlin to 1.9.20 which is fully compatible.
>
> **Step 1: Edit `android/app/build.gradle`**
> - Find the line: `force 'org.jetbrains.kotlin:kotlin-stdlib:1.9.22'`
> - Change to: `force 'org.jetbrains.kotlin:kotlin-stdlib:1.9.20'`
> - Also update coroutines to 1.8.0:
>   ```
>   force 'org.jetbrains.kotlinx:kotlinx-coroutines-core:1.8.0'
>   force 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.0'
>   ```
>
> **Step 2: Run these commands**:
> 1. `rm -rf node_modules package-lock.json && npm install`
> 2. `cd android && rm -rf .gradle app/build && cd ..`
> 3. `npx cap sync android`
> 4. `cd android && ./gradlew clean build && cd ..`
> 5. `npx cap run android`
>
> The issue is not with the source code - it's a compiler compatibility problem. Downgrading Kotlin to 1.9.20 fixes it while maintaining all functionality."

---

## Key Points

- ✅ **DO** modify `android/app/build.gradle` - change Kotlin from 1.9.22 to 1.9.20
- ✅ **DO** update coroutines to 1.8.0 for Kotlin 1.9.20 compatibility
- ❌ **DO NOT** make any other code changes
- ✅ **DO** clear the Gradle cache completely
- ✅ **DO** run `npm install` fresh
- ✅ **DO** run `npx cap sync android`

---

## After Successful Build

Once the app launches without crashing:

1. Test clicking an AI feature (like Workspace)
2. Verify AuthModal appears with "Sign In to Use AI Features"
3. Click Google Sign In
4. Verify successful login shows console logs:
   - "Anti-Gravity Integrity: ✅ Real Token Generated"
   - "Anti-Gravity Auth: Secure session established"
   - "Anti-Gravity Subscription: ✅ Restored state from Supabase"
5. Verify credits and subscription display correctly
6. Test using an AI feature to deduct credits

That's it! The rest should work as implemented.
