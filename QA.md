# Qadaa QA Plan

## Goal

Keep the app simple, trustworthy, and fast for daily use.

## Core user promise

A user should be able to:
- open the app
- understand their remaining qadaa quickly
- add one completed prayer in one tap
- avoid losing progress

## Manual QA checklist

### 1. First launch
- App opens without crashing
- Main summary cards are visible
- Prayer quick-add buttons are visible
- Backlog setup inputs are visible
- Notes field is editable

### 2. Backlog entry
- User can enter counts for each prayer
- Non-numeric characters do not break input
- Values persist after app restart
- Remaining count updates correctly

### 3. Quick add flow
- Tapping +1 on a prayer increases completed count by 1
- Today count also increases by 1
- Remaining count decreases but never below 0
- Undo decreases values safely
- Undo never goes below 0

### 4. Persistence
- Close and reopen app
- Completed counts remain saved
- Target counts remain saved
- Notes remain saved

### 5. Reset today
- Reset today clears only today's counters
- Total completed counters remain intact

### 6. UX sanity
- Home screen is understandable without explanation
- Buttons are easy to tap
- Text is readable
- No clutter or fiqh overload on first screen

### 7. Edge cases
- All counts zero
- Very large backlog numbers
- Completed exceeds target
- Empty notes
- Rapid tapping on +1 / Undo

## Bug severity

### Critical
- Data loss
- App crash
- Wrong prayer counts saved

### High
- Remaining totals wrong
- Counters go negative
- Persistence broken

### Medium
- Layout issues
- Confusing labels
- Notes field behaves oddly

### Low
- Cosmetic spacing/color issues
- Copy improvements

## QA agent prompt

Use this prompt when testing the app with an agent:

> Test the Qadaa mobile app as a real user. Focus on simplicity, counting accuracy, persistence, and UX clarity. Check backlog setup, quick-add prayer actions, today reset behavior, and edge cases like negative/overshoot counts. Report bugs, confusing UI, and suggestions in priority order.
