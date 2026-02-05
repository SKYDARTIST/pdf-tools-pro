---
description: how to release a new version of Anti-Gravity
---
1. Update version name and code in `android/app/build.gradle`.
2. Run `npm run build && npx cap sync android` to synchronize web assets.
3. Open Android Studio.
4. Go to `Build` -> `Generate Signed Bundle / APK...`.
5. Select `Android App Bundle` and use your release keystore.
6. Upload the resulting `.aab` file to the Google Play Console under `Production`.
7. Update the `What's New` section with the latest changes.
8. Submit the release for review.
