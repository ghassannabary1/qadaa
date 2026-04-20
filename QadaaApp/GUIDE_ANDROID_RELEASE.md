# Android Release Guide

This project is close to Play-ready, but you still need a real package name and a real release keystore before uploading.

## 1. Choose Your Final Package Name

Right now the app still uses:

`com.ghassannabary.qadaa`

Before Google Play upload, replace it with your final package id in:

- `/Users/ghassannabary/Projects/QadaaApp/app.json`
- `/Users/ghassannabary/Projects/QadaaApp/android/app/build.gradle`

Example:

`com.ghassannabary.qadaa`

## 2. Create a Release Keystore

Run this from the project root:

```bash
cd /Users/ghassannabary/Projects/QadaaApp/android
keytool -genkey -v \
  -keystore qadaa-release-key.jks \
  -alias qadaa-release \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

Keep the `.jks` file and passwords safe. If you lose them, you cannot update the Play Store app later.

## 3. Create `android/key.properties`

Create:

`/Users/ghassannabary/Projects/QadaaApp/android/key.properties`

With:

```properties
storeFile=qadaa-release-key.jks
storePassword=YOUR_STORE_PASSWORD
keyAlias=qadaa-release
keyPassword=YOUR_KEY_PASSWORD
```

This file is gitignored.

## 4. Build a Release AAB

From the project root:

```bash
cd /Users/ghassannabary/Projects/QadaaApp/android
./gradlew bundleRelease
```

Output:

`/Users/ghassannabary/Projects/QadaaApp/android/app/build/outputs/bundle/release/app-release.aab`

For device testing APK:

```bash
./gradlew assembleRelease
```

Output:

`/Users/ghassannabary/Projects/QadaaApp/android/app/build/outputs/apk/release/app-release.apk`

## 5. Test the Release Build

Install the APK on a real Android phone and verify:

- onboarding
- Arabic and English
- prayer counting
- fasting tracking
- notification scheduling
- external links
- app icon and splash

## 6. Prepare Play Console Requirements

Before upload, prepare:

- app name
- short description
- full description
- icon
- feature graphic
- screenshots
- privacy policy URL
- data safety answers
- support email

## 7. Current Code-Side Release Prep Already Done

These are already improved in the repo:

- unnecessary Android storage permissions removed
- release signing config now supports `android/key.properties`
- release keystore files are ignored by git

## 8. Still Not Automatically Finished

These still need your decision or account setup:

- final Android package name
- release keystore creation
- Play Console listing and policy forms
- final production AAB test on device
