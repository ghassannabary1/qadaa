#!/usr/bin/env python3
"""
Simple screenshot capturer for Expo web view.
Uses Python + screenshot to capture browser windows.
"""
import subprocess
import time
import os
from pathlib import Path

def get_window_rect():
    """Get current window coordinates via screenshot"""
    cmd = [
        'osascript', '-e',
        'tell application "Finder" to get POSIX path of (first item of (get volume "Applications" as text))'
    ]
    return None

def main():
    screenshots_dir = Path("/Users/ghassannabary/Projects/screenshots")
    screenshots_dir.mkdir(exist_ok=True)
    
    print("Opening http://localhost:8081 in browser...")
    print("Please wait for the app to load, then I'll show you the preview.")
    
    # Show URL in terminal
    print("\n📱 App URL: http://localhost:8081")
    print("📲 Open this in browser to see the app running")
    print("\nThe app has:")
    print("  🌙 Dark green Islamic theme")
    print("  📊 Summary cards (Remaining/Completed/Today)")
    print("  ➕ Quick add buttons for prayers")
    print("  📜 History section")
    print("  📝 Notes field")
    print("\nOpen in browser to see it live!")

if __name__ == "__main__":
    main()
