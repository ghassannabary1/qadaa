# Qadaa App Board

This board tracks the main product, UX, trust, and infrastructure work still needed in the app.

## P0

### Direct Dar al-Ifta Jordan links
- [x] Audit every Q&A card in `/Users/ghassannabary/Projects/QadaaApp/App.tsx`
- [x] Replace `islamqa.org` wrapper links with direct `دار الإفتاء الأردنية` URLs where available
- [x] Keep the visible source naming consistent in Arabic and English
- [ ] Verify each link opens correctly on iOS, Android, and web

### Better fasting history UX
- [x] Decide whether fasting history should use a month calendar or grouped-by-month sections
- [x] Design a fasting history view that stays separate from prayer history
- [ ] Add tap-to-open daily fasting details if history becomes calendar-based
- [ ] Ensure fasting history remains simple and does not compete with prayer as the main app purpose

### Notification polish
- [x] Add a `Test reminder` action in Settings
- [x] Show a confirmation message after saving reminder time
- [ ] Confirm reminder rescheduling works when language changes
- [ ] Confirm reminder rescheduling works when the saved hour/minute changes

### Backup and restore confidence
- [x] Add clear success and failure alerts for export
- [x] Add clear success and failure alerts for import
- [x] Explain what import will replace before the user confirms
- [ ] Verify backup and restore with real prayer and fasting data

## P1

### Day editing from History
- [x] Add edit actions inside prayer day details
- [x] Let the user add or remove specific prayers for a selected date
- [x] Make sure edits update totals, progress, and history consistently
- [x] Add tests for day-level correction behavior

### Better onboarding review screen
- [ ] Add a final review step before saving the Shafi'i estimate
- [ ] Show total qadaa days clearly before confirm
- [ ] Show the main assumptions in short practical language
- [ ] Keep the review screen light so onboarding stays fast

### Why this estimate sheet
- [ ] Add a `Why this estimate?` help surface from onboarding and Settings
- [ ] Explain the Shafi'i counting approach in simpler language
- [ ] Keep the explanation practical, not too academic
- [ ] Link only to the approved trusted source set

### Q&A grouping by topic
- [ ] Group Q&A cards into prayer qadaa, fasting qadaa, and kafarah
- [ ] Add section headers in Arabic and English
- [ ] Keep the number of cards small enough to feel curated
- [ ] Preserve Dar al-Ifta Jordan as the only source identity

## UX / Design

### Arabic mode spacing pass
- [ ] Review RTL spacing across Home, History, Fasting, and Settings
- [ ] Increase room around Arabic labels, buttons, and cards where needed
- [ ] Check truncation and wrapping on smaller Android screens
- [ ] Keep Arabic mode feeling native rather than mirrored English

### Cross-tab visual consistency
- [ ] Align card hierarchy between History, Fasting, and Settings
- [ ] Standardize section spacing and secondary button treatment
- [ ] Review whether the floral background is equally balanced across tabs
- [ ] Make sure the app still feels prayer-first even after enabling fasting

### Settings simplification
- [x] Reorganize Settings into clearer grouped blocks
- [x] Reduce repeated explanatory text where possible
- [x] Keep advanced sections visually quieter than primary ones
- [ ] Review scanability in both English and Arabic

### Floral background refinement
- [ ] Review background visibility on real devices in light and dark environments
- [ ] Adjust tint and opacity so the pattern supports content without competing
- [ ] Check readability of cards and buttons against the wallpaper
- [ ] Keep the look recognizably Islamic and calm

## Later

### Account-backed sync and sharing
- [ ] Finish testing OAuth in dev builds
- [ ] Define what data syncs locally vs remotely
- [ ] Add a minimal backend model for safe progress sharing
- [ ] Keep account features optional

### Private accountability sharing
- [ ] Define what can be shared safely
- [ ] Avoid public leaderboards or shame-heavy patterns
- [ ] Design a private friend or small-circle flow
- [ ] Let users share selected stats only

### Fasting-specific reminders
- [ ] Decide whether fasting reminders should be separate from prayer reminders
- [ ] Add an optional fasting reminder schedule
- [ ] Keep fasting reminders invisible unless fasting tracking is enabled
- [ ] Make the wording distinct from prayer qadaa reminders

### Share card or PDF export
- [ ] Decide between image card, PDF, or both
- [ ] Define what stats are safe and useful to export
- [ ] Create a simple bilingual layout
- [ ] Keep the export respectful and not overly gamified

## Suggested Next 3
- [ ] Direct Dar al-Ifta Jordan links
- [ ] Day editing from History
- [ ] Better fasting history view
