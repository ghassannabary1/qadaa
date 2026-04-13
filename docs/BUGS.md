# Qadaa Bugs

## Open
- [ ] Add visual feedback when AsyncStorage is writing (debounce rapid taps)
- [ ] Add haptic feedback on +1 tap
- [ ] Add loading state to onboarding button while saving
- [ ] Document local storage limits and backup strategy
- [ ] Add iCloud backup status indicator

## Resolved
- [x] Non-numeric input handling - now warns but treats as 0 gracefully (medium priority)
- [x] Time format consistency - standardized to UTC for consistency across devices
- [x] Accessibility labels - Added ARIA labels to all interactive buttons
- [x] Data backup - Auto-backup implemented with manual export/import (critical priority)
- [x] Backup sync - Auto-backup interval for iOS iCloud sync
- [x] Export/Import functionality - Users can share backups with friends/family

## Bug report template
- Title:
- Severity: critical / high / medium / low
- Steps to reproduce:
- Expected behavior:
- Actual behavior:
- Notes:
