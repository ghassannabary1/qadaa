#!/bin/bash
#
# Build Android APK/AAB for Qadaa
# This script creates a release build ready for Google Play Store
#

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
ANDROID_DIR="$PROJECT_DIR/android"

echo "🚀 Building Qadaa for Android..."
echo "========================================="
echo ""

# Check if keystore exists
KEYSTORE_FILE="$ANDROID_DIR/qadaa-release-key.jks"

if [ ! -f "$KEYSTORE_FILE" ]; then
    echo "⚠️  No keystore found! You need to create one first."
    echo ""
    echo "To create a keystore:"
    echo "  keytool -genkey -v -keystore $ANDROID_DIR/qadaa-release-key.jks"
    echo "  -alias qadaa-release -keyalg RSA -keysize 2048 -validity 10000"
    echo ""
    echo "Enter your name, email, organization when prompted."
    echo "Store this .jks file securely and backup it!"
    echo ""
    echo "Press Ctrl+C to cancel, or continue with a debug build for testing."
    exit 1
fi

# Store password from file
KEYSTORE_PASS=$(cat "$ANDROID_DIR/key.properties" | grep storePassword | cut -d'=' -f2)
KEY_ALIAS=$(cat "$ANDROID_DIR/key.properties" | grep keyAlias | cut -d'=' -f2)

echo "🔑 Keystore found: $KEYSTORE_FILE"
echo "📦 Building release build..."
echo ""

# Build command (requires keystore)
cd "$ANDROID_DIR"
./gradlew assembleRelease -PkeyAlias=$KEY_ALIAS -PkeyPassword=$(cat "$ANDROID_DIR/key.properties" | grep keyPassword | cut -d'=' -f2) -PstorePassword=$KEYSTORE_PASS -PstoreFile=$KEYSTORE_FILE

echo ""
echo "✅ Build complete!"
echo ""
echo "APK location:"
ls -lh "$ANDROID_DIR/app/build/outputs/apk/release/"

echo ""
echo "To install on device:"
echo "  adb install <path-to-apk>"
