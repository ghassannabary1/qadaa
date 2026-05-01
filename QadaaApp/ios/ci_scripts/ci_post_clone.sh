#!/bin/sh
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
IOS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_DIR="$(cd "$IOS_DIR/.." && pwd)"

cd "$REPO_DIR"

if ! command -v npm >/dev/null 2>&1; then
  if ! command -v brew >/dev/null 2>&1; then
    echo "npm is required to install JavaScript dependencies, but neither npm nor Homebrew is available."
    exit 1
  fi

  brew install node@20
  export PATH="$(brew --prefix node@20)/bin:$PATH"
fi

if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

cd "$IOS_DIR"
pod install
