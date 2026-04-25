# Android Release Guide

This project is close to Play-ready, but you still need a real release keystore, a signed AAB, and the Play Console policy/compliance steps before uploading.

## 1. Confirm The Package Name

The app is currently configured as:

`com.ghassannabary.qadaa`

If you want to keep that package id, you do not need to change anything.

If you want a different final package id, update it consistently in:

- `/Users/ghassannabary/Projects/QadaaApp/app.json`
- `/Users/ghassannabary/Projects/QadaaApp/android/app/build.gradle`
- `/Users/ghassannabary/Projects/QadaaApp/android/app/src/main/java/com/ghassannabary/qadaa/`

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

You can copy the sample first:

```bash
cp /Users/ghassannabary/Projects/QadaaApp/android/key.properties.example \
  /Users/ghassannabary/Projects/QadaaApp/android/key.properties
```

Then fill it with:

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
- developer verification details if Play Console asks for them

## 7. Current Code-Side Release Prep Already Done

These are already improved in the repo:

- unnecessary Android storage/debug-style permissions removed
- release signing now fails fast without `android/key.properties`
- Android backup is disabled by default until data policy/storage decisions are final
- release keystore files are ignored by git
- sample `android/key.properties.example` is included

## 8. Still Not Automatically Finished

These still need your decision or account setup:

- release keystore creation
- Play Console listing and policy forms
- final production AAB test on device
- internal testing upload through Play Console
