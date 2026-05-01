#!/bin/sh
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
IOS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_DIR="$(cd "$IOS_DIR/.." && pwd)"

cd "$REPO_DIR"

if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

cd "$IOS_DIR"
pod install
