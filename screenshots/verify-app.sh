#!/bin/bash

# Qadaa App Quick Verification Script
# Run this to verify the app is running and responding

APP_URL="http://localhost:8081"

echo "=============================================="
echo "Qadaa App - Quick Verification"
echo "=============================================="
echo ""
echo "Target: $APP_URL"
echo ""

# Check if app responds
echo "Checking if app is running..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" "$APP_URL"

if [ $? -eq 0 ]; then
  echo "✅ App is running"
else
  echo "❌ App is not responding"
  exit 1
fi

echo ""
echo "Fetching main page..."
curl -s "$APP_URL" > /tmp/qadaa-index.html

# Check for key elements
echo ""
echo "Checking for key elements..."

if grep -q "Qadaa" /tmp/qadaa-index.html; then
  echo "✅ App title found"
else
  echo "⚠️ App title not found"
fi

if grep -q "SummaryCard\|summaryRow" /tmp/qadaa-index.html; then
  echo "✅ Summary cards found"
else
  echo "⚠️ Summary cards not found"
fi

if grep -q "prayerCard\|PrayerCard" /tmp/qadaa-index.html; then
  echo "✅ Prayer cards found"
else
  echo "⚠️ Prayer cards not found"
fi

if grep -q "TextInput\|input" /tmp/qadaa-index.html; then
  echo "✅ Input fields found"
else
  echo "⚠️ Input fields not found"
fi

if grep -q "History\|historyGroup" /tmp/qadaa-index.html; then
  echo "✅ History section found"
else
  echo "⚠️ History section not found"
fi

if grep -q "Notes\|notesInput" /tmp/qadaa-index.html; then
  echo "✅ Notes section found"
else
  echo "⚠️ Notes section not found"
fi

if grep -q "Reset today\|resetToday" /tmp/qadaa-index.html; then
  echo "✅ Reset today button found"
else
  echo "⚠️ Reset today button not found"
fi

if grep -q "onboarding\|Onboarding" /tmp/qadaa-index.html; then
  echo "✅ Onboarding screen found"
else
  echo "⚠️ Onboarding screen not found"
fi

echo ""
echo "=============================================="
echo "Verification complete!"
echo "=============================================="

# Cleanup
rm -f /tmp/qadaa-index.html
