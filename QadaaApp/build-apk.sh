#!/bin/bash

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
ANDROID_DIR="$PROJECT_DIR/android"
KEY_PROPERTIES_FILE="$ANDROID_DIR/key.properties"
APP_BUNDLE_PATH="$ANDROID_DIR/app/build/outputs/bundle/release/app-release.aab"
APK_PATH="$ANDROID_DIR/app/build/outputs/apk/release/app-release.apk"

echo "Building Android release artifacts for Qadaa"
echo ""

if [ ! -f "$KEY_PROPERTIES_FILE" ]; then
  echo "Missing $KEY_PROPERTIES_FILE"
  echo ""
  echo "Create it with:"
  echo "storeFile=qadaa-release-key.jks"
  echo "storePassword=YOUR_STORE_PASSWORD"
  echo "keyAlias=qadaa-release"
  echo "keyPassword=YOUR_KEY_PASSWORD"
  exit 1
fi

cd "$ANDROID_DIR"

echo "Cleaning previous build artifacts..."
./gradlew clean

echo ""
echo "Building Play Store bundle (.aab)..."
./gradlew bundleRelease

echo ""
echo "Building release APK for device testing..."
./gradlew assembleRelease

echo ""
echo "Done."
echo ""
echo "AAB:"
echo "  $APP_BUNDLE_PATH"
echo ""
echo "APK:"
echo "  $APK_PATH"

