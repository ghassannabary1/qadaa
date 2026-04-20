# Qadaa - Release Notes

## Version 1.1.0 - Production Ready

### 🎉 What's New

#### Data Backup & Export
- ✅ **Automatic local backup snapshot** - saved in app storage every 30 seconds
- ✅ **Auto-save to device storage** (iOS & Android) - always up to date
- ✅ **Manual export/import** - user-controlled backup sharing and restore
- ✅ **Backup status indicator** - shows "Auto-backup: Enabled" on home screen
- ✅ **No cloud API dependencies** - simple, local-first, no server costs

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
- Backup stored locally in AsyncStorage

### 📱 How to Backup

#### Automatic Backup (Default)
Your data auto-saves to app storage on the device.
Use export if you want a manually shareable backup.

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
- Backup stays local unless you choose to export it

### 🐛 Bug Fixes

- Input validation warnings
- Time format consistency
- Accessibility compliance
- Backup reliability

### ✅ Production Status

The app is approaching release readiness, but still needs final signing, privacy, and store-compliance steps.

---

**Next Release** will include:
- Dark mode toggle
- Notification reminders
- Settings organization
- Export data to CSV
- Witr prayer support
