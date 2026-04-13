# Qadaa - Release Notes

## Version 1.1.0 - Production Ready

### 🎉 What's New

#### Data Backup & Sync
- ✅ **Automatic iCloud backup** (iOS) - syncs automatically every 30 seconds
- ✅ **Auto-save to device storage** (iOS & Android) - always up to date
- ✅ **Manual export/import** - share with friends, family, or backup manually
- ✅ **Backup status indicator** - shows "Auto-backup: Enabled" on home screen
- ✅ **No cloud API dependencies** - simple, secure, no server costs

#### Accessibility
- ✅ ARIA labels on all buttons for screen readers
- ✅ Arabic labels on all UI elements
- ✅ Proper semantic markup for all interactive elements

#### Data Safety
- ✅ UTC time format for consistency across devices
- ✅ Input validation with graceful fallback
- ✅ Data persists after app uninstall
- ✅ Automatic backup on app close

### 🛠️ Technical Improvements

- Input validation with non-numeric handling
- Time format standardized to UTC
- Auto-backup interval: 30 seconds (configurable)
- Backup stored in AsyncStorage with iCloud sync (iOS)

### 📱 How to Backup

#### Automatic Backup (Default)
Your data auto-saves to:
- iCloud Drive (iOS users)
- Device storage (both platforms)
- No action needed!

#### Manual Export
1. Tap "Export Backup" button
2. Save file to Photos, Drive, or email
3. Share with anyone who needs it

#### Manual Import
1. Tap "Import Backup" button
2. Select a backup file
3. Your data will be restored

### 🔒 Security & Privacy

- All data stored locally on device
- No cloud servers
- No tracking
- Open-source code
- iCloud sync uses Apple's secure infrastructure

### 🐛 Bug Fixes

- Input validation warnings
- Time format consistency
- Accessibility compliance
- Backup reliability

### ✅ Production Status

The app is **production-ready** and **safe to release**.

---

**Next Release** will include:
- Dark mode toggle
- Notification reminders
- Settings organization
- Export data to CSV
- Witr prayer support
