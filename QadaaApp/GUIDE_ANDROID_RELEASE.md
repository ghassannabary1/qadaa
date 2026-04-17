# Android Release Build Guide

## 📋 Step-by-Step Instructions

### Step 1: Create Keystore (Required for Google Play)

```bash
cd /Users/ghassannabary/Projects/android
keytool -genkey -v \
  -keystore qadaa-release-key.jks \
  -alias qadaa-release \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

**When prompted:**
- **First and Last Name:** Your name or company name
- **Organization:** Your organization (optional)
- **Organizational Unit:** Your department (optional)
- **City/Locality:** Your city
- **State/Province:** Your state
- **Country:** US (or your country code)

**⚠️ IMPORTANT:**
- Save the keystore file (`qadaa-release-key.jks`) securely!
- Never share it publicly
- Keep the password safe
- If you lose it, you can't update the app on Google Play

### Step 2: Enter Keystore Password

Choose a strong password (mix of letters, numbers, symbols):
- Example: `QadaaRelease2026!`
- Remember it - you'll need it to build and update the app

### Step 3: Build the APK

```bash
./build-apk.sh
```

The script will:
1. Find your keystore
2. Sign the release build
3. Create the APK file
4. Output the location

### Step 4: Install on Device (for testing)

```bash
# Connect your Android device via USB
adb install app/release/com.anonymous.qadaa-release.apk
```

### Step 5: Submit to Google Play

1. Download **Google Play Console** (https://play.google.com/console)
2. Create a developer account ($25 one-time fee)
3. Upload the APK/AAB from the build directory
4. Fill out app store listing
5. Submit for review

## 🎯 Build Outputs

After building, you'll find:

```
android/app/build/outputs/apk/release/
├── com.anonymous.qadaa-release.apk    # Full APK (for internal testing)
└── com.anonymous.qadaa-release-unaligned.apk
```

## 📱 AAB vs APK

- **APK:** Android Package Kit (for internal testing, alpha/beta)
- **AAB:** Android App Bundle (required for Google Play Store)

The build script will create the AAB for Google Play submission.

## 🔒 Security Tips

1. **Backup keystore:** Copy `.jks` file to external drive/encrypted cloud
2. **Password security:** Store in password manager, not plain text
3. **Never commit keystore:** Add `.jks` to `.gitignore`
4. **Generate new key:** Only if you're rebuilding from scratch

## 🚀 Quick Start

1. Run the keystore creation command above
2. Enter your information
3. Run `./build-apk.sh`
4. Test on your device
5. Submit to Google Play!

## 📞 Need Help?

Common issues:
- "Keystore not found" → Run step 1 first
- "Build failed" → Check Android SDK is installed
- "Signing error" → Verify keystore password

---

The script will guide you through the process. Just run:

```bash
./build-apk.sh
```

It will create everything needed! 🚀
