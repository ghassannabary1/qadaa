import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Linking,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  AppLanguage,
  AppState,
  applyFastingCompletion,
  applyFullDayCompletion,
  applyPrayerCompletion,
  applyPrayerCompletionForDay,
  calculateKafarahPoorPeople,
  countsFromMissedDays,
  DailyActivitySummary,
  defaultAppState,
  estimateCompletionDays,
  estimateCompletionDate,
  estimateMissedDaysFromShafiiSetup,
  FastingDailySummary,
  groupFastingActivityByMonth,
  FastingLogEntry,
  getRecentDailyActivity,
  getRecentFastingActivity,
  hydrateState,
  PrayerCounts,
  PrayerKey,
  PRAYER_KEYS,
  PRAYER_LABELS,
  PRAYERS_PER_QADAA_DAY,
  remainingFastingDays,
  remainingCounts,
  rollbackFastingCompletion,
  rollbackFullDayCompletion,
  rollbackPrayerCompletion,
  rollbackPrayerCompletionForDay,
  totalCounts,
} from './src/utils/qadaa';
import {
  getUserProfile,
  isAuthConfigured,
  loadSession,
  signInWithProvider,
  signOutUser,
  supabase,
} from './src/utils/auth';
import { createBackup, exportBackup, getBackupAge, restoreBackup } from './src/utils/backup';
import {
  cancelDailyReminderNotification,
  DAILY_REMINDER_COUNT_ACTION_ID,
  DAILY_REMINDER_KIND,
  DAILY_REMINDER_UNDO_ACTION_ID,
  ensureNotificationInfrastructure,
  requestNotificationPermissionAsync,
  scheduleDailyReminderNotification,
  sendTestReminderNotification,
} from './src/utils/notifications';
import { DividerOrnament } from './src/ui/patterns/DividerOrnament';

const STORAGE_KEY = 'qadaa-simple-v2';
const ONBOARD_KEY = 'qadaa-onboarded-v1';
const TOUR_KEY = 'qadaa-install-tour-seen-v1';
const HADITH_ROTATION_KEY = 'qadaa-daily-hadith-index-v1';
const AUTO_BACKUP_INTERVAL = 30 * 1000;
const DEFAULT_NOTES = defaultAppState().notes;
const APP_BACKGROUND = require('./assets/patterns/backgrounds/app-islamic-floral-background.png');
const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
const DEVELOPER_NAME = 'Ghassan Nabary';
const DEVELOPER_EMAIL = 'ghassan.nabary95@gmail.com';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const COLORS = {
  darkGreen: '#0B3D2E',
  forestGreen: '#1B5E3B',
  pine: '#123B2F',
  moss: '#295B45',
  nightBlue: '#0A2A1E',
  tileBlue: '#2E6D56',
  mistBlue: '#B9D1C2',
  gold: '#D5B15A',
  lightGold: '#EFD089',
  roseGold: '#D8C1A0',
  cream: '#F7F3EA',
  mutedText: '#9DB5A6',
  sectionBg: '#0D2B20',
  inputBg: '#0A2A1E',
  prayerCardBg: '#14432A',
  progressTrack: '#234B39',
  progressFill: '#C9A84C',
  success: '#4CAF50',
  warning: '#D9B35D',
};

type AppTab = 'home' | 'history' | 'fasting' | 'answers' | 'more';

type Totals = {
  target: number;
  completed: number;
  remaining: number;
  today: number;
};

type OnboardingSetup = {
  notes: string;
  target?: PrayerCounts;
  missedDays?: number;
  profileName?: string;
  profileAge?: string;
  profileEmail?: string;
};

type AccountProfile = ReturnType<typeof getUserProfile>;

type CopyBlock = {
  dir: 'ltr' | 'rtl';
  appEyebrow: string;
  appTitle: string;
  appSummary: string;
  dailyHadithTitle: string;
  dailyHadithIntro: string;
  onboardingTitle: string;
  onboardingSubtitle: string;
  profileSetupTitle: string;
  profileSetupBody: string;
  profileNameLabel: string;
  profileNameHint: string;
  profileAgeLabel: string;
  profileAgeHint: string;
  profileEmailLabel: string;
  profilePrefillHint: string;
  profileEmailInvalid: string;
  prefillFromGoogle: string;
  onboardingEstimateTitle: string;
  onboardingEstimateBody: string;
  onboardingMethodTitle: string;
  onboardingMethodEstimate: string;
  onboardingMethodManual: string;
  onboardingTrustTitle: string;
  onboardingTrustBody: string;
  onboardingWhyShow: string;
  onboardingWhyHide: string;
  onboardingAssumption1: string;
  onboardingAssumption2: string;
  onboardingAssumption3: string;
  onboardingEditableNote: string;
  latestPubertyAge: string;
  latestPubertyHint: string;
  regularPrayerAge: string;
  regularPrayerHint: string;
  menstruationDays: string;
  menstruationHint: string;
  estimateBacklog: string;
  estimateBacklogBody: string;
  onboardingAutoCountTitle: string;
  onboardingAutoCountBody: string;
  useEstimate: string;
  startNow: string;
  skipForNow: string;
  remaining: string;
  completed: string;
  primaryFocus: string;
  daysCompleted: string;
  daysLeft: string;
  overallProgress: string;
  progressTitle: string;
  progressHint: string;
  quickAddTitle: string;
  prayerRowsTitle: string;
  showPrayerRows: string;
  hidePrayerRows: string;
  resetToday: string;
  fullDayTitle: string;
  fullDayBody: string;
  fullDayToday: string;
  fullDayPrimary: string;
  fullDaySecondary: string;
  addDay: string;
  undoDay: string;
  undo: string;
  historyTitle: string;
  historyHint: string;
  historyMonthLabel: string;
  previousMonth: string;
  nextMonth: string;
  selectedDay: string;
  openDayDetails: string;
  close: string;
  dayDetailsTitle: string;
  noRecordedPrayers: string;
  prayersLabel: string;
  calendarLegend: string;
  qnaTitle: string;
  qnaHint: string;
  qnaTrustTitle: string;
  qnaTrustBody: string;
  qnaScholarLabel: string;
  qnaSourceLabel: string;
  qnaCategoryLabel: string;
  installTourTitle: string;
  installTourSubtitle: string;
  installTourSkip: string;
  installTourNext: string;
  installTourDone: string;
  installTourHomeTitle: string;
  installTourHomeBody: string;
  installTourHistoryTitle: string;
  installTourHistoryBody: string;
  installTourAnswersTitle: string;
  installTourAnswersBody: string;
  installTourMoreTitle: string;
  installTourMoreBody: string;
  settingsTitle: string;
  targetSettingsTitle: string;
  targetSettingsHint: string;
  currentTargetLabel: string;
  currentTargetDaysLabel: string;
  currentSettingLabel: string;
  manualDaysLabel: string;
  manualDaysHint: string;
  saveTarget: string;
  targetSaved: string;
  numberFieldInvalid: string;
  recalculateTarget: string;
  recalculateTitle: string;
  saveEstimateChanges: string;
  cancel: string;
  accountTitle: string;
  accountHint: string;
  connectGoogle: string;
  connectedAs: string;
  signOut: string;
  authComingSoon: string;
  authNeedsSetup: string;
  sharingReadyHint: string;
  authConfiguredLabel: string;
  authReady: string;
  authNotReady: string;
  languageTitle: string;
  languageHint: string;
  notificationTitle: string;
  notificationHint: string;
  notificationPromptTitle: string;
  notificationPromptBody: string;
  notificationActionCounted: string;
  notificationActionUndo: string;
  notificationTimeLabel: string;
  notificationHourLabel: string;
  notificationMinuteLabel: string;
  notificationSaveTime: string;
  notificationTimeInvalid: string;
  notificationTimeSaved: string;
  notificationTestScheduled: string;
  notificationTestReminder: string;
  notificationTestSent: string;
  notificationStatusLabel: string;
  notificationStatusOn: string;
  notificationStatusOff: string;
  notificationSavedTimeLabel: string;
  notificationDraftTimeLabel: string;
  notificationTimeHelp: string;
  defaultAddTitle: string;
  defaultAddHint: string;
  defaultAddLabel: string;
  defaultAddEditableNote: string;
  defaultAddMainNote: string;
  defaultAddSave: string;
  defaultAddSaved: string;
  defaultAddIndicator: string;
  defaultAddOff: string;
  enableNotification: string;
  disableNotification: string;
  notificationPermissionDenied: string;
  notesTitle: string;
  notesPlaceholder: string;
  comingNextTitle: string;
  comingNextBody: string;
  backupTitle: string;
  backupHint: string;
  exportBackup: string;
  importBackup: string;
  backupExportSuccess: string;
  backupExportFailure: string;
  backupImportConfirm: string;
  backupImportSuccess: string;
  backupImportFailure: string;
  autoBackup: string;
  enabled: string;
  contactDeveloperTitle: string;
  contactDeveloperHint: string;
  developerNameLabel: string;
  developerEmailLabel: string;
  appVersionLabel: string;
  openSource: string;
  finish: string;
  needHistory: string;
  homeTab: string;
  historyTab: string;
  answersTab: string;
  moreTab: string;
  doneLabel: string;
  remainingLabel: string;
  dayUnit: string;
  fastingTab: string;
  fastingTitle: string;
  fastingHint: string;
  fastingRemaining: string;
  fastingCompleted: string;
  fastingTarget: string;
  fastingAddDay: string;
  fastingUndoDay: string;
  fastingSettingsTitle: string;
  fastingSettingsHint: string;
  fastingEnable: string;
  fastingDisable: string;
  fastingTargetLabel: string;
  fastingTargetHint: string;
  fastingSaveTarget: string;
  fastingHistoryTitle: string;
  fastingHistoryHint: string;
  fastingEmpty: string;
  kafarahTitle: string;
  kafarahHint: string;
  kafarahEligibleDaysLabel: string;
  kafarahEligibleDaysHint: string;
  kafarahSave: string;
  kafarahWarning: string;
  kafarahPoorPeopleLabel: string;
  kafarahFastingLabel: string;
  kafarahTrackHint: string;
  kafarahAdvancedLabel: string;
};

const COPY: Record<AppLanguage, CopyBlock> = {
  en: {
    dir: 'ltr',
    appEyebrow: 'Qadaa',
    appTitle: 'Build a steady qadaa habit.',
    appSummary: 'Count what you finish today, see your pace clearly, and review your consistency over time.',
    dailyHadithTitle: 'Daily hadith',
    dailyHadithIntro: 'Prayer reminder',
    onboardingTitle: 'Qadaa',
    onboardingSubtitle:
      'Choose your language, set a simple Shafi\'i estimate, and start with a calm, easy flow.',
    profileSetupTitle: 'Your profile',
    profileSetupBody:
      'You can add your name and email now or leave them for later. Google can fill them for you.',
    profileNameLabel: 'Name',
    profileNameHint: 'Use the name you want to see in the app.',
    profileAgeLabel: 'Current age',
    profileAgeHint: 'Optional, but useful for personal setup context.',
    profileEmailLabel: 'Email',
    profilePrefillHint: 'Optional. Google can fill your name and email for you.',
    profileEmailInvalid: 'Enter a valid email address.',
    prefillFromGoogle: 'Fill from Google',
    onboardingEstimateTitle: "First-time Shafi'i estimate",
    onboardingEstimateBody:
      'Estimate from the latest likely puberty age until the age when regular prayer became certain. If unsure whether a prayer was prayed, count it. Menstruation days can be excluded.',
    onboardingMethodTitle: 'Choose how to set your qadaa',
    onboardingMethodEstimate: 'Use the guided estimate',
    onboardingMethodManual: 'Enter missed days manually',
    onboardingTrustTitle: "Why this estimate is Shafi'i",
    onboardingTrustBody:
      'This setup is a practical starting estimate based on trusted Shafi\'i answers. It helps you begin clearly, then edit the count later if needed.',
    onboardingWhyShow: 'Why this estimate?',
    onboardingWhyHide: 'Hide why',
    onboardingAssumption1:
      'Start from the latest age puberty was definitely reached, not the earliest guess.',
    onboardingAssumption2:
      'Count until the age you are certain regular prayer became established.',
    onboardingAssumption3:
      'If you are unsure whether a prayer was performed, count it; menstruation days are excluded when relevant.',
    onboardingEditableNote:
      'This app gives an estimate to organize your qadaa. It does not replace asking a qualified scholar about your personal case.',
    latestPubertyAge: 'Latest puberty age',
    latestPubertyHint: 'Use the latest age puberty had definitely started.',
    regularPrayerAge: 'Age when regular prayer became certain',
    regularPrayerHint: 'Use the age when you know you were praying consistently.',
    menstruationDays: 'Menstruation days per lunar year',
    menstruationHint: 'Optional. Keep 0 if not applicable.',
    estimateBacklog: 'Estimated backlog',
    estimateBacklogBody: 'This fills the five daily prayers with the same number of missed days.',
    onboardingAutoCountTitle: 'Finish projection',
    onboardingAutoCountBody:
      'By default, the app estimates your finish date as if you complete 1 qadaa day each day. This does not add progress automatically, and you can change it later in Settings, even to 0.',
    useEstimate: 'Save and continue',
    startNow: 'Continue',
    skipForNow: 'Continue without estimate',
    remaining: 'Prayers left',
    completed: 'Total finished',
    primaryFocus: 'What is left',
    daysCompleted: 'Qadaa days completed',
    daysLeft: 'Qadaa days left',
    overallProgress: 'Completed so far',
    progressTitle: 'Progress',
    progressHint: 'See what is left and when you finish if you count one qadaa day each day.',
    quickAddTitle: 'Quick add',
    prayerRowsTitle: 'Prayer details',
    showPrayerRows: 'Show prayer details',
    hidePrayerRows: 'Hide prayer details',
    resetToday: 'Reset today',
    fullDayTitle: 'Full qadaa day',
    fullDayBody: 'One tap logs Fajr, Dhuhr, Asr, Maghrib, and Isha together.',
    fullDayToday: 'Today',
    fullDayPrimary: 'Count by day first',
    fullDaySecondary: 'Use prayer details only when you need to correct or fine-tune.',
    addDay: '+1 day',
    undoDay: 'Undo day',
    undo: 'Undo',
    historyTitle: 'History calendar',
    historyHint: 'A month view of your recent qadaa activity. Tap your rhythm into place and review it visually.',
    historyMonthLabel: 'Last 30 days',
    previousMonth: 'Previous',
    nextMonth: 'Next',
    selectedDay: 'Selected day',
    openDayDetails: 'View details',
    close: 'Close',
    dayDetailsTitle: 'Day details',
    noRecordedPrayers: 'No recorded qadaa prayers on this day.',
    prayersLabel: 'prayers',
    calendarLegend: 'Lighter days mean less activity. Gold means a full qadaa day.',
    qnaTitle: 'Related Q&A',
    qnaHint: 'These answers are taken from Dar al-Iftaa al-Urdunniyah and selected for this qadaa journey.',
    qnaTrustTitle: 'Dar al-Iftaa al-Urdunniyah',
    qnaTrustBody:
      'These cards summarize answers from Dar al-Iftaa al-Urdunniyah and link to the full source. Use them for guided study and planning, not as a replacement for a personal fatwa when your case is detailed or sensitive.',
    qnaScholarLabel: 'Issued by',
    qnaSourceLabel: 'Source',
    qnaCategoryLabel: 'Topic',
    installTourTitle: 'Quick tour',
    installTourSubtitle: 'Three small steps to understand the main flow.',
    installTourSkip: 'Skip',
    installTourNext: 'Next',
    installTourDone: 'Done',
    installTourHomeTitle: 'Home',
    installTourHomeBody:
      'This is where you count one qadaa day at a time and see the finish date update as you keep going.',
    installTourHistoryTitle: 'History',
    installTourHistoryBody:
      'This is your calendar view. It shows your progress by day and lets you review or correct a past day.',
    installTourAnswersTitle: 'Q&A',
    installTourAnswersBody:
      'This tab holds trusted answers from Dar al-Iftaa al-Urdunniyah for prayer, fasting, and kafarah questions.',
    installTourMoreTitle: 'Settings',
    installTourMoreBody:
      'Settings is where you change language, reminder time, daily pace, backup, and the optional fasting track.',
    settingsTitle: 'Settings',
    targetSettingsTitle: 'Qadaa target',
    targetSettingsHint:
      'Adjust the amount you still need to make up. You can edit the missed qadaa days directly or recalculate with the same Shafi\'i questionnaire.',
    currentTargetLabel: 'Current target',
    currentTargetDaysLabel: 'Qadaa days',
    currentSettingLabel: 'Current setting',
    manualDaysLabel: 'Missed qadaa days',
    manualDaysHint: 'The app fills all five daily prayers equally from this number.',
    saveTarget: 'Save target',
    targetSaved: 'Qadaa target updated.',
    numberFieldInvalid: 'Enter a whole number of days.',
    recalculateTarget: 'Use Shafi\'i questionnaire',
    recalculateTitle: 'Recalculate qadaa estimate',
    saveEstimateChanges: 'Save estimate',
    cancel: 'Cancel',
    accountTitle: 'Account',
    accountHint: 'Sign in if you want to save your identity for future sharing and backup features.',
    connectGoogle: 'Continue with Google',
    connectedAs: 'Signed in as',
    signOut: 'Sign out',
    authComingSoon: 'This account will be the base for sharing progress with trusted people later.',
    authNeedsSetup: 'Sign-in is not ready yet on this build.',
    sharingReadyHint: 'Sign in with Google to use future backup and sharing features.',
    authConfiguredLabel: 'Sign-in status',
    authReady: 'Available',
    authNotReady: 'Not available',
    languageTitle: 'Language',
    languageHint: 'Choose one full app language for the whole interface.',
    notificationTitle: 'Daily reminder',
    notificationHint:
      'A calm daily reminder asks whether you counted today and lets you undo the latest qadaa day from the notification.',
    notificationPromptTitle: 'Counted today?',
    notificationPromptBody: 'Log one qadaa day or undo the latest full day right from the reminder.',
    notificationActionCounted: 'Counted',
    notificationActionUndo: 'Undo',
    notificationTimeLabel: 'Time',
    notificationHourLabel: 'Hour',
    notificationMinuteLabel: 'Minute',
    notificationSaveTime: 'Save reminder time',
    notificationTimeInvalid: 'Enter a valid time using 24-hour values.',
    notificationTimeSaved: 'Reminder time updated.',
    notificationTestScheduled: 'Test reminder scheduled for the next moment.',
    notificationTestReminder: 'Send test reminder',
    notificationTestSent: 'A test reminder has been sent.',
    notificationStatusLabel: 'Status',
    notificationStatusOn: 'On',
    notificationStatusOff: 'Off',
    notificationSavedTimeLabel: 'Saved time',
    notificationDraftTimeLabel: 'New time',
    notificationTimeHelp: 'Save the time here, then turn the reminder on if it is off.',
    defaultAddTitle: 'Finish estimate',
    defaultAddHint:
      'Choose how many qadaa days you hope to finish in a normal day. This changes the estimate only. The main button still counts one day at a time.',
    defaultAddLabel: 'Average qadaa days per day',
    defaultAddEditableNote: 'You can change this anytime in Settings, even to 0.',
    defaultAddMainNote: 'Change this later in Settings.',
    defaultAddSave: 'Save estimate',
    defaultAddSaved: 'Finish estimate updated.',
    defaultAddIndicator: 'Using per day',
    defaultAddOff: 'Off',
    enableNotification: 'Turn on reminder',
    disableNotification: 'Turn off reminder',
    notificationPermissionDenied:
      'Notifications are off for Qadaa. Please allow notifications in the system prompt or device settings.',
    notesTitle: 'Notes',
    notesPlaceholder: 'How are you counting your qadaa?',
    comingNextTitle: 'Coming next',
    comingNextBody:
      'Daily notifications can be added next, asking whether the day was counted and offering a quick undo.',
    backupTitle: 'Backup',
    backupHint: 'Your data auto-saves locally. Export a manual backup any time.',
    exportBackup: 'Export data',
    importBackup: 'Restore backup',
    backupExportSuccess: 'Backup export is ready to share or save.',
    backupExportFailure: 'Backup export failed.',
    backupImportConfirm: 'Restore the latest saved backup? This will replace your current local data.',
    backupImportSuccess: 'Backup restored successfully.',
    backupImportFailure: 'Backup restore failed or no saved backup was found.',
    autoBackup: 'Auto-backup',
    enabled: 'Enabled',
    contactDeveloperTitle: 'Contact developer',
    contactDeveloperHint: 'Questions, feedback, or support requests.',
    developerNameLabel: 'Developer',
    developerEmailLabel: 'Email',
    appVersionLabel: 'App version',
    openSource: 'Open source',
    finish: 'Finish',
    needHistory: 'Need more history',
    homeTab: 'Home',
    historyTab: 'History',
    answersTab: 'Q&A',
    moreTab: 'More',
    doneLabel: 'Done',
    remainingLabel: 'remaining',
    dayUnit: 'days',
    fastingTab: 'Fasting',
    fastingTitle: 'Ramadan qadaa fasts',
    fastingHint: 'Track missed Ramadan fasting days separately from prayer qadaa.',
    fastingRemaining: 'Days left',
    fastingCompleted: 'Completed',
    fastingTarget: 'Target',
    fastingAddDay: '+1 fasting day',
    fastingUndoDay: 'Undo fasting day',
    fastingSettingsTitle: 'Ramadan qadaa fasts',
    fastingSettingsHint:
      'Enable an optional fasting track, set how many missed Ramadan days you need to make up, and keep it separate from prayers.',
    fastingEnable: 'Enable fasting track',
    fastingDisable: 'Disable fasting track',
    fastingTargetLabel: 'Missed Ramadan days',
    fastingTargetHint: 'Enter the number of fasting qadaa days you need to make up.',
    fastingSaveTarget: 'Save fasting target',
    fastingHistoryTitle: 'Fasting history',
    fastingHistoryHint: 'Your latest counted fasting qadaa days.',
    fastingEmpty: 'No fasting qadaa days counted yet.',
    kafarahTitle: 'Kafarah calculator',
    kafarahHint:
      'Shafi\'i note: kaffarah is not due for every missed fast. This calculator is only for Ramadan days invalidated in a way that requires kaffarah.',
    kafarahEligibleDaysLabel: 'Kafarah-eligible Ramadan days',
    kafarahEligibleDaysHint:
      'Use this only for days that require kaffarah in the Shafi\'i school, such as deliberate intercourse in a Ramadan fast day before any other nullifier.',
    kafarahSave: 'Save kaffarah days',
    kafarahWarning:
      'This is a planning aid, not a fatwa. Please confirm difficult personal cases with a qualified Shafi\'i scholar.',
    kafarahPoorPeopleLabel: 'If feeding instead: poor people to feed',
    kafarahFastingLabel: 'If able: two consecutive lunar months for each eligible day',
    kafarahTrackHint: 'Keep kaffarah separate from qadaa fasting days.',
    kafarahAdvancedLabel: 'Advanced',
  },
  ar: {
    dir: 'rtl',
    appEyebrow: 'قضاء',
    appTitle: 'ابنِ عادة ثابتة في قضاء الصلوات.',
    appSummary: 'سجّل ما أنجزته اليوم، وراجع تقدّمك، وحافظ على الاستمرار بهدوء.',
    dailyHadithTitle: 'حديث اليوم',
    dailyHadithIntro: 'تذكير في الصلاة',
    onboardingTitle: 'قضاء',
    onboardingSubtitle:
      'اختر اللغة، واضبط تقديراً أولياً على المذهب الشافعي، ثم ابدأ بخطوات واضحة وبسيطة.',
    profileSetupTitle: 'بياناتك',
    profileSetupBody:
      'يمكنك إضافة الاسم والبريد الآن أو تركهما لوقت لاحق. كما يمكن لجوجل تعبئتهما لك.',
    profileNameLabel: 'الاسم',
    profileNameHint: 'اكتب الاسم الذي تريد ظهوره داخل التطبيق.',
    profileAgeLabel: 'العمر الحالي',
    profileAgeHint: 'اختياري، لكنه يفيد في ضبط البداية بشكل شخصي.',
    profileEmailLabel: 'البريد الإلكتروني',
    profilePrefillHint: 'اختياري. يمكن لجوجل تعبئة الاسم والبريد لك.',
    profileEmailInvalid: 'أدخل بريدًا إلكترونيًا صحيحًا.',
    prefillFromGoogle: 'تعبئة من جوجل',
    onboardingEstimateTitle: 'تقدير أولي على المذهب الشافعي',
    onboardingEstimateBody:
      'يبدأ التقدير من آخر سنّ يُحتمل فيه البلوغ إلى السنّ الذي تيقنت فيه من الانتظام في الصلاة. وإذا شككت هل صليت صلاةً أم لا فاحسبها. ويمكن استثناء أيام الحيض.',
    onboardingMethodTitle: 'اختر طريقة تحديد القضاء',
    onboardingMethodEstimate: 'استخدم التقدير الموجّه',
    onboardingMethodManual: 'أدخل الأيام الفائتة يدوياً',
    onboardingTrustTitle: 'لماذا هذا التقدير شافعي',
    onboardingTrustBody:
      'هذا التقدير بداية عملية مبنية على أجوبة شافعية موثوقة، والغرض منه أن تبدأ بوضوح ثم تعدّل العدد لاحقاً إذا احتجت.',
    onboardingWhyShow: 'لماذا هذا التقدير؟',
    onboardingWhyHide: 'إخفاء السبب',
    onboardingAssumption1:
      'ابدأ من آخر سنّ تتيقن أن البلوغ كان قد حصل فيه، لا من أول احتمال.',
    onboardingAssumption2:
      'استمر في العد إلى السن الذي تيقنت فيه من انتظامك في الصلاة.',
    onboardingAssumption3:
      'إذا شككت هل صليت صلاةً أم لا فاحسبها، مع استثناء أيام الحيض عند الحاجة.',
    onboardingEditableNote:
      'هذا التطبيق يقدّم تقديراً لتنظيم القضاء، ولا يغني عن سؤال عالم مؤهل في حالتك الخاصة.',
    latestPubertyAge: 'آخر سن محتمل للبلوغ',
    latestPubertyHint: 'استخدم آخر سن تتيقن أن البلوغ كان قد حصل فيه.',
    regularPrayerAge: 'السن الذي تيقنت فيه من الانتظام في الصلاة',
    regularPrayerHint: 'استخدم السن الذي عرفت فيه أنك أصبحت تصلي باستمرار.',
    menstruationDays: 'أيام الحيض في السنة القمرية',
    menstruationHint: 'اختياري. اتركه 0 إن لم يكن مناسباً.',
    estimateBacklog: 'التقدير الأولي',
    estimateBacklogBody: 'سيملأ هذا التقدير الصلوات الخمس اليومية بنفس عدد الأيام الفائتة.',
    onboardingAutoCountTitle: 'تقدير الانتهاء',
    onboardingAutoCountBody:
      'يفترض التطبيق افتراضياً في تاريخ الانتهاء أنك تُنجز يوم قضاء واحداً كل يوم. هذا لا يضيف تقدّماً تلقائياً، ويمكنك تغييره لاحقاً من الإعدادات، وحتى جعله 0.',
    useEstimate: 'احفظ وتابع',
    startNow: 'تابع',
    skipForNow: 'تابع بدون تقدير',
    remaining: 'الصلوات المتبقية',
    completed: 'إجمالي المنجز',
    primaryFocus: 'المتبقي عليك',
    daysCompleted: 'أيام القضاء المنجزة',
    daysLeft: 'أيام القضاء المتبقية',
    overallProgress: 'المنجز حتى الآن',
    progressTitle: 'التقدّم',
    progressHint: 'شاهد المتبقي وتاريخ الانتهاء إذا احتسبت يوم قضاء واحداً كل يوم.',
    quickAddTitle: 'إضافة سريعة',
    prayerRowsTitle: 'تفاصيل الصلوات',
    showPrayerRows: 'إظهار تفاصيل الصلوات',
    hidePrayerRows: 'إخفاء تفاصيل الصلوات',
    resetToday: 'تصفير اليوم',
    fullDayTitle: 'يوم قضاء كامل',
    fullDayBody: 'ضغطة واحدة تسجل الفجر والظهر والعصر والمغرب والعشاء معاً.',
    fullDayToday: 'اليوم',
    fullDayPrimary: 'ابدأ بالعدّ اليومي',
    fullDaySecondary: 'استخدم تفاصيل الصلوات فقط عند الحاجة إلى التصحيح أو التعديل.',
    addDay: '+1 يوم',
    undoDay: 'تراجع عن اليوم',
    undo: 'تراجع',
    historyTitle: 'تقويم القضاء',
    historyHint: 'عرض شهري لنشاطك في القضاء حتى ترى انتظامك بوضوح.',
    historyMonthLabel: 'آخر 30 يوماً',
    previousMonth: 'السابق',
    nextMonth: 'التالي',
    selectedDay: 'اليوم المحدد',
    openDayDetails: 'عرض التفاصيل',
    close: 'إغلاق',
    dayDetailsTitle: 'تفاصيل اليوم',
    noRecordedPrayers: 'لا توجد صلوات قضاء مسجلة في هذا اليوم.',
    prayersLabel: 'صلوات',
    calendarLegend: 'كلما كان اللون أفتح كان النشاط أقل، والذهبي يعني يوم قضاء كامل.',
    qnaTitle: 'الفتاوى',
    qnaHint: 'هذه الأجوبة مأخوذة من دار الإفتاء الأردنية، واختيرت لما يتعلق بقضاء الصلاة والصيام.',
    qnaTrustTitle: 'دار الإفتاء الأردنية',
    qnaTrustBody:
      'هذه البطاقات تلخص أجوبة من دار الإفتاء الأردنية وتربطك بالمصدر الكامل. استخدمها للفهم والتنظيم، لا بديلاً عن الفتوى الشخصية إذا كانت حالتك خاصة أو دقيقة.',
    qnaScholarLabel: 'الجهة المصدرة',
    qnaSourceLabel: 'المصدر',
    qnaCategoryLabel: 'الموضوع',
    installTourTitle: 'جولة سريعة',
    installTourSubtitle: 'ثلاث خطوات صغيرة لفهم المسار الرئيسي.',
    installTourSkip: 'تخطي',
    installTourNext: 'التالي',
    installTourDone: 'تم',
    installTourHomeTitle: 'الرئيسية',
    installTourHomeBody:
      'هنا تحتسب يوم قضاء واحدًا في كل مرة، وترى تاريخ الانتهاء يتغير مع استمرارك.',
    installTourHistoryTitle: 'التقويم',
    installTourHistoryBody:
      'هذا هو عرض التقويم. يعرض تقدّمك يومًا بيوم، ويمكنك مراجعة يوم سابق أو تصحيحه.',
    installTourAnswersTitle: 'الفتاوى',
    installTourAnswersBody:
      'هذا التبويب يحوي أجوبة موثوقة من دار الإفتاء الأردنية حول الصلاة والصيام والكفارة.',
    installTourMoreTitle: 'الإعدادات',
    installTourMoreBody:
      'هنا تغيّر اللغة، ووقت التذكير، ومعدل العدّ اليومي، والنسخ الاحتياطي، ومسار الصيام الاختياري.',
    settingsTitle: 'الإعدادات',
    targetSettingsTitle: 'هدف القضاء',
    targetSettingsHint:
      'عدّل المقدار الذي تريد قضاؤه. يمكنك إدخال عدد أيام القضاء مباشرة أو إعادة الحساب عبر نفس الاستبيان الشافعي.',
    currentTargetLabel: 'الهدف الحالي',
    currentTargetDaysLabel: 'أيام القضاء',
    currentSettingLabel: 'الإعداد الحالي',
    manualDaysLabel: 'أيام القضاء الفائتة',
    manualDaysHint: 'سيملأ التطبيق الصلوات الخمس اليومية بنفس هذا العدد.',
    saveTarget: 'حفظ الهدف',
    targetSaved: 'تم تحديث هدف القضاء.',
    numberFieldInvalid: 'أدخل عدداً صحيحاً من الأيام.',
    recalculateTarget: 'إعادة الحساب بالاستبيان الشافعي',
    recalculateTitle: 'إعادة تقدير القضاء',
    saveEstimateChanges: 'حفظ التقدير',
    cancel: 'إلغاء',
    accountTitle: 'الحساب',
    accountHint: 'يمكنك تسجيل الدخول إذا أردت استخدام النسخ الاحتياطي أو المشاركة لاحقاً.',
    connectGoogle: 'المتابعة عبر جوجل',
    connectedAs: 'تم تسجيل الدخول باسم',
    signOut: 'تسجيل الخروج',
    authComingSoon: 'سيكون هذا الحساب أساساً للنسخ الاحتياطي والمشاركة لاحقاً.',
    authNeedsSetup: 'تسجيل الدخول غير متاح بعد في هذه النسخة.',
    sharingReadyHint: 'سجّل عبر جوجل لاستخدام مزايا النسخ الاحتياطي والمشاركة عند توفرها.',
    authConfiguredLabel: 'حالة تسجيل الدخول',
    authReady: 'متاح',
    authNotReady: 'غير متاح',
    languageTitle: 'اللغة',
    languageHint: 'اختر لغة واحدة كاملة لواجهة التطبيق كلها.',
    notificationTitle: 'التذكير اليومي',
    notificationHint:
      'تذكير هادئ يسألك: هل احتسبت اليوم؟ ويتيح لك التراجع عن آخر يوم قضاء مباشرة من الإشعار.',
    notificationPromptTitle: 'هل احتسبت اليوم؟',
    notificationPromptBody: 'سجّل يوم قضاء واحداً أو تراجع عن آخر يوم كامل مباشرة من الإشعار.',
    notificationActionCounted: 'تم الاحتساب',
    notificationActionUndo: 'تراجع',
    notificationTimeLabel: 'الوقت',
    notificationHourLabel: 'الساعة',
    notificationMinuteLabel: 'الدقيقة',
    notificationSaveTime: 'حفظ وقت التذكير',
    notificationTimeInvalid: 'أدخل وقتاً صحيحاً بصيغة 24 ساعة.',
    notificationTimeSaved: 'تم تحديث وقت التذكير.',
    notificationTestScheduled: 'تمت جدولة التذكير التجريبي للحظة التالية.',
    notificationTestReminder: 'إرسال تذكير تجريبي',
    notificationTestSent: 'تم إرسال تذكير تجريبي.',
    notificationStatusLabel: 'الحالة',
    notificationStatusOn: 'مفعّل',
    notificationStatusOff: 'متوقف',
    notificationSavedTimeLabel: 'الوقت المحفوظ',
    notificationDraftTimeLabel: 'الوقت الجديد',
    notificationTimeHelp: 'احفظ الوقت هنا، ثم فعّل التذكير إن كان متوقفاً.',
    defaultAddTitle: 'تقدير الانتهاء',
    defaultAddHint:
      'اختر عدد أيام القضاء التي ترجّح إنجازها في يوم عادي. هذا يغيّر تقدير الانتهاء فقط، أما الزر الرئيسي فيبقى يوماً واحداً كل مرة.',
    defaultAddLabel: 'متوسط أيام القضاء يومياً',
    defaultAddEditableNote: 'يمكنك تغيير هذا لاحقاً من الإعدادات، وحتى جعله 0.',
    defaultAddMainNote: 'يمكنك تغييره لاحقاً من الإعدادات.',
    defaultAddSave: 'حفظ التقدير',
    defaultAddSaved: 'تم تحديث تقدير الانتهاء.',
    defaultAddIndicator: 'المعتمد يومياً',
    defaultAddOff: 'متوقف',
    enableNotification: 'تفعيل التذكير',
    disableNotification: 'إيقاف التذكير',
    notificationPermissionDenied:
      'تنبيهات Qadaa غير مفعّلة. اسمح بالتنبيهات من نافذة النظام أو من إعدادات الجهاز.',
    notesTitle: 'ملاحظات',
    notesPlaceholder: 'كيف تنظم قضاءك؟',
    comingNextTitle: 'لاحقاً',
    comingNextBody:
      'يمكن إضافة مزيد من التنبيهات الذكية لاحقاً، مع خيارات أسرع للتسجيل والتراجع.',
    backupTitle: 'النسخ الاحتياطي',
    backupHint: 'بياناتك تُحفظ محلياً تلقائياً. ويمكنك التصدير في أي وقت لنسخة يدوية.',
    exportBackup: 'تصدير البيانات',
    importBackup: 'استعادة نسخة احتياطية',
    backupExportSuccess: 'أصبحت نسخة الاحتياط جاهزة للمشاركة أو الحفظ.',
    backupExportFailure: 'فشل تصدير نسخة الاحتياط.',
    backupImportConfirm: 'هل تريد استعادة آخر نسخة احتياطية محفوظة؟ سيؤدي ذلك إلى استبدال بياناتك المحلية الحالية.',
    backupImportSuccess: 'تمت استعادة النسخة الاحتياطية بنجاح.',
    backupImportFailure: 'فشلت استعادة النسخة الاحتياطية أو لم يتم العثور على نسخة محفوظة.',
    autoBackup: 'الحفظ التلقائي',
    enabled: 'مفعّل',
    contactDeveloperTitle: 'تواصل مع المطوّر',
    contactDeveloperHint: 'للأسئلة أو الملاحظات أو طلبات الدعم.',
    developerNameLabel: 'المطوّر',
    developerEmailLabel: 'البريد الإلكتروني',
    appVersionLabel: 'إصدار التطبيق',
    openSource: 'عرض المصدر',
    finish: 'الانتهاء',
    needHistory: 'تحتاج إلى مزيد من السجل',
    homeTab: 'الرئيسية',
    historyTab: 'التقويم',
    answersTab: 'الفتاوى',
    moreTab: 'الإعدادات',
    doneLabel: 'تم',
    remainingLabel: 'متبقٍ',
    dayUnit: 'يوم',
    fastingTab: 'الصيام',
    fastingTitle: 'قضاء صيام رمضان',
    fastingHint: 'تتبّع أيام قضاء رمضان بشكل منفصل عن قضاء الصلوات.',
    fastingRemaining: 'الأيام المتبقية',
    fastingCompleted: 'المنجز',
    fastingTarget: 'الهدف',
    fastingAddDay: '+1 يوم صيام',
    fastingUndoDay: 'تراجع عن يوم صيام',
    fastingSettingsTitle: 'قضاء صيام رمضان',
    fastingSettingsHint:
      'فعّل مساراً اختيارياً للصيام، وحدد عدد أيام رمضان التي تريد قضاءها، مع بقائها منفصلة عن الصلوات.',
    fastingEnable: 'تفعيل مسار الصيام',
    fastingDisable: 'إيقاف مسار الصيام',
    fastingTargetLabel: 'أيام رمضان الفائتة',
    fastingTargetHint: 'أدخل عدد أيام قضاء الصيام التي تحتاج إليها.',
    fastingSaveTarget: 'حفظ هدف الصيام',
    fastingHistoryTitle: 'سجل الصيام',
    fastingHistoryHint: 'أحدث أيام قضاء الصيام التي احتسبتها.',
    fastingEmpty: 'لم يتم تسجيل أي يوم صيام بعد.',
    kafarahTitle: 'حاسبة الكفارة',
    kafarahHint:
      'تنبيه شافعي: الكفارة لا تجب في كل يوم فائت. هذه الحاسبة مخصصة فقط لأيام رمضان التي توجب الكفارة.',
    kafarahEligibleDaysLabel: 'أيام رمضان الموجبة للكفارة',
    kafarahEligibleDaysHint:
      'استخدم هذا فقط للأيام التي تجب فيها الكفارة في المذهب الشافعي، مثل الجماع المتعمد نهار رمضان قبل حصول مفطر آخر.',
    kafarahSave: 'حفظ أيام الكفارة',
    kafarahWarning:
      'هذه أداة تنظيمية وليست فتوى. في المسائل الشخصية المعقدة يُرجى الرجوع إلى عالم شافعي مؤهل.',
    kafarahPoorPeopleLabel: 'عند الإطعام: عدد المساكين',
    kafarahFastingLabel: 'عند القدرة: شهران قمريان متتابعان عن كل يوم موجب للكفارة',
    kafarahTrackHint: 'أبقِ الكفارة منفصلة عن أيام قضاء الصيام.',
    kafarahAdvancedLabel: 'متقدم',
  },
};

const DAILY_HADITH: Record<AppLanguage, Array<{ text: string; collection: string; url: string }>> = {
  en: [
    {
      text: 'Prayer at its proper time.',
      collection: 'Sahih Muslim',
      url: 'https://sunnah.com/search?didyoumean=true&old=actions+intention&page=6&q=action+intention',
    },
    {
      text: 'The two rak‘ahs before Fajr are better than the world and all it contains.',
      collection: 'Sahih Muslim',
      url: 'https://sunnah.com/search?q=%D8%A7%D9%84%D9%81%D8%AC%D8%B1',
    },
    {
      text: 'Whoever prays the two cool prayers will enter Paradise.',
      collection: 'Sahih al-Bukhari',
      url: 'https://sunnah.com/search?didyoumean=true&old=banu+qurayza+asr&page=2&q=banu+quraiza+asr',
    },
    {
      text: 'The prayer is light.',
      collection: 'Sahih Muslim',
      url: 'https://sunnah.com/search?didyoumean=true&old=Sahih+Bukhari+1322&page=1&q=sahih+bukhari+1+322',
    },
    {
      text: 'The closest a servant is to his Lord is while he is prostrating, so increase your supplication.',
      collection: 'Sahih Muslim',
      url: 'https://sunnah.com/muslim:482',
    },
    {
      text: 'Whoever catches one rak‘ah of the prayer has caught the prayer.',
      collection: 'Sahih Muslim',
      url: 'https://sunnah.com/search?page=4&q=Salat+',
    },
    {
      text: 'When one of you enters the mosque, let him pray two rak‘ahs before sitting.',
      collection: 'Sahih al-Bukhari',
      url: 'https://sunnah.com/search?didyoumean=true&old=matn+sitting&page=3&q=main+sitting',
    },
    {
      text: 'The time of Fajr lasts until the sun rises.',
      collection: 'Sahih Muslim',
      url: 'https://sunnah.com/muslim:612b',
    },
  ],
  ar: [
    {
      text: 'الصَّلَاةُ لِوَقْتِهَا',
      collection: 'صحيح مسلم',
      url: 'https://sunnah.com/search?didyoumean=true&old=actions+intention&page=6&q=action+intention',
    },
    {
      text: 'رَكْعَتَا الْفَجْرِ خَيْرٌ مِنَ الدُّنْيَا وَمَا فِيهَا',
      collection: 'صحيح مسلم',
      url: 'https://sunnah.com/search?q=%D8%A7%D9%84%D9%81%D8%AC%D8%B1',
    },
    {
      text: 'مَنْ صَلَّى الْبَرْدَيْنِ دَخَلَ الْجَنَّةَ',
      collection: 'صحيح البخاري',
      url: 'https://sunnah.com/search?didyoumean=true&old=banu+qurayza+asr&page=2&q=banu+quraiza+asr',
    },
    {
      text: 'الصَّلَاةُ نُورٌ',
      collection: 'صحيح مسلم',
      url: 'https://sunnah.com/search?didyoumean=true&old=Sahih+Bukhari+1322&page=1&q=sahih+bukhari+1+322',
    },
    {
      text: 'أَقْرَبُ مَا يَكُونُ الْعَبْدُ مِنْ رَبِّهِ وَهُوَ سَاجِدٌ، فَأَكْثِرُوا الدُّعَاءَ',
      collection: 'صحيح مسلم',
      url: 'https://sunnah.com/muslim:482',
    },
    {
      text: 'مَنْ أَدْرَكَ رَكْعَةً مِنَ الصَّلَاةِ فَقَدْ أَدْرَكَ الصَّلَاةَ',
      collection: 'صحيح مسلم',
      url: 'https://sunnah.com/search?page=4&q=Salat+',
    },
    {
      text: 'إِذَا دَخَلَ أَحَدُكُمُ الْمَسْجِدَ فَلْيَرْكَعْ رَكْعَتَيْنِ قَبْلَ أَنْ يَجْلِسَ',
      collection: 'صحيح البخاري',
      url: 'https://sunnah.com/search?didyoumean=true&old=matn+sitting&page=3&q=main+sitting',
    },
    {
      text: 'وَقْتُ الْفَجْرِ مَا لَمْ تَطْلُعِ الشَّمْسُ',
      collection: 'صحيح مسلم',
      url: 'https://sunnah.com/muslim:612b',
    },
  ],
};

type TrustedQaItem = {
  title: string;
  category: string;
  scholar: string;
  source: string;
  summary: string;
  url: string;
};

const ONBOARDING_SOURCES: Record<
  AppLanguage,
  Array<{ label: string; url: string }>
> = {
  en: [
    {
      label: 'Dr. Mashhour Fawaz: making up prayers after puberty',
      url: 'https://www.fatawah.net/Fatawah/1255.aspx',
    },
    {
      label: 'Dar al-Iftaa al-Urdunniyah: making up missed prayers',
      url: 'https://www.aliftaa.jo/fatwa/2705/%D9%87%D9%84-%D9%8A%D8%AC%D9%88%D8%B2-%D9%82%D8%B6%D8%A7%D8%A1-%D8%A3%D9%83%D8%AB%D8%B1-%D9%85%D9%86-%D9%81%D8%B1%D8%B6-%D9%81%D8%A7%D8%A6%D8%AA-%D9%81%D9%8A-%D9%88%D9%82%D8%AA-%D9%83%D9%84-%D8%B5%D9%84%D8%A7%D8%A9',
    },
  ],
  ar: [
    {
      label: 'د. مشهور فواز: هل يجب قضاء الفوائت بعد البلوغ؟',
      url: 'https://www.fatawah.net/Fatawah/1255.aspx',
    },
    {
      label: 'دار الإفتاء الأردنية: قضاء الصلوات الفائتة',
      url: 'https://www.aliftaa.jo/fatwa/2705/%D9%87%D9%84-%D9%8A%D8%AC%D9%88%D8%B2-%D9%82%D8%B6%D8%A7%D8%A1-%D8%A3%D9%83%D8%AB%D8%B1-%D9%85%D9%86-%D9%81%D8%B1%D8%B6-%D9%81%D8%A7%D8%A6%D8%AA-%D9%81%D9%8A-%D9%88%D9%82%D8%AA-%D9%83%D9%84-%D8%B5%D9%84%D8%A7%D8%A9',
    },
  ],
};

const TRUSTED_QA: Record<AppLanguage, TrustedQaItem[]> = {
  en: [
    {
      title: 'Can I make up missed obligatory prayers during the time of a current prayer?',
      category: 'Prayer qadaa',
      scholar: 'Dar al-Iftaa al-Urdunniyah',
      source: 'aliftaa.jo',
      summary:
        'Missed obligatory prayers are a debt due to Allah and must be made up. Deliberately missed prayers should be made up immediately, even if that takes one’s available time.',
      url: 'https://www.aliftaa.jo/fatwa/2705/%D9%87%D9%84-%D9%8A%D8%AC%D9%88%D8%B2-%D9%82%D8%B6%D8%A7%D8%A1-%D8%A3%D9%83%D8%AB%D8%B1-%D9%85%D9%86-%D9%81%D8%B1%D8%B6-%D9%81%D8%A7%D8%A6%D8%AA-%D9%81%D9%8A-%D9%88%D9%82%D8%AA-%D9%83%D9%84-%D8%B5%D9%84%D8%A7%D8%A9',
    },
    {
      title: 'Can missed prayers be made up at disliked times?',
      category: 'Prayer qadaa',
      scholar: 'Dar al-Iftaa al-Urdunniyah',
      source: 'aliftaa.jo',
      summary:
        'Yes. Missed prayers may be made up at any time, including times in which voluntary prayer is otherwise disliked.',
      url: 'https://aliftaa.jo/fatwa/4339/',
    },
    {
      title: 'What if someone broke many Ramadan fasts without a valid excuse?',
      category: 'Fasting qadaa',
      scholar: 'Dar al-Iftaa al-Urdunniyah',
      source: 'aliftaa.jo',
      summary:
        'They must repent and make up the missed days. If the makeup was delayed until later Ramadans without excuse, feeding for each missed day is also due according to the answer.',
      url: 'https://aliftaa.jo/fatwa/4156/',
    },
    {
      title: 'Does foreplay or ejaculation in Ramadan require makeup?',
      category: 'Fasting qadaa',
      scholar: 'Dar al-Iftaa al-Urdunniyah',
      source: 'aliftaa.jo',
      summary:
        'If ejaculation happens through forbidden foreplay, the fast is invalid and that day must be made up. The answer distinguishes this from other cases and does not treat it as general kaffarah for every invalid fast.',
      url: 'https://www.aliftaa.jo/research-fatwas/2665/%D8%AD%D9%83%D9%85-%D8%A7%D9%84%D8%A7%D8%B3%D8%AA%D9%85%D9%86%D8%A7%D8%A1-%D9%81%D9%8A-%D9%86%D9%87%D8%A7%D8%B1-%D8%B1%D9%85%D8%B6%D8%A7%D9%86-%D9%84%D9%84%D8%B9%D9%84%D8%A7%D8%AC',
    },
    {
      title: 'Can kaffarah feeding be given to one poor person if many are hard to find?',
      category: 'Kafarah',
      scholar: 'Dar al-Iftaa al-Urdunniyah',
      source: 'aliftaa.jo',
      summary:
        'The answer discusses a permissive view when finding the full number is difficult, while still treating kaffarah as a distinct obligation with detailed rules.',
      url: 'https://aliftaa.jo/research-fatwas/3449/Articles',
    },
  ],
  ar: [
    {
      title: 'هل يجوز قضاء الصلوات الفائتة وقت الصلاة الحاضرة؟',
      category: 'قضاء الصلاة',
      scholar: 'دار الإفتاء الأردنية',
      source: 'aliftaa.jo',
      summary:
        'الصلوات الفائتة دين في ذمة المسلم ويجب قضاؤها. وما فات عمداً يجب المبادرة إلى قضائه بحسب الاستطاعة.',
      url: 'https://www.aliftaa.jo/fatwa/2705/%D9%87%D9%84-%D9%8A%D8%AC%D9%88%D8%B2-%D9%82%D8%B6%D8%A7%D8%A1-%D8%A3%D9%83%D8%AB%D8%B1-%D9%85%D9%86-%D9%81%D8%B1%D8%B6-%D9%81%D8%A7%D8%A6%D8%AA-%D9%81%D9%8A-%D9%88%D9%82%D8%AA-%D9%83%D9%84-%D8%B5%D9%84%D8%A7%D8%A9',
    },
    {
      title: 'هل يجوز قضاء الصلوات الفائتة في أوقات الكراهة؟',
      category: 'قضاء الصلاة',
      scholar: 'دار الإفتاء الأردنية',
      source: 'aliftaa.jo',
      summary:
        'نعم، يجوز قضاء الصلوات الفائتة في كل وقت، حتى في الأوقات التي تُكره فيها بعض النوافل.',
      url: 'https://aliftaa.jo/fatwa/4339/',
    },
    {
      title: 'ماذا يلزم من أفطر أياماً كثيرة من رمضان بلا عذر؟',
      category: 'قضاء الصيام',
      scholar: 'دار الإفتاء الأردنية',
      source: 'aliftaa.jo',
      summary:
        'يلزمه التوبة وقضاء الأيام الفائتة، وإذا أخر القضاء إلى رمضانات لاحقة بلا عذر لزمته الفدية عن كل يوم بحسب ما ورد في الجواب.',
      url: 'https://aliftaa.jo/fatwa/4156/',
    },
    {
      title: 'هل المباشرة أو الإنزال في نهار رمضان يوجب القضاء؟',
      category: 'قضاء الصيام',
      scholar: 'دار الإفتاء الأردنية',
      source: 'aliftaa.jo',
      summary:
        'إذا حصل الإنزال بسبب مباشرة محرمة فسد الصوم ووجب قضاء ذلك اليوم، مع التفريق بين هذه الصورة وبين الكفارة الخاصة.',
      url: 'https://www.aliftaa.jo/research-fatwas/2665/%D8%AD%D9%83%D9%85-%D8%A7%D9%84%D8%A7%D8%B3%D8%AA%D9%85%D9%86%D8%A7%D8%A1-%D9%81%D9%8A-%D9%86%D9%87%D8%A7%D8%B1-%D8%B1%D9%85%D8%B6%D8%A7%D9%86-%D9%84%D9%84%D8%B9%D9%84%D8%A7%D8%AC',
    },
    {
      title: 'هل يجوز دفع كفارة الإطعام لمسكين واحد عند التعذر؟',
      category: 'الكفارة',
      scholar: 'دار الإفتاء الأردنية',
      source: 'aliftaa.jo',
      summary:
        'يتناول الجواب وجهاً ميسراً عند صعوبة إيجاد العدد الكامل، مع بقاء الكفارة باباً مستقلاً له شروطه وتفصيله.',
      url: 'https://aliftaa.jo/research-fatwas/3449/Articles',
    },
  ],
};

function buildDailyReminderCopy(copy: CopyBlock) {
  return {
    title: copy.notificationPromptTitle,
    body: copy.notificationPromptBody,
    countActionTitle: copy.notificationActionCounted,
    undoActionTitle: copy.notificationActionUndo,
  };
}

function buildShafiiEstimate({
  language,
  latestPubertyAge,
  regularPrayerAge,
  menstruationDays,
}: {
  language: AppLanguage;
  latestPubertyAge: string;
  regularPrayerAge: string;
  menstruationDays: string;
}): OnboardingSetup | null {
  const parsedPubertyAge = Number(latestPubertyAge);
  const parsedRegularPrayerAge = Number(regularPrayerAge);
  const parsedMenstruationDays = Number(menstruationDays);

  if (
    Number.isNaN(parsedPubertyAge) ||
    Number.isNaN(parsedRegularPrayerAge) ||
    latestPubertyAge.trim() === '' ||
    regularPrayerAge.trim() === ''
  ) {
    return null;
  }

  const missedDays = estimateMissedDaysFromShafiiSetup({
    latestPubertyAge: parsedPubertyAge,
    regularPrayerAge: parsedRegularPrayerAge,
    menstruationDaysPerYear: Number.isNaN(parsedMenstruationDays) ? 0 : parsedMenstruationDays,
  });

  return {
    missedDays,
    target: countsFromMissedDays(missedDays),
    notes:
      language === 'ar'
        ? `تقدير شافعي: من سن ${parsedPubertyAge} إلى سن ${parsedRegularPrayerAge}.`
        : `Shafi'i estimate: counted from age ${parsedPubertyAge} to age ${parsedRegularPrayerAge}.`,
  };
}

function buildManualMissedDaysSetup(language: AppLanguage, manualMissedDays: string): OnboardingSetup | null {
  if (manualMissedDays.trim() === '') return null;

  const parsedDays = Number(manualMissedDays);
  if (Number.isNaN(parsedDays)) return null;

  const missedDays = Math.max(0, Math.round(parsedDays));

  return {
    missedDays,
    target: countsFromMissedDays(missedDays),
    notes:
      language === 'ar'
        ? `إدخال يدوي لأيام القضاء: ${missedDays} يوم.`
        : `Manual missed-days entry: ${missedDays} days.`,
  };
}

export default function App() {
  const [state, setState] = useState<AppState>(defaultAppState());
  const [loaded, setLoaded] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showInstallTour, setShowInstallTour] = useState(false);
  const [installTourSeen, setInstallTourSeen] = useState(false);
  const [hadithIndex, setHadithIndex] = useState(0);
  const [authSession, setAuthSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(isAuthConfigured);
  const [authBusyProvider, setAuthBusyProvider] = useState<'google' | 'facebook' | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const loadState = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const onboarded = await AsyncStorage.getItem(ONBOARD_KEY);
        const tourSeen = await AsyncStorage.getItem(TOUR_KEY);
        const storedHadithIndex = await AsyncStorage.getItem(HADITH_ROTATION_KEY);
        const backupAge = await getBackupAge();
        const hadithCount = DAILY_HADITH.en.length;
        const previousHadithIndex = storedHadithIndex ? Number(storedHadithIndex) : -1;
        const nextHadithIndex =
          Number.isInteger(previousHadithIndex) && previousHadithIndex >= 0
            ? (previousHadithIndex + 1) % hadithCount
            : 0;

        if (raw) {
          setState(hydrateState(JSON.parse(raw) as Partial<AppState>));
        }
        setInstallTourSeen(tourSeen === '1');
        setHadithIndex(nextHadithIndex);
        await AsyncStorage.setItem(HADITH_ROTATION_KEY, String(nextHadithIndex));
        if (!onboarded) {
          setShowOnboarding(true);
        } else if (!tourSeen) {
          setShowInstallTour(true);
        }
        if (backupAge) {
          console.log(`Last backup: ${Math.round(backupAge)} days ago`);
        }
      } catch (error) {
        console.warn('Failed to load app state', error);
      } finally {
        setLoaded(true);
      }
    };

    loadState();
  }, []);

  useEffect(() => {
    if (!loaded) return;

    const backupTimer = setInterval(async () => {
      await createBackup(state);
    }, AUTO_BACKUP_INTERVAL);

    createBackup(state);

    return () => clearInterval(backupTimer);
  }, [loaded, state]);

  useEffect(() => {
    if (!loaded) return;

    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch((error) => {
      console.warn('Failed to save app state', error);
    });
  }, [loaded, state]);

  useEffect(() => {
    if (!isAuthConfigured || !supabase) {
      setAuthLoading(false);
      return;
    }

    let mounted = true;

    loadSession()
      .then((session) => {
        if (mounted) {
          setAuthSession(session);
          setAuthLoading(false);
        }
      })
      .catch((error) => {
        console.warn('Failed to load auth session', error);
        if (mounted) {
          setAuthLoading(false);
          setAuthError(error instanceof Error ? error.message : 'Failed to load account');
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setAuthSession(session);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    ensureNotificationInfrastructure(buildDailyReminderCopy(COPY[state.language])).catch((error) => {
      console.warn('Failed to configure notifications', error);
    });
  }, [state.language]);

  useEffect(() => {
    const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as { kind?: string } | undefined;
      if (data?.kind !== DAILY_REMINDER_KIND) return;

      if (response.actionIdentifier === DAILY_REMINDER_COUNT_ACTION_ID) {
        setState((current) => applyFullDayCompletion(current));
      }

      if (response.actionIdentifier === DAILY_REMINDER_UNDO_ACTION_ID) {
        setState((current) => rollbackFullDayCompletion(current));
      }
    };

    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) {
          handleNotificationResponse(response);
          Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
        }
      })
      .catch((error) => {
        console.warn('Failed to load last notification response', error);
      });

    const subscription = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

    return () => {
      subscription.remove();
    };
  }, []);

  const totals = useMemo<Totals>(() => {
    const target = totalCounts(state.target);
    const completed = totalCounts(state.completed);
    const remaining = remainingCounts(state.target, state.completed);
    const today = totalCounts(state.todayCompleted);
    return { target, completed, remaining, today };
  }, [state]);

  const dailyHistory = useMemo(() => getRecentDailyActivity(state.log, 366), [state.log]);

  const incrementCompleted = (prayer: PrayerKey) => {
    setState((current) => applyPrayerCompletion(current, prayer));
  };

  const decrementCompleted = (prayer: PrayerKey) => {
    setState((current) => rollbackPrayerCompletion(current, prayer));
  };

  const incrementCompletedForDay = (prayer: PrayerKey, dayKey: string) => {
    setState((current) => applyPrayerCompletionForDay(current, prayer, dayKey));
  };

  const decrementCompletedForDay = (prayer: PrayerKey, dayKey: string) => {
    setState((current) => rollbackPrayerCompletionForDay(current, prayer, dayKey));
  };

  const completeQadaaDay = () => {
    setState((current) => applyFullDayCompletion(current));
  };

  const undoQadaaDay = () => {
    setState((current) => rollbackFullDayCompletion(current));
  };

  const updateLanguage = (language: AppLanguage) => {
    setState((current) => ({ ...current, language }));

    if (state.notificationEnabled) {
      scheduleDailyReminderNotification({
        hour: state.notificationHour,
        minute: state.notificationMinute,
        copy: buildDailyReminderCopy(COPY[language]),
        existingIdentifier: state.notificationScheduleId,
      })
        .then((notificationScheduleId) => {
          setState((current) => ({ ...current, notificationScheduleId, language }));
        })
        .catch((error) => {
          console.warn('Failed to refresh notification language', error);
        });
    }
  };

  const enableDailyReminder = useCallback(async () => {
    const copy = COPY[state.language];
    const granted = await requestNotificationPermissionAsync();

    if (!granted) {
      Alert.alert(copy.notificationTitle, copy.notificationPermissionDenied);
      return;
    }

    try {
      const notificationScheduleId = await scheduleDailyReminderNotification({
        hour: state.notificationHour,
        minute: state.notificationMinute,
        copy: buildDailyReminderCopy(copy),
        existingIdentifier: state.notificationScheduleId,
      });

      setState((current) => ({
        ...current,
        notificationEnabled: true,
        notificationScheduleId,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to schedule reminder.';
      Alert.alert(copy.notificationTitle, message);
    }
  }, [
    state.language,
    state.notificationHour,
    state.notificationMinute,
    state.notificationScheduleId,
  ]);

  const disableDailyReminder = useCallback(async () => {
    await cancelDailyReminderNotification(state.notificationScheduleId);
    setState((current) => ({
      ...current,
      notificationEnabled: false,
      notificationScheduleId: null,
    }));
  }, [state.notificationScheduleId]);

  const updateDailyReminderTime = useCallback(
    async (hour: number, minute: number) => {
      const copy = COPY[state.language];
      const formattedTime = formatReminderTime(hour, minute, state.language);

      try {
        if (state.notificationEnabled) {
          const notificationScheduleId = await scheduleDailyReminderNotification({
            hour,
            minute,
            copy: buildDailyReminderCopy(copy),
            existingIdentifier: state.notificationScheduleId,
          });

          setState((current) => ({
            ...current,
            notificationHour: hour,
            notificationMinute: minute,
            notificationScheduleId,
          }));
          Alert.alert(copy.notificationTitle, `${copy.notificationTimeSaved} ${formattedTime}`);
          return;
        }

        setState((current) => ({
          ...current,
          notificationHour: hour,
          notificationMinute: minute,
        }));

        Alert.alert(copy.notificationTitle, `${copy.notificationTimeSaved} ${formattedTime}`);
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update reminder time.';
        Alert.alert(copy.notificationTitle, message);
      }
    },
    [state.language, state.notificationEnabled, state.notificationScheduleId]
  );

  const sendTestReminder = useCallback(async () => {
    const copy = COPY[state.language];
    const granted = await requestNotificationPermissionAsync();

    if (!granted) {
      Alert.alert(copy.notificationTitle, copy.notificationPermissionDenied);
      return;
    }

    try {
      await sendTestReminderNotification(buildDailyReminderCopy(copy));
      Alert.alert(copy.notificationTitle, copy.notificationTestScheduled);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send test reminder.';
      Alert.alert(copy.notificationTitle, message);
    }
  }, [state.language]);

  const resetToday = () => {
    const copy = COPY[state.language];
    Alert.alert(copy.resetToday, copy.resetToday, [
      { text: copy.cancel, style: 'cancel' },
      {
        text: copy.resetToday,
        style: 'destructive',
        onPress: () => setState((current) => clearTodayPrayerProgress(current)),
      },
    ]);
  };

  const dismissOnboarding = async (setup?: OnboardingSetup) => {
    try {
      await AsyncStorage.setItem(ONBOARD_KEY, '1');
    } catch (error) {
      console.warn('Failed to save onboarding state', error);
    }

    if (setup) {
      setState((current) => ({
        ...current,
        target: setup.target ?? current.target,
        profileName: setup.profileName?.trim() ? setup.profileName.trim() : current.profileName,
        profileAge: setup.profileAge?.trim() ? setup.profileAge.trim() : current.profileAge,
        profileEmail: setup.profileEmail?.trim()
          ? setup.profileEmail.trim()
          : current.profileEmail,
        notes: current.notes === DEFAULT_NOTES ? setup.notes : `${setup.notes}\n\n${current.notes}`,
      }));
    }

    setShowOnboarding(false);
    if (!installTourSeen) {
      setShowInstallTour(true);
    }
  };

  const finishInstallTour = useCallback(async () => {
    try {
      await AsyncStorage.setItem(TOUR_KEY, '1');
    } catch (error) {
      console.warn('Failed to persist install tour state', error);
    }
    setInstallTourSeen(true);
    setShowInstallTour(false);
  }, []);

  const handleExport = useCallback(async () => {
    const copy = COPY[state.language];
    try {
      const exportData = await exportBackup();

      if (!exportData) {
        Alert.alert(copy.exportBackup, copy.backupExportFailure);
        return;
      }

      await Share.share({
        message: exportData,
        title: copy.exportBackup,
      });
      Alert.alert(copy.exportBackup, copy.backupExportSuccess);
    } catch (error) {
      const message = error instanceof Error ? error.message : copy.backupExportFailure;
      Alert.alert(copy.exportBackup, message);
    }
  }, [state.language]);

  const handleImport = useCallback(async () => {
    const copy = COPY[state.language];
    Alert.alert(copy.importBackup, copy.backupImportConfirm, [
      { text: copy.cancel, style: 'cancel' },
      {
        text: copy.importBackup,
        style: 'destructive',
        onPress: async () => {
          try {
            const restored = await restoreBackup();

            if (!restored) {
              Alert.alert(copy.importBackup, copy.backupImportFailure);
              return;
            }

            setState(hydrateState(restored));
            Alert.alert(copy.importBackup, copy.backupImportSuccess);
          } catch (error) {
            const message = error instanceof Error ? error.message : copy.backupImportFailure;
            Alert.alert(copy.importBackup, message);
          }
        },
      },
    ]);
  }, [state.language]);

  const handleUpdateTarget = useCallback((setup: OnboardingSetup) => {
    setState((current) => ({
      ...current,
      target: setup.target ?? current.target,
      notes: current.notes === DEFAULT_NOTES ? setup.notes : `${setup.notes}\n\n${current.notes}`,
    }));
  }, []);

  const handleProviderSignIn = useCallback(
    async (provider: 'google' | 'facebook') => {
      if (authBusyProvider) return;
      const providerLabel =
        state.language === 'ar'
          ? provider === 'google'
            ? 'جوجل'
            : 'فيسبوك'
          : provider === 'google'
            ? 'Google'
            : 'Facebook';
      if (Constants.appOwnership === 'expo') {
        Alert.alert(
          state.language === 'ar'
            ? `تسجيل الدخول عبر ${providerLabel}`
            : `${providerLabel} sign-in`,
          state.language === 'ar'
            ? 'تسجيل الدخول الاجتماعي يحتاج إلى نسخة تطويرية من التطبيق. شغّل `npx expo run:android` أو `npx expo run:ios` ثم جرّب مرة أخرى.'
            : 'Social sign-in needs a development build. Please run the app with `npx expo run:android` or `npx expo run:ios`, then try again.'
        );
        return;
      }
      try {
        setAuthError(null);
        setAuthBusyProvider(provider);
        await signInWithProvider(provider);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : state.language === 'ar'
              ? 'تعذر تسجيل الدخول.'
              : 'Sign-in failed.';
        setAuthError(message);
        Alert.alert(providerLabel, message);
      } finally {
        setAuthBusyProvider(null);
      }
    },
    [authBusyProvider, state.language]
  );

  const handleSignOut = useCallback(async () => {
    try {
      setAuthError(null);
      await signOutUser();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : state.language === 'ar'
            ? 'تعذر تسجيل الخروج.'
            : 'Sign-out failed.';
      setAuthError(message);
      Alert.alert(state.language === 'ar' ? 'تسجيل الخروج' : 'Sign out', message);
    }
  }, [state.language]);

  const accountProfile = useMemo<AccountProfile>(() => getUserProfile(authSession?.user ?? null), [authSession]);

  return (
    <ImageBackground source={APP_BACKGROUND} style={styles.backgroundImage} imageStyle={styles.backgroundImageAsset}>
      <View style={styles.backgroundTint}>
        <StatusBar style="light" />
        {showOnboarding ? (
          <OnboardingScreen
            language={state.language}
            onLanguageChange={updateLanguage}
            accountProfile={accountProfile}
            authBusyProvider={authBusyProvider}
            authError={authError}
            onGoogleSignIn={() => handleProviderSignIn('google')}
            onComplete={dismissOnboarding}
          />
        ) : (
          <MainApp
            state={state}
            setState={setState}
            totals={totals}
            dailyHistory={dailyHistory}
            incrementCompleted={incrementCompleted}
            decrementCompleted={decrementCompleted}
            incrementCompletedForDay={incrementCompletedForDay}
            decrementCompletedForDay={decrementCompletedForDay}
            completeQadaaDay={completeQadaaDay}
            undoQadaaDay={undoQadaaDay}
            resetToday={resetToday}
            hadithIndex={hadithIndex}
            onLanguageChange={updateLanguage}
            handleExport={handleExport}
            handleImport={handleImport}
            authConfigured={isAuthConfigured}
            accountProfile={accountProfile}
            authLoading={authLoading}
            authBusyProvider={authBusyProvider}
            authError={authError}
            onGoogleSignIn={() => handleProviderSignIn('google')}
            onSignOut={handleSignOut}
            notificationEnabled={state.notificationEnabled}
            notificationHour={state.notificationHour}
            notificationMinute={state.notificationMinute}
            onEnableDailyReminder={enableDailyReminder}
            onDisableDailyReminder={disableDailyReminder}
            onNotificationTimeChange={updateDailyReminderTime}
            onSendTestReminder={sendTestReminder}
            onUpdateTarget={handleUpdateTarget}
            onDefaultDailyAddDaysChange={(defaultDailyAddDays) =>
              setState((current) => ({ ...current, defaultDailyAddDays }))
            }
            showInstallTour={showInstallTour}
            onFinishInstallTour={finishInstallTour}
          />
        )}
      </View>
    </ImageBackground>
  );
}

function LanguageToggle({
  language,
  onChange,
}: {
  language: AppLanguage;
  onChange: (language: AppLanguage) => void;
}) {
  return (
    <View style={styles.languageToggle}>
      {(['en', 'ar'] as AppLanguage[]).map((option) => (
        <Pressable
          key={option}
          onPress={() => onChange(option)}
          style={[styles.languageButton, language === option && styles.languageButtonActive]}
        >
          <Text
            style={[
              styles.languageButtonText,
              language === option && styles.languageButtonTextActive,
            ]}
          >
            {option === 'en' ? 'EN' : 'العربية'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function TabBar({
  activeTab,
  onChange,
  copy,
  fastingEnabled,
}: {
  activeTab: AppTab;
  onChange: (tab: AppTab) => void;
  copy: CopyBlock;
  fastingEnabled: boolean;
}) {
  const tabs: { key: AppTab; label: string }[] = [
    { key: 'home', label: copy.homeTab },
    { key: 'history', label: copy.historyTab },
    ...(fastingEnabled ? [{ key: 'fasting' as AppTab, label: copy.fastingTab }] : []),
    { key: 'answers', label: copy.answersTab },
    { key: 'more', label: copy.moreTab },
  ];

  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => (
        <Pressable
          key={tab.key}
          onPress={() => onChange(tab.key)}
          style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]}
        >
          <Text style={[styles.tabButtonText, activeTab === tab.key && styles.tabButtonTextActive]}>
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function OnboardingScreen({
  language,
  onLanguageChange,
  accountProfile,
  authBusyProvider,
  authError,
  onGoogleSignIn,
  onComplete,
}: {
  language: AppLanguage;
  onLanguageChange: (language: AppLanguage) => void;
  accountProfile: AccountProfile;
  authBusyProvider: 'google' | 'facebook' | null;
  authError: string | null;
  onGoogleSignIn: () => void;
  onComplete: (setup?: OnboardingSetup) => void;
}) {
  const [estimateMode, setEstimateMode] = useState<'estimate' | 'manual'>('estimate');
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [manualMissedDays, setManualMissedDays] = useState('');
  const [latestPubertyAge, setLatestPubertyAge] = useState('15');
  const [regularPrayerAge, setRegularPrayerAge] = useState('');
  const [menstruationDays, setMenstruationDays] = useState('0');
  const copy = COPY[language];
  const estimate = useMemo(
    () =>
      buildShafiiEstimate({
        language,
        latestPubertyAge,
        regularPrayerAge,
        menstruationDays,
      }),
    [language, latestPubertyAge, regularPrayerAge, menstruationDays]
  );
  const manualSetup = useMemo(
    () => buildManualMissedDaysSetup(language, manualMissedDays),
    [language, manualMissedDays]
  );
  const selectedSetup = estimateMode === 'manual' ? manualSetup : estimate;

  useEffect(() => {
    if (!accountProfile) return;

    setProfileName((current) => current || accountProfile.name || '');
    setProfileEmail((current) => current || accountProfile.email || '');
  }, [accountProfile]);

  const trimmedProfileEmail = profileEmail.trim();
  const isEmailValid = trimmedProfileEmail === '' || EMAIL_REGEX.test(trimmedProfileEmail);
  const canContinue = isEmailValid && selectedSetup !== null;

  const onboardingPayload = (base?: OnboardingSetup): OnboardingSetup => ({
    ...base,
    notes:
      base?.notes ??
      (language === 'ar'
        ? 'بدء التطبيق ببيانات تعريفية أساسية قبل تقدير القضاء.'
        : 'Started the app with basic profile details before the qadaa estimate.'),
    profileName: profileName.trim(),
    profileEmail: trimmedProfileEmail,
  });

  return (
    <View style={styles.onboarding}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.onboardingScrollContent}>
          <View style={styles.onboardingCard}>
            <View style={styles.onboardingHeaderOrnament}>
              <Text style={styles.onboardingBismillah}>بِسْمِ اللَّهِ</Text>
              <Text style={styles.onboardingBismillahSub}>
                {language === 'ar' ? 'باسم الله' : 'In the name of Allah'}
              </Text>
            </View>

            <DividerOrnament />

            <Text style={[styles.onboardingTitle, isArabic(language) && styles.alignRight]}>
              {copy.onboardingTitle}
            </Text>
            <Text style={[styles.onboardingSubtitle, isArabic(language) && styles.alignRight]}>
              {copy.onboardingSubtitle}
            </Text>

            <View style={styles.setupCard}>
              <View style={styles.onboardingTopRow}>
                <View style={{ flex: 1 }} />
                <LanguageToggle language={language} onChange={onLanguageChange} />
              </View>
              <Text style={[styles.setupTitle, isArabic(language) && styles.alignRight]}>
                {copy.onboardingEstimateTitle}
              </Text>
              <Text style={[styles.setupBody, isArabic(language) && styles.alignRight]}>
                {copy.onboardingEstimateBody}
              </Text>

              <View style={styles.modeToggleRow}>
                <Text style={[styles.setupFieldLabel, isArabic(language) && styles.alignRight]}>
                  {copy.onboardingMethodTitle}
                </Text>
                <View style={styles.modeToggle}>
                  <Pressable
                    onPress={() => setEstimateMode('estimate')}
                    style={[styles.modeToggleButton, estimateMode === 'estimate' && styles.modeToggleButtonActive]}
                  >
                    <Text
                      style={[
                        styles.modeToggleButtonText,
                        estimateMode === 'estimate' && styles.modeToggleButtonTextActive,
                      ]}
                    >
                      {copy.onboardingMethodEstimate}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setEstimateMode('manual')}
                    style={[styles.modeToggleButton, estimateMode === 'manual' && styles.modeToggleButtonActive]}
                  >
                    <Text
                      style={[
                        styles.modeToggleButtonText,
                        estimateMode === 'manual' && styles.modeToggleButtonTextActive,
                      ]}
                    >
                      {copy.onboardingMethodManual}
                    </Text>
                  </Pressable>
                </View>
              </View>

              <ShafiiEstimateFields
                language={language}
                mode={estimateMode}
                manualMissedDays={manualMissedDays}
                onManualMissedDaysChange={setManualMissedDays}
                latestPubertyAge={latestPubertyAge}
                regularPrayerAge={regularPrayerAge}
                menstruationDays={menstruationDays}
                onLatestPubertyAgeChange={setLatestPubertyAge}
                onRegularPrayerAgeChange={setRegularPrayerAge}
                onMenstruationDaysChange={setMenstruationDays}
                estimate={selectedSetup}
              />

              <View style={styles.setupField}>
                <Text style={[styles.setupFieldLabel, isArabic(language) && styles.alignRight]}>
                  {copy.onboardingAutoCountTitle}
                </Text>
                <Text style={[styles.setupFieldHint, isArabic(language) && styles.alignRight]}>
                  {copy.onboardingAutoCountBody}
                </Text>
              </View>
            </View>

            <View style={styles.setupCard}>
              <Text style={[styles.setupTitle, isArabic(language) && styles.alignRight]}>
                {copy.profileSetupTitle}
              </Text>
              <Text style={[styles.setupBody, isArabic(language) && styles.alignRight]}>
                {copy.profileSetupBody}
              </Text>

              <View style={styles.setupField}>
                <Text style={[styles.setupFieldLabel, isArabic(language) && styles.alignRight]}>
                  {copy.profileNameLabel}
                </Text>
                <Text style={[styles.setupFieldHint, isArabic(language) && styles.alignRight]}>
                  {copy.profileNameHint}
                </Text>
                <TextInput
                  value={profileName}
                  onChangeText={setProfileName}
                  style={styles.setupInput}
                  placeholder={language === 'ar' ? 'الاسم' : 'Your name'}
                  placeholderTextColor={COLORS.mutedText}
                />
              </View>

              <View style={styles.setupField}>
                <Text style={[styles.setupFieldLabel, isArabic(language) && styles.alignRight]}>
                  {copy.profileEmailLabel}
                </Text>
                <Text style={[styles.setupFieldHint, isArabic(language) && styles.alignRight]}>
                  {copy.profilePrefillHint}
                </Text>
                <TextInput
                  value={profileEmail}
                  onChangeText={setProfileEmail}
                  style={styles.setupInput}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder={language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                  placeholderTextColor={COLORS.mutedText}
                />
                {trimmedProfileEmail !== '' && !isEmailValid ? (
                  <Text style={[styles.accountError, isArabic(language) && styles.alignRight]}>
                    {copy.profileEmailInvalid}
                  </Text>
                ) : null}
              </View>

              <View style={styles.authButtons}>
                <TouchableOpacity onPress={onGoogleSignIn} style={styles.oauthButtonPrimary}>
                  <View style={styles.oauthButtonRow}>
                    <Text style={styles.oauthButtonBrandPrimary}>G</Text>
                    <Text style={styles.oauthButtonPrimaryText}>{copy.prefillFromGoogle}</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {accountProfile ? (
                <Text style={[styles.accountMeta, isArabic(language) && styles.alignRight]}>
                  {accountProfile.name}
                  {accountProfile.email ? ` • ${accountProfile.email}` : ''}
                </Text>
              ) : null}

              {authBusyProvider ? (
                <View style={styles.accountLoadingRow}>
                  <ActivityIndicator color={COLORS.gold} />
                  <Text style={[styles.accountBody, isArabic(language) && styles.alignRight]}>
                    {copy.prefillFromGoogle}
                  </Text>
                </View>
              ) : null}

              {authError ? (
                <Text style={[styles.accountError, isArabic(language) && styles.alignRight]}>
                  {authError}
                </Text>
              ) : null}
            </View>

            <View style={styles.onboardingButtons}>
              <Pressable
                onPress={canContinue ? () => onComplete(onboardingPayload(selectedSetup ?? undefined)) : undefined}
                style={[styles.onboardingButton, !canContinue && styles.onboardingButtonDisabled]}
              >
                <Text style={[styles.onboardingButtonText, !canContinue && styles.onboardingButtonTextDisabled]}>
                  {selectedSetup ? copy.useEstimate : copy.startNow}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function InstallTour({
  language,
  visible,
  activeTab,
  onNavigate,
  onDone,
}: {
  language: AppLanguage;
  visible: boolean;
  activeTab: AppTab;
  onNavigate: (tab: AppTab) => void;
  onDone: () => Promise<void> | void;
}) {
  const copy = COPY[language];
  const [stepIndex, setStepIndex] = useState(0);
  const steps = [
    {
      tab: 'home' as AppTab,
      title: copy.installTourHomeTitle,
      body: copy.installTourHomeBody,
    },
    {
      tab: 'history' as AppTab,
      title: copy.installTourHistoryTitle,
      body: copy.installTourHistoryBody,
    },
    {
      tab: 'answers' as AppTab,
      title: copy.installTourAnswersTitle,
      body: copy.installTourAnswersBody,
    },
    {
      tab: 'more' as AppTab,
      title: copy.installTourMoreTitle,
      body: copy.installTourMoreBody,
    },
  ];
  const tabLabels: Record<AppTab, string> = {
    home: copy.homeTab,
    history: copy.historyTab,
    fasting: copy.fastingTab,
    answers: copy.answersTab,
    more: copy.moreTab,
  };

  useEffect(() => {
    if (visible) {
      setStepIndex(0);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    onNavigate(steps[stepIndex].tab);
  }, [visible, stepIndex, onNavigate]);

  if (!visible) return null;

  const currentStep = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;

  const handleNext = async () => {
    if (!isLastStep) {
      setStepIndex((current) => Math.min(current + 1, steps.length - 1));
      return;
    }

    await onDone();
  };

  return (
    <View style={styles.tourBannerWrap} pointerEvents="box-none">
      <View style={styles.tourBanner}>
        <View style={styles.tourHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.tourEyebrow}>
              {copy.installTourTitle} {stepIndex + 1}/{steps.length}
            </Text>
            <Text style={[styles.tourTitle, isArabic(language) && styles.alignRight]}>
              {currentStep.title}
            </Text>
          </View>
          <Pressable onPress={onDone} style={styles.tourSkipButton}>
            <Text style={styles.tourSkipText}>{copy.installTourSkip}</Text>
          </Pressable>
        </View>

        <View style={styles.tourTabRow}>
          {(['home', 'history', 'answers', 'more'] as AppTab[]).map((tab) => (
            <View
              key={tab}
              style={[styles.tourTabChip, activeTab === tab && styles.tourTabChipActive]}
            >
              <Text style={[styles.tourTabChipText, activeTab === tab && styles.tourTabChipTextActive]}>
                {tabLabels[tab]}
              </Text>
            </View>
          ))}
        </View>

        <Text style={[styles.tourBody, isArabic(language) && styles.alignRight]}>
          {currentStep.body}
        </Text>

        <View style={styles.tourDots}>
          {steps.map((_, index) => (
            <View
              key={index}
              style={[styles.tourDot, index === stepIndex && styles.tourDotActive]}
            />
          ))}
        </View>

        <View style={styles.tourActions}>
          <Pressable onPress={handleNext} style={styles.onboardingButton}>
            <Text style={styles.onboardingButtonText}>{isLastStep ? copy.installTourDone : copy.installTourNext}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function SetupField({
  label,
  hint,
  value,
  onChangeText,
  placeholder,
  language,
}: {
  label: string;
  hint: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  language: AppLanguage;
}) {
  return (
    <View style={styles.setupField}>
      <Text style={[styles.setupFieldLabel, isArabic(language) && styles.alignRight]}>{label}</Text>
      <Text style={[styles.setupFieldHint, isArabic(language) && styles.alignRight]}>{hint}</Text>
      <TextInput
        keyboardType="number-pad"
        value={value}
        onChangeText={(next) => onChangeText(next.replace(/[^0-9.]/g, ''))}
        style={styles.setupInput}
        placeholder={placeholder}
        placeholderTextColor={COLORS.mutedText}
      />
    </View>
  );
}

function ShafiiEstimateFields({
  language,
  mode,
  manualMissedDays,
  onManualMissedDaysChange,
  latestPubertyAge,
  regularPrayerAge,
  menstruationDays,
  onLatestPubertyAgeChange,
  onRegularPrayerAgeChange,
  onMenstruationDaysChange,
  estimate,
}: {
  language: AppLanguage;
  mode: 'estimate' | 'manual';
  manualMissedDays: string;
  onManualMissedDaysChange: (value: string) => void;
  latestPubertyAge: string;
  regularPrayerAge: string;
  menstruationDays: string;
  onLatestPubertyAgeChange: (value: string) => void;
  onRegularPrayerAgeChange: (value: string) => void;
  onMenstruationDaysChange: (value: string) => void;
  estimate: OnboardingSetup | null;
}) {
  const copy = COPY[language];
  const [showWhy, setShowWhy] = useState(false);

  return (
    <>
      {mode === 'manual' ? (
        <SetupField
          label={copy.manualDaysLabel}
          hint={copy.manualDaysHint}
          value={manualMissedDays}
          onChangeText={onManualMissedDaysChange}
          placeholder="0"
          language={language}
        />
      ) : (
        <>
          <SetupField
            label={copy.latestPubertyAge}
            hint={copy.latestPubertyHint}
            value={latestPubertyAge}
            onChangeText={onLatestPubertyAgeChange}
            placeholder="15"
            language={language}
          />
          <SetupField
            label={copy.regularPrayerAge}
            hint={copy.regularPrayerHint}
            value={regularPrayerAge}
            onChangeText={onRegularPrayerAgeChange}
            placeholder="18"
            language={language}
          />
          <SetupField
            label={copy.menstruationDays}
            hint={copy.menstruationHint}
            value={menstruationDays}
            onChangeText={onMenstruationDaysChange}
            placeholder="0"
            language={language}
          />
        </>
      )}

      {estimate?.missedDays !== undefined ? (
        <View style={styles.estimateResult}>
          <Text style={[styles.estimateResultTitle, isArabic(language) && styles.alignRight]}>
            {copy.estimateBacklog}: {estimate.missedDays}
          </Text>
          <Text style={[styles.estimateResultBody, isArabic(language) && styles.alignRight]}>
            {copy.estimateBacklogBody}
          </Text>
        </View>
      ) : null}

      <View style={styles.trustCard}>
        <Pressable onPress={() => setShowWhy((current) => !current)} style={styles.trustToggleRow}>
          <Text style={[styles.trustCardTitle, isArabic(language) && styles.alignRight]}>
            {showWhy ? copy.onboardingWhyHide : copy.onboardingWhyShow}
          </Text>
          <Text style={styles.trustToggleIcon}>{showWhy ? '−' : '+'}</Text>
        </Pressable>
        {showWhy ? (
          <>
            <Text style={[styles.trustCardBody, isArabic(language) && styles.alignRight]}>
              {copy.onboardingTrustBody}
            </Text>
            {[copy.onboardingAssumption1, copy.onboardingAssumption2, copy.onboardingAssumption3].map(
              (assumption) => (
                <View key={assumption} style={styles.trustBulletRow}>
                  <View style={styles.trustBullet} />
                  <Text style={[styles.trustBulletText, isArabic(language) && styles.alignRight]}>
                    {assumption}
                  </Text>
                </View>
              )
            )}
            <Text style={[styles.trustCardNote, isArabic(language) && styles.alignRight]}>
              {copy.onboardingEditableNote}
            </Text>
            <View style={styles.trustLinks}>
              {ONBOARDING_SOURCES[language].map((item) => (
                <Pressable
                  key={item.url}
                  onPress={() => Linking.openURL(item.url)}
                  style={styles.sourceChip}
                >
                  <Text style={styles.sourceChipText}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
      </View>
    </>
  );
}

function MainApp({
  state,
  setState,
  totals,
  dailyHistory,
  incrementCompleted,
  decrementCompleted,
  incrementCompletedForDay,
  decrementCompletedForDay,
  completeQadaaDay,
  undoQadaaDay,
  resetToday,
  hadithIndex,
  onLanguageChange,
  authConfigured,
  accountProfile,
  authLoading,
  authBusyProvider,
  authError,
  onGoogleSignIn,
  onSignOut,
  notificationEnabled,
  notificationHour,
  notificationMinute,
  onEnableDailyReminder,
  onDisableDailyReminder,
  onNotificationTimeChange,
  onSendTestReminder,
  onUpdateTarget,
  onDefaultDailyAddDaysChange,
  showInstallTour,
  onFinishInstallTour,
  handleExport,
  handleImport,
}: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  totals: Totals;
  dailyHistory: DailyActivitySummary[];
  incrementCompleted: (prayer: PrayerKey) => void;
  decrementCompleted: (prayer: PrayerKey) => void;
  incrementCompletedForDay: (prayer: PrayerKey, dayKey: string) => void;
  decrementCompletedForDay: (prayer: PrayerKey, dayKey: string) => void;
  completeQadaaDay: () => void;
  undoQadaaDay: () => void;
  resetToday: () => void;
  hadithIndex: number;
  onLanguageChange: (language: AppLanguage) => void;
  authConfigured: boolean;
  accountProfile: AccountProfile;
  authLoading: boolean;
  authBusyProvider: 'google' | 'facebook' | null;
  authError: string | null;
  onGoogleSignIn: () => void;
  onSignOut: () => void;
  notificationEnabled: boolean;
  notificationHour: number;
  notificationMinute: number;
  onEnableDailyReminder: () => void;
  onDisableDailyReminder: () => void;
  onNotificationTimeChange: (hour: number, minute: number) => Promise<void>;
  onSendTestReminder: () => Promise<void>;
  onUpdateTarget: (setup: OnboardingSetup) => void;
  onDefaultDailyAddDaysChange: (defaultDailyAddDays: number) => void;
  showInstallTour: boolean;
  onFinishInstallTour: () => Promise<void> | void;
  handleExport: () => void;
  handleImport: () => void;
}) {
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [showPrayerRows, setShowPrayerRows] = useState(false);
  const copy = COPY[state.language];
  const hadithItems = DAILY_HADITH[state.language];
  const hadith = hadithItems[hadithIndex % hadithItems.length];
  const fastingRemainingDays = remainingFastingDays(
    state.fastingTargetDays,
    state.fastingCompletedDays
  );
  const fastingProgress = state.fastingTargetDays
    ? Math.min(state.fastingCompletedDays / state.fastingTargetDays, 1)
    : 0;
  const fastingHistory = useMemo(() => getRecentFastingActivity(state.fastingLog, 30), [state.fastingLog]);
  const fastingHistorySections = useMemo(
    () => groupFastingActivityByMonth(fastingHistory),
    [fastingHistory]
  );
  const progress = useMemo(() => {
    const percent = totals.target > 0 ? Math.min(totals.completed / totals.target, 1) : 0;
    const estimatedDaysLeft = estimateCompletionDays(
      totals.remaining,
      state.log,
      state.defaultDailyAddDays
    );
    const finishDate = estimateCompletionDate(
      totals.remaining,
      state.log,
      state.defaultDailyAddDays
    );

    return {
      percent,
      completedDays: totals.completed / PRAYERS_PER_QADAA_DAY,
      remainingDays: totals.remaining / PRAYERS_PER_QADAA_DAY,
      todayDays: totals.today / PRAYERS_PER_QADAA_DAY,
      estimatedDaysLeft:
        estimatedDaysLeft === null ? null : estimatedDaysLeft,
      finishDate,
    };
  }, [state.defaultDailyAddDays, state.log, totals]);
  useEffect(() => {
    if (!state.fastingEnabled && activeTab === 'fasting') {
      setActiveTab('home');
    }
  }, [activeTab, state.fastingEnabled]);

  const tourActiveTab = useMemo(() => {
    if (!showInstallTour) return activeTab;
    if (activeTab === 'fasting' && !state.fastingEnabled) return 'home';
    return activeTab;
  }, [activeTab, showInstallTour, state.fastingEnabled]);

  const completeFastingDay = () => {
    setState((current) => applyFastingCompletion(current));
  };

  const undoFastingDay = () => {
    setState((current) => rollbackFastingCompletion(current));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
      <View style={styles.appShell}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.headerCard}>
            <View style={styles.headerTopRow}>
              <Text style={styles.eyebrow}>{copy.dailyHadithTitle}</Text>
            </View>
            <DividerOrnament color={COLORS.gold} />
            <Pressable onPress={() => Linking.openURL(hadith.url)} style={styles.hadithCard}>
              <View style={[styles.hadithBadge, isArabic(state.language) && styles.hadithBadgeArabic]}>
                <Text style={styles.hadithLabel}>{hadith.collection}</Text>
              </View>
              <Text
                style={[
                  styles.hadithText,
                  isArabic(state.language) && styles.hadithTextArabic,
                  isArabic(state.language) && styles.alignRight,
                ]}
              >
                {hadith.text}
              </Text>
            </Pressable>
          </View>

          {activeTab === 'home' ? (
            <>
              <ProgressOverview
                copy={copy}
                totals={totals}
                progress={progress}
                defaultDailyAddDays={state.defaultDailyAddDays}
                language={state.language}
              />

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, isArabic(state.language) && styles.alignRight]}>
                    {copy.quickAddTitle}
                  </Text>
                  <Pressable onPress={resetToday} style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>{copy.resetToday}</Text>
                  </Pressable>
                </View>

                <View style={styles.dayActionCard}>
                  <View style={styles.dayActionInfo}>
                    <View style={styles.dayActionBadge}>
                      <Text style={styles.dayActionBadgeText}>{copy.fullDayToday}</Text>
                    </View>
                    <Text style={[styles.dayActionTitle, isArabic(state.language) && styles.alignRight]}>
                      {copy.fullDayTitle}
                    </Text>
                    <Text
                      style={[styles.dayActionSubtitle, isArabic(state.language) && styles.alignRight]}
                    >
                      {copy.fullDayPrimary}
                    </Text>
                    <Text style={[styles.dayActionMeta, isArabic(state.language) && styles.alignRight]}>
                      {copy.fullDaySecondary}
                    </Text>
                  </View>
                  <View style={styles.dayActionButtons}>
                    <Pressable onPress={completeQadaaDay} style={styles.fullDayButton}>
                      <Text style={styles.fullDayButtonText}>{copy.addDay}</Text>
                    </Pressable>
                    <Pressable onPress={undoQadaaDay} style={styles.dayActionSecondaryButton}>
                      <Text style={styles.minusButtonText}>{copy.undoDay}</Text>
                    </Pressable>
                  </View>
                </View>

                <Pressable
                  onPress={() => setShowPrayerRows((current) => !current)}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>
                    {showPrayerRows ? copy.hidePrayerRows : copy.showPrayerRows}
                  </Text>
                </Pressable>

                {showPrayerRows
                  ? PRAYER_KEYS.map((prayer) => {
                      const prayerInfo = PRAYER_LABELS[prayer];
                      const remaining = Math.max(state.target[prayer] - state.completed[prayer], 0);
                      return (
                        <View key={prayer} style={styles.prayerCard}>
                          <View style={styles.prayerInfo}>
                            <Text
                              style={[styles.prayerLabel, isArabic(state.language) && styles.alignRight]}
                            >
                              {state.language === 'ar' ? prayerInfo.arabic : prayerInfo.label}
                            </Text>
                            <Text
                              style={[styles.prayerMeta, isArabic(state.language) && styles.alignRight]}
                            >
                              {copy.doneLabel} {state.completed[prayer]} / {state.target[prayer]} ·{' '}
                              {remaining} {copy.remainingLabel}
                            </Text>
                          </View>

                          <View style={styles.actionsColumn}>
                            <Pressable
                              onPress={() => incrementCompleted(prayer)}
                              style={[styles.addButton, { backgroundColor: COLORS.forestGreen }]}
                            >
                              <Text style={styles.addButtonText}>+1</Text>
                            </Pressable>
                            <Pressable
                              onPress={() => decrementCompleted(prayer)}
                              style={styles.minusButton}
                            >
                              <Text style={styles.minusButtonText}>{copy.undo}</Text>
                            </Pressable>
                          </View>
                        </View>
                      );
                    })
                  : null}
              </View>
            </>
          ) : null}

          {activeTab === 'history' ? (
            <HistoryTab
              copy={copy}
              language={state.language}
              dailyHistory={dailyHistory}
              onIncrementPrayerForDay={incrementCompletedForDay}
              onDecrementPrayerForDay={decrementCompletedForDay}
            />
          ) : null}

          {activeTab === 'fasting' && state.fastingEnabled ? (
            <FastingTab
              copy={copy}
              language={state.language}
              targetDays={state.fastingTargetDays}
              completedDays={state.fastingCompletedDays}
              remainingDays={fastingRemainingDays}
              progress={fastingProgress}
              history={fastingHistory}
              historySections={fastingHistorySections}
              kafarahDays={state.fastingKafarahDays}
              onAddDay={completeFastingDay}
              onUndoDay={undoFastingDay}
            />
          ) : null}

          {activeTab === 'answers' ? (
            <AnswersTab copy={copy} language={state.language} />
          ) : null}

          {activeTab === 'more' ? (
            <MoreTab
              copy={copy}
              language={state.language}
              onLanguageChange={onLanguageChange}
              notificationEnabled={notificationEnabled}
              notificationHour={notificationHour}
              notificationMinute={notificationMinute}
              onEnableDailyReminder={onEnableDailyReminder}
              onDisableDailyReminder={onDisableDailyReminder}
              target={state.target}
              onUpdateTarget={onUpdateTarget}
              defaultDailyAddDays={state.defaultDailyAddDays}
              onDefaultDailyAddDaysChange={onDefaultDailyAddDaysChange}
              fastingEnabled={state.fastingEnabled}
              fastingTargetDays={state.fastingTargetDays}
              fastingCompletedDays={state.fastingCompletedDays}
              fastingKafarahDays={state.fastingKafarahDays}
              onFastingEnabledChange={(fastingEnabled) =>
                setState((current) => ({ ...current, fastingEnabled }))
              }
              onFastingTargetDaysChange={(fastingTargetDays) =>
                setState((current) => ({ ...current, fastingTargetDays }))
              }
              onFastingKafarahDaysChange={(fastingKafarahDays) =>
                setState((current) => ({ ...current, fastingKafarahDays }))
              }
              authConfigured={authConfigured}
              accountProfile={accountProfile}
              authLoading={authLoading}
              authBusyProvider={authBusyProvider}
              authError={authError}
              onGoogleSignIn={onGoogleSignIn}
              onSignOut={onSignOut}
              notes={state.notes}
              onNotesChange={(notes) => setState((current) => ({ ...current, notes }))}
              handleExport={handleExport}
              handleImport={handleImport}
            />
          ) : null}
        </ScrollView>

        <TabBar
          activeTab={activeTab}
          onChange={setActiveTab}
          copy={copy}
          fastingEnabled={state.fastingEnabled}
        />
        <InstallTour
          language={state.language}
          visible={showInstallTour}
          activeTab={tourActiveTab}
          onNavigate={setActiveTab}
          onDone={onFinishInstallTour}
        />
      </View>
    </SafeAreaView>
  );
}

function HistoryTab({
  copy,
  language,
  dailyHistory,
  onIncrementPrayerForDay,
  onDecrementPrayerForDay,
}: {
  copy: CopyBlock;
  language: AppLanguage;
  dailyHistory: DailyActivitySummary[];
  onIncrementPrayerForDay: (prayer: PrayerKey, dayKey: string) => void;
  onDecrementPrayerForDay: (prayer: PrayerKey, dayKey: string) => void;
}) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [showDayDetails, setShowDayDetails] = useState(false);
  const monthDate = useMemo(() => {
    const base = new Date();
    return new Date(base.getFullYear(), base.getMonth() + monthOffset, 1);
  }, [monthOffset]);
  const monthLabel = monthDate.toLocaleDateString(language === 'ar' ? 'ar' : 'en', {
    month: 'long',
    year: 'numeric',
  });
  const monthDays = useMemo(() => buildMonthCalendar(monthDate, dailyHistory), [dailyHistory, monthDate]);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const selectedDay =
    monthDays.find((day) => day.dayKey === selectedDayKey) ??
    monthDays.find((day) => !day.isOutsideMonth && day.totalCount > 0) ??
    monthDays.find((day) => !day.isOutsideMonth) ??
    null;

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, isArabic(language) && styles.alignRight]}>{copy.historyTitle}</Text>
      <Text style={[styles.sectionHint, isArabic(language) && styles.alignRight]}>{copy.historyHint}</Text>
      <Text style={[styles.calendarLegendText, isArabic(language) && styles.alignRight]}>
        {copy.calendarLegend}
      </Text>

      <View style={styles.calendarMonthHeader}>
        <Pressable onPress={() => setMonthOffset((current) => current - 1)} style={styles.monthNavButton}>
          <Text style={styles.monthNavButtonText}>{copy.previousMonth}</Text>
        </Pressable>
        <Text style={[styles.calendarMonthLabel, isArabic(language) && styles.alignRight]}>{monthLabel}</Text>
        <Pressable onPress={() => setMonthOffset((current) => Math.min(current + 1, 0))} style={styles.monthNavButton}>
          <Text style={styles.monthNavButtonText}>{copy.nextMonth}</Text>
        </Pressable>
      </View>

      {chunkIntoWeeks(monthDays).map((week, weekIndex) => (
        <View key={`week-${weekIndex}`} style={styles.calendarRow}>
          {week.map((day) => (
            <CalendarCell
              key={day.dayKey}
              day={day}
              selected={day.dayKey === selectedDay?.dayKey}
              onPress={() => setSelectedDayKey(day.dayKey)}
            />
          ))}
        </View>
      ))}

      {selectedDay ? (
        <View style={styles.selectedDayCard}>
          <Text style={[styles.selectedDayTitle, isArabic(language) && styles.alignRight]}>
            {copy.selectedDay}: {formatCalendarDay(selectedDay.dayKey, language)}
          </Text>
          <Text style={[styles.selectedDayCount, isArabic(language) && styles.alignRight]}>
            {selectedDay.totalCount} {copy.prayersLabel}
          </Text>
          {selectedDay.totalCount === 0 ? (
            <Text style={[styles.selectedDayBody, isArabic(language) && styles.alignRight]}>
              {copy.noRecordedPrayers}
            </Text>
          ) : (
            <PrayerBreakdownText day={selectedDay} language={language} />
          )}
          <Pressable onPress={() => setShowDayDetails(true)} style={styles.dayDetailsButton}>
            <Text style={styles.dayDetailsButtonText}>{copy.openDayDetails}</Text>
          </Pressable>
        </View>
      ) : null}

      {selectedDay ? (
        <Modal
          animationType="slide"
          transparent
          visible={showDayDetails}
          onRequestClose={() => setShowDayDetails(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheet}>
              <Text style={[styles.modalTitle, isArabic(language) && styles.alignRight]}>
                {copy.dayDetailsTitle}
              </Text>
              <Text style={[styles.modalDate, isArabic(language) && styles.alignRight]}>
                {formatCalendarDay(selectedDay.dayKey, language)}
              </Text>
              <Text style={[styles.selectedDayCount, isArabic(language) && styles.alignRight]}>
                {selectedDay.totalCount} {copy.prayersLabel}
              </Text>
              {selectedDay.totalCount === 0 ? (
                <Text style={[styles.selectedDayBody, isArabic(language) && styles.alignRight]}>
                  {copy.noRecordedPrayers}
                </Text>
              ) : null}
              <View style={styles.prayerBreakdownList}>
                {PRAYER_KEYS.map((prayer) => (
                  <View key={prayer} style={styles.prayerBreakdownRow}>
                    <Text
                      style={[styles.prayerBreakdownName, isArabic(language) && styles.alignRight]}
                    >
                      {language === 'ar' ? PRAYER_LABELS[prayer].arabic : PRAYER_LABELS[prayer].label}
                    </Text>
                    <View style={styles.prayerBreakdownActions}>
                      <Pressable
                        onPress={() => onIncrementPrayerForDay(prayer, selectedDay.dayKey)}
                        style={[styles.historyAdjustButton, styles.historyAdjustButtonAdd]}
                      >
                        <Text style={styles.historyAdjustButtonText}>+1</Text>
                      </Pressable>
                      <Text style={styles.prayerBreakdownValue}>{selectedDay.prayerCounts[prayer]}</Text>
                      <Pressable
                        onPress={() => onDecrementPrayerForDay(prayer, selectedDay.dayKey)}
                        style={[styles.historyAdjustButton, styles.historyAdjustButtonUndo]}
                      >
                        <Text style={styles.historyAdjustButtonText}>{copy.undo}</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
              <Pressable onPress={() => setShowDayDetails(false)} style={styles.modalCloseButton}>
                <Text style={styles.modalCloseButtonText}>{copy.close}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

function FastingTab({
  copy,
  language,
  targetDays,
  completedDays,
  remainingDays,
  progress,
  history,
  historySections,
  kafarahDays,
  onAddDay,
  onUndoDay,
}: {
  copy: CopyBlock;
  language: AppLanguage;
  targetDays: number;
  completedDays: number;
  remainingDays: number;
  progress: number;
  history: FastingDailySummary[];
  historySections: Array<{ monthKey: string; days: FastingDailySummary[] }>;
  kafarahDays: number;
  onAddDay: () => void;
  onUndoDay: () => void;
}) {
  const activeHistory = history.filter((day) => day.totalCount > 0);
  const poorPeopleCount = calculateKafarahPoorPeople(kafarahDays);

  return (
    <>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isArabic(language) && styles.alignRight]}>
          {copy.fastingTitle}
        </Text>
        <Text style={[styles.sectionHint, isArabic(language) && styles.alignRight]}>
          {copy.fastingHint}
        </Text>
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressTitle, isArabic(language) && styles.alignRight]}>
              {remainingDays} {copy.fastingRemaining}
            </Text>
            <Text style={styles.progressPercent}>{Math.round(progress * 100)}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <View style={styles.progressMiniStatsRow}>
            <View style={styles.progressMiniStat}>
              <Text style={styles.progressMiniLabel}>{copy.fastingCompleted}</Text>
              <Text style={[styles.progressMiniValue, { color: COLORS.success }]}>
                {completedDays}
              </Text>
            </View>
            <View style={styles.progressMiniStat}>
              <Text style={styles.progressMiniLabel}>{copy.fastingTarget}</Text>
              <Text style={[styles.progressMiniValue, { color: COLORS.lightGold }]}>
                {targetDays}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.dayActionCard}>
          <View style={styles.dayActionInfo}>
            <Text style={[styles.dayActionTitle, isArabic(language) && styles.alignRight]}>
              {copy.fastingTitle}
            </Text>
            <Text style={[styles.dayActionMeta, isArabic(language) && styles.alignRight]}>
              {copy.fastingHint}
            </Text>
          </View>
          <View style={styles.dayActionButtons}>
            <Pressable onPress={onAddDay} style={styles.fullDayButton}>
              <Text style={styles.fullDayButtonText}>{copy.fastingAddDay}</Text>
            </Pressable>
            <Pressable onPress={onUndoDay} style={styles.dayActionSecondaryButton}>
              <Text style={styles.minusButtonText}>{copy.fastingUndoDay}</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isArabic(language) && styles.alignRight]}>
          {copy.fastingHistoryTitle}
        </Text>
        <Text style={[styles.sectionHint, isArabic(language) && styles.alignRight]}>
          {copy.fastingHistoryHint}
        </Text>
        {activeHistory.length === 0 ? (
          <Text style={[styles.sectionHint, isArabic(language) && styles.alignRight]}>
            {copy.fastingEmpty}
          </Text>
        ) : (
          historySections.map((section) => {
            const monthDate = new Date(`${section.monthKey}-01T12:00:00`);
            const monthLabel = monthDate.toLocaleDateString(language === 'ar' ? 'ar' : 'en', {
              month: 'long',
              year: 'numeric',
            });

            return (
              <View key={section.monthKey} style={styles.fastingMonthSection}>
                <Text style={[styles.fastingMonthTitle, isArabic(language) && styles.alignRight]}>
                  {monthLabel}
                </Text>
                {section.days.map((entry) => (
                  <View key={entry.dayKey} style={styles.fastingLogCard}>
                    <Text style={[styles.fastingLogDate, isArabic(language) && styles.alignRight]}>
                      {new Date(`${entry.dayKey}T12:00:00`).toLocaleDateString(
                        language === 'ar' ? 'ar' : 'en',
                        {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        }
                      )}
                    </Text>
                    <Text style={[styles.fastingLogCount, isArabic(language) && styles.alignRight]}>
                      {entry.totalCount} {copy.dayUnit}
                    </Text>
                  </View>
                ))}
              </View>
            );
          })
        )}

        {kafarahDays > 0 ? (
          <View style={styles.kafarahAdvancedCard}>
            <Text style={[styles.kafarahAdvancedLabel, isArabic(language) && styles.alignRight]}>
              {copy.kafarahAdvancedLabel}
            </Text>
            <Text style={[styles.kafarahAdvancedTitle, isArabic(language) && styles.alignRight]}>
              {copy.kafarahTitle}
            </Text>
            <Text style={[styles.kafarahAdvancedBody, isArabic(language) && styles.alignRight]}>
              {copy.kafarahHint}
            </Text>
            <ProgressStat label={copy.kafarahEligibleDaysLabel} value={`${kafarahDays}`} />
            <ProgressStat label={copy.kafarahPoorPeopleLabel} value={`${poorPeopleCount}`} />
            <Text style={[styles.kafarahAdvancedBody, isArabic(language) && styles.alignRight]}>
              {copy.kafarahFastingLabel}
            </Text>
            <Text style={[styles.kafarahAdvancedNote, isArabic(language) && styles.alignRight]}>
              {copy.kafarahWarning}
            </Text>
          </View>
        ) : null}
      </View>
    </>
  );
}

function CalendarCell({
  day,
  selected,
  onPress,
}: {
  day: DailyActivitySummary & { isOutsideMonth?: boolean };
  selected: boolean;
  onPress: () => void;
}) {
  const date = new Date(`${day.dayKey}T12:00:00`);
  const dayNumber = date.getDate();
  const intensity =
    day.totalCount >= 5
      ? styles.calendarCellFull
      : day.totalCount >= 3
        ? styles.calendarCellMedium
        : day.totalCount >= 1
          ? styles.calendarCellLight
          : styles.calendarCellEmpty;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.calendarCell,
        intensity,
        day.isOutsideMonth && styles.calendarCellOutside,
        selected && styles.calendarCellSelected,
      ]}
    >
      <Text style={[styles.calendarDayNumber, day.isOutsideMonth && styles.calendarDayNumberOutside]}>
        {dayNumber}
      </Text>
      {day.totalCount > 0 ? (
        <View style={styles.calendarCountDot}>
          <Text style={styles.calendarCountDotText}>{day.totalCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function PrayerBreakdownText({
  day,
  language,
}: {
  day: DailyActivitySummary;
  language: AppLanguage;
}) {
  return (
    <Text style={[styles.selectedDayBody, isArabic(language) && styles.alignRight]}>
      {PRAYER_KEYS.map((prayer) => {
        const name = language === 'ar' ? PRAYER_LABELS[prayer].arabic : PRAYER_LABELS[prayer].label;
        return `${name} ${day.prayerCounts[prayer]}`;
      }).join(' · ')}
    </Text>
  );
}

function AnswersTab({
  copy,
  language,
}: {
  copy: CopyBlock;
  language: AppLanguage;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, isArabic(language) && styles.alignRight]}>{copy.qnaTitle}</Text>
      <Text style={[styles.sectionHint, isArabic(language) && styles.alignRight]}>{copy.qnaHint}</Text>
      <View style={styles.qaTrustCard}>
        <Text style={[styles.trustCardTitle, isArabic(language) && styles.alignRight]}>
          {copy.qnaTrustTitle}
        </Text>
        <Text style={[styles.trustCardBody, isArabic(language) && styles.alignRight]}>
          {copy.qnaTrustBody}
        </Text>
      </View>
      {TRUSTED_QA[language].map((item) => (
        <View key={item.url} style={styles.qaCard}>
          <View style={styles.qaCategoryChip}>
            <Text style={styles.qaCategoryChipText}>
              {copy.qnaCategoryLabel}: {item.category}
            </Text>
          </View>
          <Text style={[styles.qaTitle, isArabic(language) && styles.alignRight]}>{item.title}</Text>
          <Text style={[styles.qaMeta, isArabic(language) && styles.alignRight]}>
            {copy.qnaScholarLabel}: {item.scholar}
          </Text>
          <Text style={[styles.qaMeta, isArabic(language) && styles.alignRight]}>
            {copy.qnaSourceLabel}: {item.source}
          </Text>
          <Text style={[styles.qaBody, isArabic(language) && styles.alignRight]}>{item.summary}</Text>
          <Pressable onPress={() => Linking.openURL(item.url)} style={styles.qaButton}>
            <Text style={styles.qaButtonText}>{copy.openSource}</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

function MoreTab({
  copy,
  language,
  onLanguageChange,
  notificationEnabled,
  notificationHour,
  notificationMinute,
  onEnableDailyReminder,
  onDisableDailyReminder,
  onNotificationTimeChange,
  onSendTestReminder,
  target,
  onUpdateTarget,
  defaultDailyAddDays,
  onDefaultDailyAddDaysChange,
  fastingEnabled,
  fastingTargetDays,
  fastingCompletedDays,
  fastingKafarahDays,
  onFastingEnabledChange,
  onFastingTargetDaysChange,
  onFastingKafarahDaysChange,
  authConfigured,
  accountProfile,
  authLoading,
  authBusyProvider,
  authError,
  onGoogleSignIn,
  onSignOut,
  notes,
  onNotesChange,
  handleExport,
  handleImport,
}: {
  copy: CopyBlock;
  language: AppLanguage;
  onLanguageChange: (language: AppLanguage) => void;
  notificationEnabled: boolean;
  notificationHour: number;
  notificationMinute: number;
  onEnableDailyReminder: () => void;
  onDisableDailyReminder: () => void;
  onNotificationTimeChange: (hour: number, minute: number) => Promise<void>;
  onSendTestReminder: () => Promise<void>;
  target: PrayerCounts;
  onUpdateTarget: (setup: OnboardingSetup) => void;
  defaultDailyAddDays: number;
  onDefaultDailyAddDaysChange: (defaultDailyAddDays: number) => void;
  fastingEnabled: boolean;
  fastingTargetDays: number;
  fastingCompletedDays: number;
  fastingKafarahDays: number;
  onFastingEnabledChange: (enabled: boolean) => void;
  onFastingTargetDaysChange: (days: number) => void;
  onFastingKafarahDaysChange: (days: number) => void;
  authConfigured: boolean;
  accountProfile: AccountProfile;
  authLoading: boolean;
  authBusyProvider: 'google' | 'facebook' | null;
  authError: string | null;
  onGoogleSignIn: () => void;
  onSignOut: () => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  handleExport: () => void;
  handleImport: () => void;
}) {
  const formattedReminderTime = formatReminderTime(notificationHour, notificationMinute, language);
  const [manualNotificationHour, setManualNotificationHour] = useState(String(notificationHour));
  const [manualNotificationMinute, setManualNotificationMinute] = useState(
    String(notificationMinute).padStart(2, '0')
  );
  const [manualTargetDays, setManualTargetDays] = useState(
    String(Math.round(totalCounts(target) / PRAYERS_PER_QADAA_DAY))
  );
  const [manualDefaultAddDays, setManualDefaultAddDays] = useState(String(defaultDailyAddDays));
  const [manualFastingTargetDays, setManualFastingTargetDays] = useState(String(fastingTargetDays));
  const [manualFastingKafarahDays, setManualFastingKafarahDays] = useState(String(fastingKafarahDays));
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [latestPubertyAge, setLatestPubertyAge] = useState('15');
  const [regularPrayerAge, setRegularPrayerAge] = useState('');
  const [menstruationDays, setMenstruationDays] = useState('0');
  const estimate = useMemo(
    () =>
      buildShafiiEstimate({
        language,
        latestPubertyAge,
        regularPrayerAge,
        menstruationDays,
      }),
    [language, latestPubertyAge, regularPrayerAge, menstruationDays]
  );
  const currentTargetDays = Math.round(totalCounts(target) / PRAYERS_PER_QADAA_DAY);

  useEffect(() => {
    setManualTargetDays(String(currentTargetDays));
  }, [currentTargetDays]);

  useEffect(() => {
    setManualNotificationHour(String(notificationHour));
    setManualNotificationMinute(String(notificationMinute).padStart(2, '0'));
  }, [notificationHour, notificationMinute]);

  const parsedManualNotificationHour =
    manualNotificationHour.trim() === '' ? null : Number(manualNotificationHour.trim());
  const parsedManualNotificationMinute =
    manualNotificationMinute.trim() === '' ? null : Number(manualNotificationMinute.trim());
  const isReminderTimeValid =
    Number.isInteger(parsedManualNotificationHour) &&
    Number.isInteger(parsedManualNotificationMinute) &&
    parsedManualNotificationHour !== null &&
    parsedManualNotificationMinute !== null &&
    parsedManualNotificationHour >= 0 &&
    parsedManualNotificationHour <= 23 &&
    parsedManualNotificationMinute >= 0 &&
    parsedManualNotificationMinute <= 59;
  const isReminderTimeChanged =
    isReminderTimeValid &&
    (parsedManualNotificationHour !== notificationHour || parsedManualNotificationMinute !== notificationMinute);
  const formattedDraftReminderTime =
    isReminderTimeValid && parsedManualNotificationHour !== null && parsedManualNotificationMinute !== null
      ? formatReminderTime(parsedManualNotificationHour, parsedManualNotificationMinute, language)
      : null;

  useEffect(() => {
    setManualDefaultAddDays(String(defaultDailyAddDays));
  }, [defaultDailyAddDays]);

  useEffect(() => {
    setManualFastingTargetDays(String(fastingTargetDays));
  }, [fastingTargetDays]);

  useEffect(() => {
    setManualFastingKafarahDays(String(fastingKafarahDays));
  }, [fastingKafarahDays]);

  const handleSaveManualTarget = () => {
    const trimmedValue = manualTargetDays.trim();
    const parsedDays = Number(trimmedValue);
    if (!trimmedValue || !Number.isFinite(parsedDays)) {
      Alert.alert(copy.targetSettingsTitle, copy.numberFieldInvalid);
      return;
    }

    const nextDays = Math.max(0, Math.round(parsedDays));

    onUpdateTarget({
      missedDays: nextDays,
      target: countsFromMissedDays(nextDays),
      notes:
        language === 'ar'
          ? `تعديل يدوي لهدف القضاء: ${nextDays} يوم.`
          : `Manual qadaa target update: ${nextDays} days.`,
    });
    Alert.alert(copy.targetSettingsTitle, copy.targetSaved);
  };

  const handleSaveEstimateTarget = () => {
    if (!estimate) return;
    onUpdateTarget(estimate);
    setShowTargetModal(false);
  };

  const handleSaveDefaultAddDays = () => {
    const trimmedValue = manualDefaultAddDays.trim();
    const parsedDays = Number(trimmedValue);
    if (!trimmedValue || !Number.isFinite(parsedDays)) {
      Alert.alert(copy.defaultAddTitle, copy.numberFieldInvalid);
      return;
    }
    const nextDays = Math.max(0, Math.round(parsedDays));
    onDefaultDailyAddDaysChange(nextDays);
    Alert.alert(copy.defaultAddTitle, copy.defaultAddSaved);
  };

  const trimmedManualTargetDays = manualTargetDays.trim();
  const parsedManualTargetDays = trimmedManualTargetDays === '' ? null : Number(trimmedManualTargetDays);
  const nextManualTargetDays =
    parsedManualTargetDays !== null && Number.isFinite(parsedManualTargetDays)
      ? Math.max(0, Math.round(parsedManualTargetDays))
      : null;
  const isManualTargetValid = nextManualTargetDays !== null;
  const isManualTargetChanged = nextManualTargetDays !== null && nextManualTargetDays !== currentTargetDays;

  const trimmedManualDefaultAddDays = manualDefaultAddDays.trim();
  const parsedManualDefaultAddDays =
    trimmedManualDefaultAddDays === '' ? null : Number(trimmedManualDefaultAddDays);
  const nextManualDefaultAddDays =
    parsedManualDefaultAddDays !== null && Number.isFinite(parsedManualDefaultAddDays)
      ? Math.max(0, Math.round(parsedManualDefaultAddDays))
      : null;
  const isManualDefaultAddValid = nextManualDefaultAddDays !== null;
  const isManualDefaultAddChanged =
    nextManualDefaultAddDays !== null && nextManualDefaultAddDays !== defaultDailyAddDays;

  const handleSaveReminderTime = async () => {
    const parsedHour = Number(manualNotificationHour);
    const parsedMinute = Number(manualNotificationMinute);

    if (
      !Number.isInteger(parsedHour) ||
      !Number.isInteger(parsedMinute) ||
      parsedHour < 0 ||
      parsedHour > 23 ||
      parsedMinute < 0 ||
      parsedMinute > 59
    ) {
      Alert.alert(copy.notificationTitle, copy.notificationTimeInvalid);
      return;
    }

    await onNotificationTimeChange(parsedHour, parsedMinute);
  };

  const handleSaveFastingTarget = () => {
    const parsedDays = Number(manualFastingTargetDays);
    if (Number.isNaN(parsedDays) || manualFastingTargetDays.trim() === '') return;
    onFastingTargetDaysChange(Math.max(0, Math.round(parsedDays)));
  };

  const handleSaveFastingKafarahDays = () => {
    const parsedDays = Number(manualFastingKafarahDays);
    if (Number.isNaN(parsedDays) || manualFastingKafarahDays.trim() === '') return;
    onFastingKafarahDaysChange(Math.max(0, Math.round(parsedDays)));
  };

  return (
    <>
      <Modal animationType="slide" transparent visible={showTargetModal} onRequestClose={() => setShowTargetModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={[styles.modalTitle, isArabic(language) && styles.alignRight]}>
              {copy.recalculateTitle}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
              <View style={styles.setupCard}>
                <Text style={[styles.setupTitle, isArabic(language) && styles.alignRight]}>
                  {copy.onboardingEstimateTitle}
                </Text>
                <Text style={[styles.setupBody, isArabic(language) && styles.alignRight]}>
                  {copy.onboardingEstimateBody}
                </Text>
                <ShafiiEstimateFields
                  language={language}
                  latestPubertyAge={latestPubertyAge}
                  regularPrayerAge={regularPrayerAge}
                  menstruationDays={menstruationDays}
                  onLatestPubertyAgeChange={setLatestPubertyAge}
                  onRegularPrayerAgeChange={setRegularPrayerAge}
                  onMenstruationDaysChange={setMenstruationDays}
                  estimate={estimate}
                />
              </View>
            </ScrollView>
            <View style={styles.modalActions}>
              <Pressable onPress={handleSaveEstimateTarget} style={styles.onboardingButton}>
                <Text style={styles.onboardingButtonText}>{copy.saveEstimateChanges}</Text>
              </Pressable>
              <Pressable onPress={() => setShowTargetModal(false)} style={styles.ghostButton}>
                <Text style={styles.ghostButtonText}>{copy.cancel}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isArabic(language) && styles.alignRight]}>
          {copy.settingsTitle}
        </Text>

        <View style={styles.settingsPanel}>
          <Text style={[styles.settingsPanelTitle, isArabic(language) && styles.alignRight]}>
            {copy.accountTitle}
          </Text>
          <Text style={[styles.sectionHint, isArabic(language) && styles.alignRight]}>
            {authConfigured ? copy.accountHint : copy.authNeedsSetup}
          </Text>
          <View style={styles.accountCard}>
            <View style={styles.accountStatusHeader}>
              <View
                style={[
                  styles.accountStatusDot,
                  authConfigured ? styles.accountStatusDotReady : styles.accountStatusDotNotReady,
                ]}
              />
              <Text style={[styles.accountStatusLine, isArabic(language) && styles.alignRight]}>
                {copy.authConfiguredLabel}: {authConfigured ? copy.authReady : copy.authNotReady}
              </Text>
            </View>
            {authLoading ? (
              <View style={styles.accountLoadingRow}>
                <ActivityIndicator color={COLORS.lightGold} />
                <Text style={[styles.accountBody, isArabic(language) && styles.alignRight]}>
                  {copy.accountHint}
                </Text>
              </View>
            ) : accountProfile ? (
              <>
                <Text style={[styles.accountName, isArabic(language) && styles.alignRight]}>
                  {accountProfile.name}
                </Text>
                <Text style={[styles.accountBody, isArabic(language) && styles.alignRight]}>
                  {copy.connectedAs}: {accountProfile.email || accountProfile.provider}
                </Text>
                <Text style={[styles.accountMeta, isArabic(language) && styles.alignRight]}>
                  {copy.authComingSoon}
                </Text>
                <Pressable onPress={onSignOut} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>{copy.signOut}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={[styles.accountBody, isArabic(language) && styles.alignRight]}>
                  {copy.sharingReadyHint}
                </Text>
                <View style={styles.authButtons}>
                  <TouchableOpacity
                    onPress={onGoogleSignIn}
                    activeOpacity={0.85}
                    style={styles.oauthButtonPrimary}
                  >
                    <View style={styles.oauthButtonRow}>
                      {authBusyProvider === 'google' ? (
                        <ActivityIndicator color={COLORS.nightBlue} />
                      ) : (
                        <Text style={styles.oauthButtonBrandPrimary}>G</Text>
                      )}
                      <Text style={styles.oauthButtonPrimaryText}>{copy.connectGoogle}</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {authError ? (
              <Text style={[styles.accountError, isArabic(language) && styles.alignRight]}>
                {authError}
              </Text>
            ) : null}
          </View>

          <View style={styles.settingsDivider} />

          <Text style={[styles.settingsPanelTitle, isArabic(language) && styles.alignRight]}>
            {copy.languageTitle}
          </Text>
          <Text style={[styles.settingsCompactHint, isArabic(language) && styles.alignRight]}>
            {copy.languageHint}
          </Text>
          <View style={styles.settingsRow}>
            <Text style={[styles.settingsLabel, isArabic(language) && styles.alignRight]}>
              {copy.languageTitle}
            </Text>
            <LanguageToggle language={language} onChange={onLanguageChange} />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isArabic(language) && styles.alignRight]}>
          {copy.targetSettingsTitle}
        </Text>
        <Text style={[styles.sectionHint, isArabic(language) && styles.alignRight]}>
          {copy.targetSettingsHint}
        </Text>
        <View style={styles.settingsPanel}>
          <View style={styles.partnerCard}>
            <View style={styles.notificationStatusRow}>
              <Text style={[styles.settingsLabel, isArabic(language) && styles.alignRight]}>
                {copy.currentTargetLabel}
              </Text>
              <Text style={styles.notificationTimeValue}>
                {currentTargetDays} {copy.currentTargetDaysLabel}
              </Text>
            </View>
            <Text style={[styles.settingsLabel, isArabic(language) && styles.alignRight]}>
              {copy.manualDaysLabel}
            </Text>
            <TextInput
              value={manualTargetDays}
              onChangeText={(next) => setManualTargetDays(next.replace(/[^0-9]/g, ''))}
              style={[styles.partnerInput, isArabic(language) && styles.notesInputArabic]}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={COLORS.mutedText}
            />
            <Text style={[styles.settingsCompactHint, isArabic(language) && styles.alignRight]}>
              {copy.manualDaysHint}
            </Text>
            <Pressable
              onPress={handleSaveManualTarget}
              disabled={!isManualTargetValid || !isManualTargetChanged}
              style={[
                styles.shareButton,
                (!isManualTargetValid || !isManualTargetChanged) && styles.actionButtonDisabled,
              ]}
            >
              <Text style={styles.shareButtonText}>{copy.saveTarget}</Text>
            </Pressable>
            <Pressable onPress={() => setShowTargetModal(true)} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>{copy.recalculateTarget}</Text>
            </Pressable>
          </View>

          <View style={styles.settingsDivider} />

          <Text style={[styles.settingsPanelTitle, isArabic(language) && styles.alignRight]}>
            {copy.defaultAddTitle}
          </Text>
          <Text style={[styles.settingsCompactHint, isArabic(language) && styles.alignRight]}>
            {copy.defaultAddHint}
          </Text>
          <View style={styles.partnerCard}>
            <View style={styles.notificationStatusRow}>
              <Text style={[styles.settingsLabel, isArabic(language) && styles.alignRight]}>
                {copy.currentSettingLabel}
              </Text>
              <Text style={styles.notificationTimeValue}>
                {defaultDailyAddDays > 0
                  ? `${formatDecimal(defaultDailyAddDays)} ${copy.dayUnit}`
                  : copy.defaultAddOff}
              </Text>
            </View>
            <Text style={[styles.settingsLabel, isArabic(language) && styles.alignRight]}>
              {copy.defaultAddLabel}
            </Text>
            <TextInput
              value={manualDefaultAddDays}
              onChangeText={(next) => setManualDefaultAddDays(next.replace(/[^0-9]/g, ''))}
              style={[styles.partnerInput, isArabic(language) && styles.notesInputArabic]}
              keyboardType="number-pad"
              placeholder="1"
              placeholderTextColor={COLORS.mutedText}
            />
            <Text style={[styles.settingsCompactHint, isArabic(language) && styles.alignRight]}>
              {copy.defaultAddHint}
            </Text>
            <Text style={[styles.settingsCompactHint, isArabic(language) && styles.alignRight]}>
              {copy.defaultAddEditableNote}
            </Text>
            <Pressable
              onPress={handleSaveDefaultAddDays}
              disabled={!isManualDefaultAddValid || !isManualDefaultAddChanged}
              style={[
                styles.shareButton,
                (!isManualDefaultAddValid || !isManualDefaultAddChanged) && styles.actionButtonDisabled,
              ]}
            >
              <Text style={styles.shareButtonText}>{copy.defaultAddSave}</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isArabic(language) && styles.alignRight]}>
          {copy.notificationTitle}
        </Text>
        <Text style={[styles.sectionHint, isArabic(language) && styles.alignRight]}>
          {copy.notificationHint}
        </Text>
        <View style={styles.settingsPanel}>
          <View style={styles.notificationCard}>
            <View style={styles.notificationHeaderRow}>
              <View style={styles.notificationHeaderText}>
                <Text style={[styles.settingsPanelTitle, isArabic(language) && styles.alignRight]}>
                  {copy.notificationTitle}
                </Text>
                <Text style={[styles.settingsCompactHint, isArabic(language) && styles.alignRight]}>
                  {copy.notificationHint}
                </Text>
              </View>
              <View
                style={[
                  styles.notificationStatusBadge,
                  notificationEnabled
                    ? styles.notificationStatusBadgeOn
                    : styles.notificationStatusBadgeOff,
                ]}
              >
                <Text style={styles.notificationStatusBadgeText}>
                  {notificationEnabled ? copy.notificationStatusOn : copy.notificationStatusOff}
                </Text>
              </View>
            </View>

            <View style={styles.notificationSummaryGrid}>
              <View style={styles.notificationSummaryItem}>
                <Text style={[styles.notificationSummaryLabel, isArabic(language) && styles.alignRight]}>
                  {copy.notificationSavedTimeLabel}
                </Text>
                <Text style={styles.notificationSummaryValue}>{formattedReminderTime}</Text>
              </View>
              <View style={styles.notificationSummaryItem}>
                <Text style={[styles.notificationSummaryLabel, isArabic(language) && styles.alignRight]}>
                  {copy.notificationStatusLabel}
                </Text>
                <Text style={styles.notificationSummaryValue}>
                  {notificationEnabled ? copy.notificationStatusOn : copy.notificationStatusOff}
                </Text>
              </View>
            </View>

            <View style={styles.notificationEditorCard}>
              <Text style={[styles.settingsLabel, isArabic(language) && styles.alignRight]}>
                {copy.notificationDraftTimeLabel}
              </Text>
              <View style={styles.notificationTimeEditorRow}>
                <View style={styles.notificationTimeField}>
                  <Text style={[styles.notificationFieldLabel, isArabic(language) && styles.alignRight]}>
                    {copy.notificationHourLabel}
                  </Text>
                  <TextInput
                    value={manualNotificationHour}
                    onChangeText={(next) => setManualNotificationHour(next.replace(/[^0-9]/g, ''))}
                    style={[
                      styles.partnerInput,
                      styles.notificationTimeInput,
                      isArabic(language) && styles.notesInputArabic,
                    ]}
                    keyboardType="number-pad"
                    placeholder="21"
                    placeholderTextColor={COLORS.mutedText}
                    maxLength={2}
                  />
                </View>
                <View style={styles.notificationTimeField}>
                  <Text style={[styles.notificationFieldLabel, isArabic(language) && styles.alignRight]}>
                    {copy.notificationMinuteLabel}
                  </Text>
                  <TextInput
                    value={manualNotificationMinute}
                    onChangeText={(next) => setManualNotificationMinute(next.replace(/[^0-9]/g, ''))}
                    style={[
                      styles.partnerInput,
                      styles.notificationTimeInput,
                      isArabic(language) && styles.notesInputArabic,
                    ]}
                    keyboardType="number-pad"
                    placeholder="00"
                    placeholderTextColor={COLORS.mutedText}
                    maxLength={2}
                  />
                </View>
              </View>
              <Text style={[styles.notificationPreviewText, isArabic(language) && styles.alignRight]}>
                {formattedDraftReminderTime ?? copy.notificationTimeInvalid}
              </Text>
              <Text style={[styles.settingsCompactHint, isArabic(language) && styles.alignRight]}>
                {copy.notificationTimeHelp}
              </Text>
            </View>

            <View style={styles.notificationActionsColumn}>
              <Pressable
                onPress={handleSaveReminderTime}
                disabled={!isReminderTimeValid || !isReminderTimeChanged}
                style={[
                  styles.shareButton,
                  (!isReminderTimeValid || !isReminderTimeChanged) && styles.actionButtonDisabled,
                ]}
              >
                <Text style={styles.shareButtonText}>{copy.notificationSaveTime}</Text>
              </Pressable>
              <Pressable onPress={onSendTestReminder} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>{copy.notificationTestReminder}</Text>
              </Pressable>
              <Pressable
                onPress={notificationEnabled ? onDisableDailyReminder : onEnableDailyReminder}
                style={notificationEnabled ? styles.secondaryButton : styles.shareButton}
              >
                <Text style={notificationEnabled ? styles.secondaryButtonText : styles.shareButtonText}>
                  {notificationEnabled ? copy.disableNotification : copy.enableNotification}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isArabic(language) && styles.alignRight]}>
          {copy.fastingSettingsTitle}
        </Text>
        <Text style={[styles.sectionHint, isArabic(language) && styles.alignRight]}>
          {copy.fastingSettingsHint}
        </Text>
        <View style={styles.advancedSettingsPanel}>
          <View style={styles.partnerCard}>
            <Pressable
              onPress={() => onFastingEnabledChange(!fastingEnabled)}
              style={fastingEnabled ? styles.secondaryButton : styles.shareButton}
            >
              <Text style={fastingEnabled ? styles.secondaryButtonText : styles.shareButtonText}>
                {fastingEnabled ? copy.fastingDisable : copy.fastingEnable}
              </Text>
            </Pressable>
            {fastingEnabled ? (
              <>
                <View style={styles.notificationStatusRow}>
                  <Text style={[styles.settingsLabel, isArabic(language) && styles.alignRight]}>
                    {copy.fastingCompleted}
                  </Text>
                  <Text style={styles.notificationTimeValue}>{fastingCompletedDays}</Text>
                </View>
                <Text style={[styles.settingsLabel, isArabic(language) && styles.alignRight]}>
                  {copy.fastingTargetLabel}
                </Text>
                <TextInput
                  value={manualFastingTargetDays}
                  onChangeText={(next) => setManualFastingTargetDays(next.replace(/[^0-9.]/g, ''))}
                  style={[styles.partnerInput, isArabic(language) && styles.notesInputArabic]}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={COLORS.mutedText}
                />
                <Pressable onPress={handleSaveFastingTarget} style={styles.shareButton}>
                  <Text style={styles.shareButtonText}>{copy.fastingSaveTarget}</Text>
                </Pressable>

                <View style={styles.settingsDivider} />

                <Text style={[styles.settingsPanelTitle, isArabic(language) && styles.alignRight]}>
                  {copy.kafarahTitle}
                </Text>
                <Text style={[styles.settingsCompactHint, isArabic(language) && styles.alignRight]}>
                  {copy.kafarahHint}
                </Text>
                <Text style={[styles.settingsLabel, isArabic(language) && styles.alignRight]}>
                  {copy.kafarahEligibleDaysLabel}
                </Text>
                <TextInput
                  value={manualFastingKafarahDays}
                  onChangeText={(next) => setManualFastingKafarahDays(next.replace(/[^0-9.]/g, ''))}
                  style={[styles.partnerInput, isArabic(language) && styles.notesInputArabic]}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={COLORS.mutedText}
                />
                <Pressable onPress={handleSaveFastingKafarahDays} style={styles.shareButton}>
                  <Text style={styles.shareButtonText}>{copy.kafarahSave}</Text>
                </Pressable>
                <Text style={[styles.settingsCompactHint, isArabic(language) && styles.alignRight]}>
                  {copy.kafarahTrackHint}
                </Text>
              </>
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isArabic(language) && styles.alignRight]}>
          {copy.backupTitle}
        </Text>
        <Text style={[styles.sectionHint, isArabic(language) && styles.alignRight]}>
          {copy.backupHint}
        </Text>
        <View style={styles.advancedSettingsPanel}>
          <Text style={[styles.settingsPanelTitle, isArabic(language) && styles.alignRight]}>
            {copy.notesTitle}
          </Text>
          <TextInput
            multiline
            value={notes}
            onChangeText={onNotesChange}
            style={[styles.notesInput, isArabic(language) && styles.notesInputArabic]}
            placeholder={copy.notesPlaceholder}
            placeholderTextColor={COLORS.mutedText}
          />

          <View style={styles.settingsDivider} />

          <View style={styles.backupStatus}>
            <Text style={styles.backupStatusLabel}>{copy.autoBackup}:</Text>
            <Text style={styles.backupStatusText}>{copy.enabled}</Text>
          </View>
          <View style={styles.backupButtonsRow}>
            <Pressable onPress={handleExport} style={styles.backupButton}>
              <Text style={styles.backupButtonText}>{copy.exportBackup}</Text>
            </Pressable>
            <Pressable onPress={handleImport} style={styles.backupButton}>
              <Text style={styles.backupButtonText}>{copy.importBackup}</Text>
            </Pressable>
          </View>

          <View style={styles.settingsDivider} />

          <Text style={[styles.settingsPanelTitle, isArabic(language) && styles.alignRight]}>
            {copy.contactDeveloperTitle}
          </Text>
          <Text style={[styles.settingsCompactHint, isArabic(language) && styles.alignRight]}>
            {copy.contactDeveloperHint}
          </Text>
          <View style={styles.developerCard}>
            <View style={styles.developerRow}>
              <Text style={[styles.settingsLabel, isArabic(language) && styles.alignRight]}>
                {copy.developerNameLabel}
              </Text>
              <Text style={[styles.developerValue, isArabic(language) && styles.alignRight]}>
                {DEVELOPER_NAME}
              </Text>
            </View>
            <Pressable
              onPress={() => Linking.openURL(`mailto:${DEVELOPER_EMAIL}`)}
              style={styles.developerEmailButton}
            >
              <Text style={[styles.settingsLabel, isArabic(language) && styles.alignRight]}>
                {copy.developerEmailLabel}
              </Text>
              <Text style={[styles.developerEmailValue, isArabic(language) && styles.alignRight]}>
                {DEVELOPER_EMAIL}
              </Text>
            </Pressable>
            <View style={styles.versionRow}>
              <Text style={[styles.settingsLabel, isArabic(language) && styles.alignRight]}>
                {copy.appVersionLabel}
              </Text>
              <Text style={styles.developerValue}>{APP_VERSION}</Text>
            </View>
          </View>
        </View>
      </View>
    </>
  );
}

function ProgressOverview({
  copy,
  totals,
  progress,
  defaultDailyAddDays,
  language,
}: {
  copy: CopyBlock;
  totals: Totals;
  progress: {
    percent: number;
    completedDays: number;
    remainingDays: number;
    todayDays: number;
    estimatedDaysLeft: number | null;
    finishDate: Date | null;
  };
  defaultDailyAddDays: number;
  language: AppLanguage;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, isArabic(language) && styles.alignRight]}>{copy.progressTitle}</Text>
      <Text style={[styles.sectionHint, isArabic(language) && styles.alignRight]}>{copy.progressHint}</Text>
      <View style={styles.progressCard}>
        <Text style={[styles.focusLabel, isArabic(language) && styles.alignRight]}>
          {copy.primaryFocus}
        </Text>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressTitle, isArabic(language) && styles.alignRight]}>
            {totals.remaining} {copy.remaining}
          </Text>
          <Text style={styles.progressPercent}>{Math.round(progress.percent * 100)}%</Text>
        </View>
        <View style={styles.progressSplitLabels}>
          <Text style={[styles.progressSplitText, isArabic(language) && styles.alignRight]}>
            {copy.overallProgress}
          </Text>
          <Text style={styles.progressSplitText}>
            {formatDecimal(progress.completedDays)} / {formatDecimal(progress.completedDays + progress.remainingDays)} {copy.dayUnit}
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress.percent * 100}%` }]} />
        </View>
        <View style={styles.progressMiniStatsRow}>
          <View style={styles.progressMiniStat}>
            <Text style={styles.progressMiniLabel}>{copy.daysCompleted}</Text>
            <Text style={[styles.progressMiniValue, { color: COLORS.success }]}>
              {formatDecimal(progress.completedDays)}
            </Text>
          </View>
          <View style={styles.progressMiniStat}>
            <Text style={styles.progressMiniLabel}>{copy.daysLeft}</Text>
            <Text style={[styles.progressMiniValue, { color: COLORS.lightGold }]}>
              {formatDecimal(progress.remainingDays)}
            </Text>
          </View>
        </View>
        <ProgressStat
          label={copy.defaultAddIndicator}
          value={
            defaultDailyAddDays > 0
              ? `${formatDecimal(defaultDailyAddDays)} ${copy.dayUnit}`
              : copy.defaultAddOff
          }
        />
        <ProgressStat
          label={copy.finish}
          value={formatFinishDate(progress.finishDate, defaultDailyAddDays > 0 ? copy.needHistory : copy.defaultAddOff)}
        />
        <Text style={[styles.progressFootnote, isArabic(language) && styles.alignRight]}>
          {copy.defaultAddMainNote}
        </Text>
      </View>
    </View>
  );
}

function ProgressStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.progressStat}>
      <Text style={styles.progressStatLabel}>{label}</Text>
      <Text style={styles.progressStatValue}>{value}</Text>
    </View>
  );
}

function chunkIntoWeeks(days: DailyActivitySummary[]) {
  const weeks: DailyActivitySummary[][] = [];
  for (let index = 0; index < days.length; index += 7) {
    weeks.push(days.slice(index, index + 7));
  }
  return weeks;
}

function buildMonthCalendar(
  monthDate: Date,
  dailyHistory: DailyActivitySummary[]
): Array<DailyActivitySummary & { isOutsideMonth: boolean }> {
  const map = new Map(dailyHistory.map((day) => [day.dayKey, day]));
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());
  const end = new Date(lastDay);
  end.setDate(lastDay.getDate() + (6 - lastDay.getDay()));

  const days: Array<DailyActivitySummary & { isOutsideMonth: boolean }> = [];
  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const dayKey = formatDayKeyLocal(cursor);
    const existing = map.get(dayKey);
    days.push({
      dayKey,
      totalCount: existing?.totalCount ?? 0,
      prayerCounts:
        existing?.prayerCounts ?? { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
      isOutsideMonth: cursor.getMonth() !== month,
    });
  }
  return days;
}

function formatDayKeyLocal(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatCalendarDay(dayKey: string, language: AppLanguage) {
  return new Date(`${dayKey}T12:00:00`).toLocaleDateString(language === 'ar' ? 'ar' : 'en', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function isArabic(language: AppLanguage) {
  return language === 'ar';
}

function formatDecimal(value: number) {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}

function formatReminderTime(hour: number, minute: number, language: AppLanguage) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString(language === 'ar' ? 'ar' : 'en', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatFinishDate(date: Date | null, emptyLabel: string) {
  if (!date) return emptyLabel;
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatEstimatedDaysLeft(value: number | null, emptyLabel: string, dayUnit: string) {
  if (value === null) return emptyLabel;
  if (value <= 0) return `0 ${dayUnit}`;
  return `~${formatDecimal(value)} ${dayUnit}`;
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    backgroundColor: COLORS.sectionBg,
  },
  backgroundImageAsset: {
    resizeMode: 'repeat',
    opacity: 0.18,
  },
  backgroundTint: {
    flex: 1,
    backgroundColor: 'rgba(10, 33, 26, 0.84)',
  },
  appShell: {
    flex: 1,
  },
  patternContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    opacity: 0.2,
  },
  floralBranch: {
    position: 'absolute',
    width: 118,
    height: 118,
    opacity: 0.35,
  },
  floralBranchTopLeft: {
    top: 12,
    left: -8,
  },
  floralBranchBottomRight: {
    right: -10,
    bottom: -8,
    transform: [{ rotate: '180deg' }],
  },
  floralCurl: {
    position: 'absolute',
    borderColor: COLORS.roseGold + '44',
    borderTopColor: 'transparent',
    borderLeftColor: 'transparent',
    backgroundColor: 'transparent',
  },
  floralCurlLarge: {
    width: 76,
    height: 76,
    borderWidth: 2,
    borderRadius: 38,
    top: 0,
    left: 0,
  },
  floralCurlSmall: {
    width: 42,
    height: 42,
    borderWidth: 1.5,
    borderRadius: 21,
    top: 44,
    left: 34,
  },
  floralLeaf: {
    position: 'absolute',
    width: 18,
    height: 30,
    borderRadius: 18,
    backgroundColor: COLORS.forestGreen + '52',
    borderWidth: 1,
    borderColor: COLORS.lightGold + '2c',
  },
  floralLeafOne: {
    top: 22,
    left: 58,
    transform: [{ rotate: '28deg' }],
  },
  floralLeafTwo: {
    top: 50,
    left: 72,
    transform: [{ rotate: '72deg' }],
  },
  floralBloom: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: COLORS.gold + '48',
    backgroundColor: COLORS.roseGold + '20',
  },
  floralBloomMain: {
    width: 24,
    height: 24,
    top: 74,
    left: 16,
  },
  medallionWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  medallionWrapHeader: {
    width: 252,
    height: 252,
  },
  medallionWrapHero: {
    width: 228,
    height: 228,
  },
  medallionDiamondOuter: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderWidth: 2,
    borderColor: COLORS.gold + '44',
    backgroundColor: COLORS.forestGreen + '10',
    transform: [{ rotate: '45deg' }],
  },
  medallionDiamondMiddle: {
    position: 'absolute',
    width: 132,
    height: 132,
    borderWidth: 2,
    borderColor: COLORS.roseGold + '55',
    transform: [{ rotate: '45deg' }],
  },
  medallionDiamondInner: {
    position: 'absolute',
    width: 84,
    height: 84,
    borderWidth: 1.5,
    borderColor: COLORS.lightGold + '66',
    transform: [{ rotate: '45deg' }],
  },
  medallionPetal: {
    position: 'absolute',
    width: 62,
    height: 62,
    borderWidth: 1.5,
    borderColor: COLORS.gold + '40',
    backgroundColor: COLORS.pine + '08',
    transform: [{ rotate: '45deg' }],
  },
  medallionPetalTop: {
    top: 18,
    left: '50%',
    marginLeft: -31,
  },
  medallionPetalRight: {
    right: 18,
    top: '50%',
    marginTop: -31,
  },
  medallionPetalBottom: {
    bottom: 18,
    left: '50%',
    marginLeft: -31,
  },
  medallionPetalLeft: {
    left: 18,
    top: '50%',
    marginTop: -31,
  },
  medallionCrossVertical: {
    position: 'absolute',
    width: 16,
    height: 152,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: COLORS.gold + '2d',
  },
  medallionCrossHorizontal: {
    position: 'absolute',
    width: 152,
    height: 16,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: COLORS.gold + '2d',
  },
  medallionCoreRing: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: COLORS.lightGold + '70',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.sectionBg + '66',
  },
  medallionCore: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.gold + 'aa',
  },
  medallionAccentTop: {
    position: 'absolute',
    top: 46,
    left: '50%',
    marginLeft: -17,
    width: 34,
    height: 34,
    borderWidth: 1.5,
    borderColor: COLORS.roseGold + '55',
    transform: [{ rotate: '45deg' }],
  },
  medallionAccentRight: {
    position: 'absolute',
    right: 46,
    top: '50%',
    marginTop: -17,
    width: 34,
    height: 34,
    borderWidth: 1.5,
    borderColor: COLORS.roseGold + '55',
    transform: [{ rotate: '45deg' }],
  },
  medallionAccentBottom: {
    position: 'absolute',
    bottom: 46,
    left: '50%',
    marginLeft: -17,
    width: 34,
    height: 34,
    borderWidth: 1.5,
    borderColor: COLORS.roseGold + '55',
    transform: [{ rotate: '45deg' }],
  },
  medallionAccentLeft: {
    position: 'absolute',
    left: 46,
    top: '50%',
    marginTop: -17,
    width: 34,
    height: 34,
    borderWidth: 1.5,
    borderColor: COLORS.roseGold + '55',
    transform: [{ rotate: '45deg' }],
  },
  medallionPointTop: {
    position: 'absolute',
    top: -2,
    left: '50%',
    marginLeft: -9,
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: COLORS.gold + '48',
    transform: [{ rotate: '45deg' }],
  },
  medallionPointRight: {
    position: 'absolute',
    right: -2,
    top: '50%',
    marginTop: -9,
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: COLORS.gold + '48',
    transform: [{ rotate: '45deg' }],
  },
  medallionPointBottom: {
    position: 'absolute',
    bottom: -2,
    left: '50%',
    marginLeft: -9,
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: COLORS.gold + '48',
    transform: [{ rotate: '45deg' }],
  },
  medallionPointLeft: {
    position: 'absolute',
    left: -2,
    top: '50%',
    marginTop: -9,
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: COLORS.gold + '48',
    transform: [{ rotate: '45deg' }],
  },
  headerPattern: {
    top: -8,
  },
  heroPattern: {
    top: 4,
  },
  alignRight: {
    textAlign: 'right',
  },
  languageToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.inputBg,
    borderRadius: 999,
    padding: 4,
    gap: 4,
  },
  languageButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  languageButtonActive: {
    backgroundColor: COLORS.gold,
  },
  languageButtonText: {
    color: COLORS.cream,
    fontSize: 12,
    fontWeight: '700',
  },
  languageButtonTextActive: {
    color: COLORS.darkGreen,
  },
  tabBar: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 14,
    marginBottom: 12,
    padding: 10,
    backgroundColor: 'rgba(13, 43, 32, 0.92)',
    borderRadius: 22,
    borderTopWidth: 1,
    borderTopColor: COLORS.gold + '22',
    borderWidth: 1,
    borderColor: COLORS.lightGold + '14',
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  tabButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(247, 243, 234, 0.12)',
    borderWidth: 1,
    borderColor: COLORS.lightGold + '3a',
  },
  tabButtonText: {
    color: COLORS.mutedText,
    fontSize: 13,
    fontWeight: '700',
  },
  tabButtonTextActive: {
    color: COLORS.cream,
  },
  onboarding: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  onboardingScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  onboardingCard: {
    backgroundColor: 'rgba(13, 43, 32, 0.86)',
    borderRadius: 28,
    padding: 28,
    gap: 18,
    borderWidth: 1,
    borderColor: COLORS.lightGold + '24',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  onboardingTopRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  onboardingHeaderOrnament: {
    alignItems: 'center',
    gap: 4,
  },
  onboardingBismillah: {
    color: COLORS.gold,
    fontSize: 32,
    fontWeight: '300',
    letterSpacing: 2,
  },
  onboardingBismillahSub: {
    color: COLORS.roseGold,
    fontSize: 12,
  },
  onboardingTitle: {
    color: COLORS.cream,
    fontSize: 36,
    fontWeight: '800',
    textAlign: 'center',
  },
  onboardingSubtitle: {
    color: COLORS.mutedText,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  setupCard: {
    backgroundColor: 'rgba(18, 59, 47, 0.9)',
    borderRadius: 20,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.lightGold + '18',
  },
  setupTitle: {
    color: COLORS.cream,
    fontSize: 18,
    fontWeight: '800',
  },
  setupBody: {
    color: COLORS.mutedText,
    fontSize: 13,
    lineHeight: 20,
  },
  setupField: {
    gap: 6,
  },
  setupFieldLabel: {
    color: COLORS.cream,
    fontSize: 14,
    fontWeight: '700',
  },
  setupFieldHint: {
    color: COLORS.mutedText,
    fontSize: 12,
    lineHeight: 18,
  },
  modeToggleRow: {
    gap: 8,
  },
  modeToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  modeToggleButton: {
    flex: 1,
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gold + '24',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  modeToggleButtonActive: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.gold,
  },
  modeToggleButtonText: {
    color: COLORS.cream,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  modeToggleButtonTextActive: {
    color: COLORS.nightBlue,
  },
  setupInput: {
    minWidth: 80,
    textAlign: 'center',
    color: COLORS.cream,
    fontSize: 17,
    fontWeight: '700',
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  estimateResult: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  estimateResultTitle: {
    color: COLORS.lightGold,
    fontSize: 16,
    fontWeight: '800',
  },
  estimateResultBody: {
    color: COLORS.mutedText,
    fontSize: 13,
    lineHeight: 18,
  },
  trustCard: {
    backgroundColor: 'rgba(10, 42, 30, 0.92)',
    borderRadius: 16,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.gold + '1a',
  },
  trustToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  trustCardTitle: {
    color: COLORS.cream,
    fontSize: 15,
    fontWeight: '800',
  },
  trustToggleIcon: {
    color: COLORS.lightGold,
    fontSize: 22,
    lineHeight: 22,
    fontWeight: '700',
  },
  trustCardBody: {
    color: COLORS.mutedText,
    fontSize: 13,
    lineHeight: 19,
  },
  trustBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  trustBullet: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: COLORS.lightGold,
    marginTop: 6,
  },
  trustBulletText: {
    flex: 1,
    color: COLORS.cream,
    fontSize: 13,
    lineHeight: 19,
  },
  trustCardNote: {
    color: COLORS.lightGold,
    fontSize: 12,
    lineHeight: 18,
  },
  trustLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sourceChip: {
    backgroundColor: 'rgba(247, 243, 234, 0.06)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.gold + '22',
  },
  sourceChipText: {
    color: COLORS.cream,
    fontSize: 12,
    fontWeight: '700',
  },
  onboardingButtons: {
    gap: 10,
  },
  onboardingButton: {
    backgroundColor: COLORS.gold,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.lightGold + '66',
  },
  onboardingButtonDisabled: {
    backgroundColor: 'rgba(213, 177, 90, 0.35)',
    borderColor: COLORS.lightGold + '22',
  },
  onboardingButtonText: {
    color: COLORS.nightBlue,
    fontSize: 17,
    fontWeight: '800',
  },
  onboardingButtonTextDisabled: {
    color: 'rgba(11, 34, 28, 0.65)',
  },
  tourBannerWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 84,
    paddingHorizontal: 16,
    zIndex: 30,
    pointerEvents: 'box-none',
  },
  tourBanner: {
    backgroundColor: 'rgba(13, 43, 32, 0.96)',
    borderRadius: 24,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.gold + '1f',
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  tourHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  tourEyebrow: {
    color: COLORS.lightGold,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  tourTitle: {
    color: COLORS.cream,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
  },
  tourSkipButton: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.gold + '22',
  },
  tourSkipText: {
    color: COLORS.cream,
    fontSize: 13,
    fontWeight: '700',
  },
  tourTabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tourTabChip: {
    borderRadius: 999,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.gold + '22',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tourTabChipActive: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.gold,
  },
  tourTabChipText: {
    color: COLORS.cream,
    fontSize: 12,
    fontWeight: '700',
  },
  tourTabChipTextActive: {
    color: COLORS.nightBlue,
  },
  tourBody: {
    color: COLORS.mutedText,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  tourDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  tourDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: COLORS.gold + '55',
  },
  tourDotActive: {
    width: 22,
    backgroundColor: COLORS.lightGold,
  },
  tourActions: {
    gap: 10,
  },
  ghostButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gold + '22',
    backgroundColor: COLORS.inputBg,
  },
  ghostButtonText: {
    color: COLORS.cream,
    fontSize: 15,
    fontWeight: '700',
  },
  content: {
    padding: 20,
    paddingTop: 14,
    paddingBottom: 34,
    gap: 18,
  },
  headerCard: {
    backgroundColor: 'rgba(13, 43, 32, 0.78)',
    borderRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 22,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.lightGold + '22',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 12,
  },
  eyebrow: {
    color: COLORS.lightGold,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(247, 243, 234, 0.08)',
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.lightGold + '20',
  },
  title: {
    color: COLORS.cream,
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
  },
  subtitle: {
    color: '#C8D6CD',
    fontSize: 15,
    lineHeight: 23,
  },
  hadithCard: {
    backgroundColor: 'rgba(247, 243, 234, 0.07)',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.lightGold + '1f',
  },
  hadithBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.gold + '18',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: COLORS.gold + '35',
  },
  hadithBadgeArabic: {
    alignSelf: 'flex-end',
  },
  hadithLabel: {
    color: COLORS.lightGold,
    fontSize: 11,
    fontWeight: '800',
  },
  hadithText: {
    color: COLORS.cream,
    fontSize: 21,
    fontWeight: '700',
    lineHeight: 32,
    letterSpacing: 0.2,
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      default: 'serif',
    }),
  },
  hadithTextArabic: {
    fontSize: 24,
    lineHeight: 38,
    letterSpacing: 0,
    fontFamily: Platform.select({
      ios: 'Geeza Pro',
      android: 'serif',
      default: 'serif',
    }),
  },
  focusLabel: {
    color: COLORS.lightGold,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  section: {
    backgroundColor: 'rgba(13, 43, 32, 0.76)',
    borderRadius: 28,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.lightGold + '16',
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    color: COLORS.cream,
    fontSize: 18,
    fontWeight: '800',
  },
  sectionHint: {
    color: '#B7C9BE',
    fontSize: 13,
    lineHeight: 19,
  },
  secondaryButton: {
    backgroundColor: 'rgba(247, 243, 234, 0.06)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.lightGold + '18',
  },
  secondaryButtonText: {
    color: COLORS.cream,
    fontSize: 13,
    fontWeight: '700',
  },
  progressCard: {
    backgroundColor: 'rgba(18, 59, 47, 0.92)',
    borderRadius: 22,
    padding: 20,
    gap: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.lightGold + '22',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  progressSplitLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  progressSplitText: {
    color: COLORS.mutedText,
    fontSize: 12,
    lineHeight: 18,
  },
  progressTitle: {
    flex: 1,
    color: COLORS.cream,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  progressPercent: {
    color: COLORS.gold,
    fontSize: 22,
    fontWeight: '800',
  },
  progressTrack: {
    height: 14,
    borderRadius: 999,
    backgroundColor: COLORS.progressTrack,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    minWidth: 8,
    backgroundColor: COLORS.progressFill,
    borderRadius: 999,
  },
  progressMiniStatsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  progressMiniStat: {
    flex: 1,
    backgroundColor: 'rgba(247, 243, 234, 0.06)',
    borderRadius: 16,
    padding: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.lightGold + '14',
  },
  progressMiniLabel: {
    color: '#B7C9BE',
    fontSize: 12,
  },
  progressMiniValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  progressStatsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  progressFootnote: {
    color: COLORS.mutedText,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  progressStat: {
    flex: 1,
    backgroundColor: 'rgba(247, 243, 234, 0.06)',
    borderRadius: 16,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.lightGold + '12',
  },
  progressStatLabel: {
    color: '#B7C9BE',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  progressStatValue: {
    color: COLORS.cream,
    fontSize: 14,
    fontWeight: '700',
  },
  dayActionCard: {
    backgroundColor: 'rgba(20, 67, 42, 0.92)',
    borderRadius: 22,
    padding: 18,
    gap: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.lightGold + '1f',
  },
  dayActionInfo: {
    gap: 6,
  },
  dayActionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(247, 243, 234, 0.08)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.gold + '22',
    marginBottom: 2,
  },
  dayActionBadgeText: {
    color: COLORS.lightGold,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  dayActionTitle: {
    color: COLORS.cream,
    fontSize: 22,
    fontWeight: '800',
  },
  dayActionSubtitle: {
    color: COLORS.cream,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  dayActionMeta: {
    color: COLORS.mutedText,
    fontSize: 13,
    lineHeight: 19,
  },
  dayActionButtons: {
    gap: 10,
  },
  fullDayButton: {
    backgroundColor: COLORS.gold,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.lightGold + '66',
  },
  fullDayButtonText: {
    color: COLORS.nightBlue,
    fontSize: 17,
    fontWeight: '800',
  },
  dayActionSecondaryButton: {
    backgroundColor: 'rgba(247, 243, 234, 0.06)',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gold + '18',
  },
  prayerCard: {
    backgroundColor: 'rgba(20, 67, 42, 0.92)',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 14,
  },
  prayerInfo: {
    flex: 1,
  },
  prayerLabel: {
    color: COLORS.cream,
    fontSize: 17,
    fontWeight: '700',
  },
  prayerMeta: {
    color: COLORS.mutedText,
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
  actionsColumn: {
    alignItems: 'stretch',
    gap: 8,
    minWidth: 92,
  },
  addButton: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.lightGold + '20',
  },
  addButtonText: {
    color: COLORS.cream,
    fontSize: 16,
    fontWeight: '800',
  },
  minusButton: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gold + '22',
  },
  minusButtonText: {
    color: COLORS.cream,
    fontSize: 13,
    fontWeight: '700',
  },
  calendarLegendText: {
    color: COLORS.roseGold,
    fontSize: 12,
    lineHeight: 18,
  },
  calendarMonthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  calendarMonthLabel: {
    color: COLORS.cream,
    fontSize: 16,
    fontWeight: '800',
  },
  monthNavButton: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.gold + '22',
  },
  monthNavButtonText: {
    color: COLORS.cream,
    fontSize: 12,
    fontWeight: '700',
  },
  calendarRow: {
    flexDirection: 'row',
    gap: 8,
  },
  calendarCell: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    minHeight: 72,
    justifyContent: 'center',
  },
  calendarCellEmpty: {
    backgroundColor: 'rgba(247, 243, 234, 0.05)',
  },
  calendarCellOutside: {
    opacity: 0.45,
  },
  calendarCellSelected: {
    borderWidth: 2,
    borderColor: COLORS.cream,
  },
  calendarCellLight: {
    backgroundColor: 'rgba(41, 91, 69, 0.85)',
  },
  calendarCellMedium: {
    backgroundColor: 'rgba(27, 94, 59, 0.92)',
  },
  calendarCellFull: {
    backgroundColor: COLORS.gold,
  },
  calendarDayNumber: {
    color: COLORS.cream,
    fontSize: 18,
    fontWeight: '800',
  },
  calendarDayNumberOutside: {
    color: COLORS.roseGold,
  },
  calendarCountDot: {
    minWidth: 24,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(10, 42, 30, 0.42)',
    alignItems: 'center',
    marginTop: 6,
  },
  calendarCountDotText: {
    color: COLORS.cream,
    fontSize: 11,
    fontWeight: '800',
  },
  selectedDayCard: {
    backgroundColor: 'rgba(20, 67, 42, 0.92)',
    borderRadius: 18,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.gold + '22',
  },
  selectedDayTitle: {
    color: COLORS.cream,
    fontSize: 16,
    fontWeight: '800',
  },
  selectedDayCount: {
    color: COLORS.lightGold,
    fontSize: 14,
    fontWeight: '700',
  },
  selectedDayBody: {
    color: COLORS.mutedText,
    fontSize: 13,
    lineHeight: 19,
  },
  dayDetailsButton: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.gold + '22',
  },
  dayDetailsButtonText: {
    color: COLORS.cream,
    fontSize: 13,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#00000099',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: 'rgba(13, 43, 32, 0.98)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderColor: COLORS.gold + '22',
    maxHeight: '92%',
  },
  modalSheet: {
    backgroundColor: 'rgba(13, 43, 32, 0.98)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderColor: COLORS.gold + '22',
  },
  modalTitle: {
    color: COLORS.cream,
    fontSize: 20,
    fontWeight: '800',
  },
  modalScrollContent: {
    paddingBottom: 8,
  },
  modalActions: {
    gap: 10,
  },
  modalDate: {
    color: COLORS.lightGold,
    fontSize: 14,
    fontWeight: '700',
  },
  prayerBreakdownList: {
    gap: 10,
    paddingTop: 4,
  },
  prayerBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  prayerBreakdownName: {
    color: COLORS.cream,
    fontSize: 15,
    fontWeight: '700',
  },
  prayerBreakdownValue: {
    color: COLORS.lightGold,
    fontSize: 16,
    fontWeight: '800',
  },
  prayerBreakdownActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  historyAdjustButton: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  historyAdjustButtonAdd: {
    backgroundColor: COLORS.forestGreen,
    borderColor: COLORS.lightGold + '22',
  },
  historyAdjustButtonUndo: {
    backgroundColor: COLORS.inputBg,
    borderColor: COLORS.gold + '22',
  },
  historyAdjustButtonText: {
    color: COLORS.cream,
    fontSize: 12,
    fontWeight: '800',
  },
  modalCloseButton: {
    marginTop: 8,
    backgroundColor: COLORS.forestGreen,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: COLORS.cream,
    fontSize: 15,
    fontWeight: '800',
  },
  qaCard: {
    backgroundColor: COLORS.prayerCardBg,
    borderRadius: 18,
    padding: 16,
    gap: 8,
    overflow: 'hidden',
  },
  qaTrustCard: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 18,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.gold + '18',
    marginBottom: 12,
  },
  qaCategoryChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(247, 243, 234, 0.06)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.gold + '22',
  },
  qaCategoryChipText: {
    color: COLORS.lightGold,
    fontSize: 11,
    fontWeight: '800',
  },
  qaTitle: {
    color: COLORS.cream,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  qaMeta: {
    color: COLORS.lightGold,
    fontSize: 12,
    fontWeight: '700',
  },
  qaBody: {
    color: COLORS.mutedText,
    fontSize: 13,
    lineHeight: 19,
  },
  qaButton: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.gold + '22',
  },
  qaButtonText: {
    color: COLORS.cream,
    fontSize: 13,
    fontWeight: '700',
  },
  fastingLogCard: {
    backgroundColor: COLORS.prayerCardBg,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.gold + '14',
  },
  fastingMonthSection: {
    gap: 10,
  },
  fastingMonthTitle: {
    color: COLORS.lightGold,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  fastingLogDate: {
    color: COLORS.cream,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  fastingLogCount: {
    color: COLORS.lightGold,
    fontSize: 13,
    fontWeight: '700',
  },
  kafarahAdvancedCard: {
    marginTop: 14,
    backgroundColor: COLORS.inputBg,
    borderRadius: 18,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.gold + '18',
  },
  kafarahAdvancedLabel: {
    color: COLORS.lightGold,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  kafarahAdvancedTitle: {
    color: COLORS.cream,
    fontSize: 16,
    fontWeight: '800',
  },
  kafarahAdvancedBody: {
    color: COLORS.mutedText,
    fontSize: 13,
    lineHeight: 19,
  },
  kafarahAdvancedNote: {
    color: COLORS.lightGold,
    fontSize: 12,
    lineHeight: 18,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    backgroundColor: COLORS.inputBg,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  settingsPanel: {
    backgroundColor: COLORS.prayerCardBg,
    borderRadius: 22,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.gold + '14',
  },
  advancedSettingsPanel: {
    backgroundColor: COLORS.inputBg + 'CC',
    borderRadius: 22,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.gold + '10',
  },
  settingsPanelTitle: {
    color: COLORS.cream,
    fontSize: 16,
    fontWeight: '800',
  },
  settingsCompactHint: {
    color: COLORS.mutedText,
    fontSize: 13,
    lineHeight: 18,
  },
  settingsDivider: {
    height: 1,
    backgroundColor: COLORS.gold + '12',
  },
  settingsLabel: {
    color: COLORS.cream,
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  notificationStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  notificationCard: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 18,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.lightGold + '12',
  },
  notificationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  notificationHeaderText: {
    flex: 1,
    gap: 4,
  },
  notificationStatusBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
  },
  notificationStatusBadgeOn: {
    backgroundColor: COLORS.success + '1A',
    borderColor: COLORS.success + '55',
  },
  notificationStatusBadgeOff: {
    backgroundColor: COLORS.gold + '14',
    borderColor: COLORS.gold + '33',
  },
  notificationStatusBadgeText: {
    color: COLORS.cream,
    fontSize: 12,
    fontWeight: '800',
  },
  notificationSummaryGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  notificationSummaryItem: {
    flex: 1,
    backgroundColor: COLORS.darkGreen,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  notificationSummaryLabel: {
    color: COLORS.mutedText,
    fontSize: 12,
    fontWeight: '700',
  },
  notificationSummaryValue: {
    color: COLORS.cream,
    fontSize: 16,
    fontWeight: '800',
  },
  notificationEditorCard: {
    backgroundColor: COLORS.darkGreen,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  notificationFieldLabel: {
    color: COLORS.mutedText,
    fontSize: 13,
    fontWeight: '700',
  },
  notificationStatusValue: {
    color: COLORS.lightGold,
    fontSize: 14,
    fontWeight: '700',
  },
  notificationTimeValue: {
    color: COLORS.cream,
    fontSize: 14,
    fontWeight: '700',
  },
  notificationTimeEditorRow: {
    flexDirection: 'row',
    gap: 12,
  },
  notificationTimeField: {
    flex: 1,
    gap: 8,
  },
  notificationTimeInput: {
    flex: 0,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
  },
  notificationPreviewText: {
    color: COLORS.lightGold,
    fontSize: 13,
    fontWeight: '700',
  },
  notificationActionsColumn: {
    gap: 10,
  },
  accountCard: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 18,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.lightGold + '12',
  },
  accountLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  accountName: {
    color: COLORS.cream,
    fontSize: 18,
    fontWeight: '800',
  },
  accountBody: {
    color: COLORS.mutedText,
    fontSize: 14,
    lineHeight: 20,
  },
  accountMeta: {
    color: COLORS.lightGold,
    fontSize: 13,
    lineHeight: 19,
  },
  accountStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  accountStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  accountStatusDotReady: {
    backgroundColor: '#8FD49A',
  },
  accountStatusDotNotReady: {
    backgroundColor: COLORS.lightGold,
  },
  accountStatusLine: {
    color: COLORS.lightGold,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  authButtons: {
    gap: 10,
  },
  oauthButtonPrimary: {
    backgroundColor: COLORS.gold,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.lightGold + '66',
  },
  oauthButtonSecondary: {
    backgroundColor: COLORS.forestGreen,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.lightGold + '22',
  },
  oauthButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 22,
  },
  oauthButtonBrandPrimary: {
    color: COLORS.nightBlue,
    fontSize: 18,
    fontWeight: '900',
  },
  oauthButtonPrimaryText: {
    color: COLORS.nightBlue,
    fontSize: 15,
    fontWeight: '800',
  },
  oauthButtonBrandSecondary: {
    color: COLORS.cream,
    fontSize: 18,
    fontWeight: '900',
  },
  oauthButtonSecondaryText: {
    color: COLORS.cream,
    fontSize: 15,
    fontWeight: '800',
  },
  accountError: {
    color: '#FFCDC1',
    fontSize: 13,
    lineHeight: 19,
  },
  partnerCard: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  partnerInput: {
    backgroundColor: COLORS.darkGreen,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.cream,
    fontSize: 15,
  },
  shareButton: {
    backgroundColor: COLORS.forestGreen,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gold + '22',
  },
  actionButtonDisabled: {
    opacity: 0.48,
  },
  shareButtonText: {
    color: COLORS.cream,
    fontSize: 14,
    fontWeight: '800',
  },
  notesInput: {
    minHeight: 110,
    textAlignVertical: 'top',
    backgroundColor: COLORS.inputBg,
    borderRadius: 16,
    padding: 14,
    color: COLORS.cream,
    fontSize: 15,
    lineHeight: 22,
  },
  notesInputArabic: {
    textAlign: 'right',
  },
  backupSection: {
    backgroundColor: COLORS.prayerCardBg,
    borderRadius: 24,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.gold + '11',
  },
  backupTitle: {
    color: COLORS.cream,
    fontSize: 16,
    fontWeight: '700',
  },
  backupHint: {
    color: COLORS.mutedText,
    fontSize: 13,
    lineHeight: 18,
  },
  backupStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backupButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  backupStatusLabel: {
    color: COLORS.gold,
    fontSize: 12,
  },
  backupStatusText: {
    color: COLORS.success,
    fontSize: 12,
    fontWeight: '600',
  },
  backupButton: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.gold + '22',
    flex: 1,
    alignItems: 'center',
  },
  backupButtonText: {
    color: COLORS.cream,
    fontSize: 13,
    fontWeight: '600',
  },
  developerCard: {
    backgroundColor: 'rgba(247, 243, 234, 0.05)',
    borderRadius: 18,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.lightGold + '12',
  },
  developerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'center',
  },
  developerEmailButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'center',
    paddingVertical: 4,
  },
  developerValue: {
    color: COLORS.cream,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
  developerEmailValue: {
    color: COLORS.lightGold,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'center',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGold + '10',
    marginTop: 2,
  },
});
