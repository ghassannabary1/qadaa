import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ImageBackground,
  Linking,
  Modal,
  Pressable,
  SafeAreaView,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  AppLanguage,
  AppState,
  applyFullDayCompletion,
  applyPrayerCompletion,
  countsFromMissedDays,
  DailyActivitySummary,
  defaultAppState,
  estimateCompletionDays,
  estimateCompletionDate,
  estimateMissedDaysFromShafiiSetup,
  getRecentDailyActivity,
  hydrateState,
  PrayerCounts,
  PrayerKey,
  PRAYER_KEYS,
  PRAYER_LABELS,
  PRAYERS_PER_QADAA_DAY,
  remainingCounts,
  rollbackFullDayCompletion,
  rollbackPrayerCompletion,
  totalCounts,
} from './src/utils/qadaa';
import { createBackup, exportBackup, getBackupAge } from './src/utils/backup';
import { DividerOrnament } from './src/ui/patterns/DividerOrnament';

const STORAGE_KEY = 'qadaa-simple-v2';
const ONBOARD_KEY = 'qadaa-onboarded-v1';
const AUTO_BACKUP_INTERVAL = 30 * 1000;
const DEFAULT_NOTES = defaultAppState().notes;
const APP_BACKGROUND = require('./assets/patterns/backgrounds/app-islamic-floral-background.png');

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

type AppTab = 'home' | 'history' | 'answers' | 'more';

type Totals = {
  target: number;
  completed: number;
  remaining: number;
  today: number;
};

type OnboardingSetup = {
  notes: string;
  target: PrayerCounts;
};

type CopyBlock = {
  dir: 'ltr' | 'rtl';
  appEyebrow: string;
  appTitle: string;
  appSummary: string;
  dailyHadithTitle: string;
  dailyHadithIntro: string;
  onboardingTitle: string;
  onboardingSubtitle: string;
  onboardingEstimateTitle: string;
  onboardingEstimateBody: string;
  latestPubertyAge: string;
  latestPubertyHint: string;
  regularPrayerAge: string;
  regularPrayerHint: string;
  menstruationDays: string;
  menstruationHint: string;
  estimateBacklog: string;
  estimateBacklogBody: string;
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
  settingsTitle: string;
  languageTitle: string;
  languageHint: string;
  accountabilityTitle: string;
  accountabilityHint: string;
  partnerNameLabel: string;
  partnerNamePlaceholder: string;
  shareProgress: string;
  notesTitle: string;
  notesPlaceholder: string;
  comingNextTitle: string;
  comingNextBody: string;
  backupTitle: string;
  backupHint: string;
  exportBackup: string;
  importBackup: string;
  autoBackup: string;
  enabled: string;
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
    onboardingEstimateTitle: "First-time Shafi'i estimate",
    onboardingEstimateBody:
      'Estimate from the latest likely puberty age until the age when regular prayer became certain. If unsure whether a prayer was prayed, count it. Menstruation days can be excluded.',
    latestPubertyAge: 'Latest puberty age',
    latestPubertyHint: 'Use the latest age puberty had definitely started.',
    regularPrayerAge: 'Age when regular prayer became certain',
    regularPrayerHint: 'Use the age when you know you were praying consistently.',
    menstruationDays: 'Menstruation days per lunar year',
    menstruationHint: 'Optional. Keep 0 if not applicable.',
    estimateBacklog: 'Estimated backlog',
    estimateBacklogBody: 'This fills the five daily prayers with the same number of missed days.',
    useEstimate: 'Use estimate',
    startNow: 'Start now',
    skipForNow: 'Skip for now',
    remaining: 'Prayers left',
    completed: 'Total finished',
    primaryFocus: 'Main focus',
    daysCompleted: 'Qadaa days completed',
    daysLeft: 'Qadaa days left',
    overallProgress: 'Overall progress',
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
    qnaHint: 'Trusted Shafi\'i study links. We can expand this later with named scholars and categories.',
    settingsTitle: 'Settings',
    languageTitle: 'Language',
    languageHint: 'Choose one full app language for the whole interface.',
    accountabilityTitle: 'Accountability partner',
    accountabilityHint: 'Keep this private and encouraging. Share only today’s progress with one trusted friend.',
    partnerNameLabel: 'Partner name',
    partnerNamePlaceholder: 'Trusted friend',
    shareProgress: 'Share today\'s progress',
    notesTitle: 'Notes',
    notesPlaceholder: 'How are you counting your qadaa?',
    comingNextTitle: 'Coming next',
    comingNextBody:
      'Daily notifications can be added next, asking whether the day was counted and offering a quick undo.',
    backupTitle: 'Data backup',
    backupHint: 'Your data auto-saves locally. Export a manual backup any time.',
    exportBackup: 'Export Backup',
    importBackup: 'Import Backup',
    autoBackup: 'Auto-backup',
    enabled: 'Enabled',
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
  },
  ar: {
    dir: 'rtl',
    appEyebrow: 'قضاء',
    appTitle: 'ابنِ عادة ثابتة في قضاء الصلوات.',
    appSummary: 'سجّل ما أنجزته اليوم، وتابع سرعتك بوضوح، وراجع انتظامك مع مرور الوقت.',
    dailyHadithTitle: 'حديث اليوم',
    dailyHadithIntro: 'تذكير في الصلاة',
    onboardingTitle: 'قضاء',
    onboardingSubtitle:
      'اختر اللغة، واضبط تقديراً أولياً بسيطاً على المذهب الشافعي، ثم ابدأ بواجهة هادئة وسهلة.',
    onboardingEstimateTitle: 'تقدير أولي على المذهب الشافعي',
    onboardingEstimateBody:
      'يُقدَّر من آخر سن يُحتمل فيه البلوغ إلى السن الذي تيقنت فيه من الانتظام في الصلاة. وإذا شككت هل صليت صلاةً أم لا فاحسبها. ويمكن استثناء أيام الحيض.',
    latestPubertyAge: 'آخر سن محتمل للبلوغ',
    latestPubertyHint: 'استخدم آخر سن تتيقن أن البلوغ كان قد حصل فيه.',
    regularPrayerAge: 'السن الذي تيقنت فيه من الانتظام بالصلاة',
    regularPrayerHint: 'استخدم السن الذي عرفت فيه أنك أصبحت تصلي باستمرار.',
    menstruationDays: 'أيام الحيض في السنة القمرية',
    menstruationHint: 'اختياري. اتركه 0 إن لم يكن مناسباً.',
    estimateBacklog: 'التقدير الأولي',
    estimateBacklogBody: 'سيملأ هذا التقدير الصلوات الخمس اليومية بنفس عدد الأيام الفائتة.',
    useEstimate: 'استخدم التقدير',
    startNow: 'ابدأ الآن',
    skipForNow: 'تخطَّ الآن',
    remaining: 'الصلوات المتبقية',
    completed: 'إجمالي المنجز',
    primaryFocus: 'التركيز الأساسي',
    daysCompleted: 'أيام القضاء المنجزة',
    daysLeft: 'أيام القضاء المتبقية',
    overallProgress: 'التقدّم العام',
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
    fullDayPrimary: 'العدّ باليوم أولاً',
    fullDaySecondary: 'استخدم تفاصيل الصلوات فقط عند الحاجة إلى التصحيح أو الضبط.',
    addDay: '+1 يوم',
    undoDay: 'تراجع عن اليوم',
    undo: 'تراجع',
    historyTitle: 'تقويم السجل',
    historyHint: 'عرض شهري لنشاط القضاء الأخير حتى ترى انتظامك بصرياً وبشكل واضح.',
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
    qnaTitle: 'أسئلة وأجوبة',
    qnaHint: 'روابط موثوقة في الفقه الشافعي. يمكن توسيعها لاحقاً بأسماء العلماء والتصنيفات.',
    settingsTitle: 'الإعدادات',
    languageTitle: 'اللغة',
    languageHint: 'اختر لغة واحدة كاملة لواجهة التطبيق كلها.',
    accountabilityTitle: 'شريك المحاسبة',
    accountabilityHint: 'اجعلها مشاركة خاصة ومشجعة، وشارك إنجاز اليوم فقط مع شخص تثق به.',
    partnerNameLabel: 'اسم الشريك',
    partnerNamePlaceholder: 'صديق موثوق',
    shareProgress: 'مشاركة إنجاز اليوم',
    notesTitle: 'ملاحظات',
    notesPlaceholder: 'كيف تحسب القضاء عندك؟',
    comingNextTitle: 'لاحقاً',
    comingNextBody:
      'يمكن إضافة تنبيهات يومية لاحقاً تسألك هل تم احتساب اليوم، مع خيار سريع للتراجع.',
    backupTitle: 'نسخ البيانات',
    backupHint: 'بياناتك تُحفظ محلياً تلقائياً. ويمكنك التصدير في أي وقت لنسخة يدوية.',
    exportBackup: 'تصدير نسخة',
    importBackup: 'استيراد نسخة',
    autoBackup: 'الحفظ التلقائي',
    enabled: 'مفعّل',
    openSource: 'فتح المصدر',
    finish: 'الانتهاء',
    needHistory: 'تحتاج إلى سجل أكثر',
    homeTab: 'الرئيسية',
    historyTab: 'السجل',
    answersTab: 'الأسئلة',
    moreTab: 'المزيد',
    doneLabel: 'تم',
    remainingLabel: 'متبقٍ',
    dayUnit: 'يوم',
  },
};

const DAILY_HADITH = {
  en: {
    text: 'The best deed is the prayer at its proper time.',
    source: 'Sunnah.com search result citing Sahih Muslim, Book 2 Hadith 23',
    url: 'https://sunnah.com/search?q=best+of+deeds',
  },
  ar: {
    text: 'أفضل الأعمال الصلاة لوقتها.',
    source: 'مستفاد من نتائج Sunnah.com في صحيح مسلم، كتاب ٢ حديث ٢٣',
    url: 'https://sunnah.com/search?q=best+of+deeds',
  },
};

const TRUSTED_QA = {
  en: [
    {
      title: 'How should I calculate missed prayers?',
      scholar: 'Qibla / Shafi’i fiqh answer',
      source: 'IslamQA.org',
      summary:
        'Count from the latest time you could have reached puberty until the point you are sure you prayed regularly. Menstruation days are excluded.',
      url: 'https://islamqa.org/shafii/qibla-shafii/34205/making-up-missed-prayers/',
    },
    {
      title: 'Do missed prayers still need to be made up?',
      scholar: 'Shaykh Jamir Meah',
      source: 'SeekersGuidance via IslamQA.org',
      summary:
        'Missed prayers should be made up from puberty until you are certain you started praying consistently, and worked through steadily.',
      url: 'https://islamqa.org/shafii/seekersguidance-shafii/168871/is-it-necessary-to-make-up-missed-prayers-shafii/',
    },
  ],
  ar: [
    {
      title: 'كيف أقدّر الصلوات الفائتة؟',
      scholar: 'جواب شافعي من Qibla',
      source: 'IslamQA.org',
      summary:
        'يبدأ التقدير من آخر وقت يُحتمل فيه البلوغ إلى الوقت الذي تيقنت فيه من انتظامك في الصلاة، مع استثناء أيام الحيض.',
      url: 'https://islamqa.org/shafii/qibla-shafii/34205/making-up-missed-prayers/',
    },
    {
      title: 'هل يجب قضاء الصلوات الفائتة؟',
      scholar: 'الشيخ جميل ميه',
      source: 'IslamQA.org',
      summary:
        'يُقضى ما فات من البلوغ إلى الزمن الذي تيقنت فيه من المحافظة على الصلاة، ويكون القضاء بالتدرج والاستمرار.',
      url: 'https://islamqa.org/shafii/seekersguidance-shafii/168871/is-it-necessary-to-make-up-missed-prayers-shafii/',
    },
  ],
};

export default function App() {
  const [state, setState] = useState<AppState>(defaultAppState());
  const [loaded, setLoaded] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const loadState = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const onboarded = await AsyncStorage.getItem(ONBOARD_KEY);
        const backupAge = await getBackupAge();

        if (raw) {
          setState(hydrateState(JSON.parse(raw) as Partial<AppState>));
        }
        if (!onboarded) {
          setShowOnboarding(true);
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

  const completeQadaaDay = () => {
    setState((current) => applyFullDayCompletion(current));
  };

  const undoQadaaDay = () => {
    setState((current) => rollbackFullDayCompletion(current));
  };

  const updateLanguage = (language: AppLanguage) => {
    setState((current) => ({ ...current, language }));
  };

  const resetToday = () => {
    const copy = COPY[state.language];
    Alert.alert(copy.resetToday, copy.resetToday, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: copy.resetToday,
        style: 'destructive',
        onPress: () =>
          setState((current) => ({
            ...current,
            todayCompleted: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
          })),
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
        target: setup.target,
        notes: current.notes === DEFAULT_NOTES ? setup.notes : `${setup.notes}\n\n${current.notes}`,
      }));
    }

    setShowOnboarding(false);
  };

  const handleExport = useCallback(async () => {
    const copy = COPY[state.language];
    Alert.alert(copy.exportBackup, copy.backupHint, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: copy.exportBackup,
        onPress: async () => {
          const exportData = await exportBackup();
          if (exportData) {
            console.log('Exported:', exportData);
            Alert.alert(copy.exportBackup, copy.enabled);
          }
        },
      },
    ]);
  }, [state.language]);

  const handleImport = useCallback(async () => {
    const copy = COPY[state.language];
    Alert.alert(copy.importBackup, 'Coming soon.', [{ text: 'OK' }]);
  }, [state.language]);

  const handleShareProgress = useCallback(async () => {
    const copy = COPY[state.language];
    const partner = state.accountabilityPartnerName.trim();
    const partnerLine = partner
      ? state.language === 'ar'
        ? `إلى ${partner}`
        : `To ${partner}`
      : state.language === 'ar'
        ? 'مع شريك محاسبة موثوق'
        : 'With a trusted accountability partner';
    const message =
      state.language === 'ar'
        ? `${partnerLine}\nأنجزت اليوم ${totals.today} صلاة قضاء.\nإجمالي المنجز: ${totals.completed}.\nالمتبقي: ${totals.remaining}.\nدعواتك لي بالثبات.`
        : `${partnerLine}\nI counted ${totals.today} qadaa prayers today.\nTotal finished: ${totals.completed}.\nPrayers left: ${totals.remaining}.\nPlease make du'a for consistency.`;

    await Share.share({ message, title: copy.accountabilityTitle });
  }, [state.language, state.accountabilityPartnerName, totals, ]);

  return (
    <ImageBackground source={APP_BACKGROUND} style={styles.backgroundImage} imageStyle={styles.backgroundImageAsset}>
      <View style={styles.backgroundTint}>
        <StatusBar style="light" />
        {showOnboarding ? (
          <OnboardingScreen
            language={state.language}
            onLanguageChange={updateLanguage}
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
            completeQadaaDay={completeQadaaDay}
            undoQadaaDay={undoQadaaDay}
            resetToday={resetToday}
            onLanguageChange={updateLanguage}
            handleExport={handleExport}
            handleImport={handleImport}
            handleShareProgress={handleShareProgress}
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
            {option === 'en' ? 'EN' : 'AR'}
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
}: {
  activeTab: AppTab;
  onChange: (tab: AppTab) => void;
  copy: CopyBlock;
}) {
  const tabs: { key: AppTab; label: string }[] = [
    { key: 'home', label: copy.homeTab },
    { key: 'history', label: copy.historyTab },
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
  onComplete,
}: {
  language: AppLanguage;
  onLanguageChange: (language: AppLanguage) => void;
  onComplete: (setup?: OnboardingSetup) => void;
}) {
  const copy = COPY[language];
  const [latestPubertyAge, setLatestPubertyAge] = useState('15');
  const [regularPrayerAge, setRegularPrayerAge] = useState('');
  const [menstruationDays, setMenstruationDays] = useState('0');

  const parsedPubertyAge = Number(latestPubertyAge);
  const parsedRegularPrayerAge = Number(regularPrayerAge);
  const parsedMenstruationDays = Number(menstruationDays);

  const estimate = useMemo(() => {
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
          ? `تقدير شافعي أولي: من سن ${parsedPubertyAge} إلى سن ${parsedRegularPrayerAge}.`
          : `Shafi'i estimate setup: counted from age ${parsedPubertyAge} to age ${parsedRegularPrayerAge}.`,
    };
  }, [
    language,
    latestPubertyAge,
    parsedMenstruationDays,
    parsedPubertyAge,
    parsedRegularPrayerAge,
    regularPrayerAge,
  ]);

  return (
    <View style={styles.onboarding}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.onboardingScrollContent}>
          <View style={styles.onboardingCard}>
            <View style={styles.onboardingTopRow}>
              <View style={{ flex: 1 }} />
              <LanguageToggle language={language} onChange={onLanguageChange} />
            </View>

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
              <Text style={[styles.setupTitle, isArabic(language) && styles.alignRight]}>
                {copy.onboardingEstimateTitle}
              </Text>
              <Text style={[styles.setupBody, isArabic(language) && styles.alignRight]}>
                {copy.onboardingEstimateBody}
              </Text>

              <SetupField
                label={copy.latestPubertyAge}
                hint={copy.latestPubertyHint}
                value={latestPubertyAge}
                onChangeText={setLatestPubertyAge}
                placeholder="15"
                language={language}
              />
              <SetupField
                label={copy.regularPrayerAge}
                hint={copy.regularPrayerHint}
                value={regularPrayerAge}
                onChangeText={setRegularPrayerAge}
                placeholder="18"
                language={language}
              />
              <SetupField
                label={copy.menstruationDays}
                hint={copy.menstruationHint}
                value={menstruationDays}
                onChangeText={setMenstruationDays}
                placeholder="0"
                language={language}
              />

              {estimate ? (
                <View style={styles.estimateResult}>
                  <Text style={[styles.estimateResultTitle, isArabic(language) && styles.alignRight]}>
                    {copy.estimateBacklog}: {estimate.missedDays}
                  </Text>
                  <Text style={[styles.estimateResultBody, isArabic(language) && styles.alignRight]}>
                    {copy.estimateBacklogBody}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.onboardingButtons}>
              <Pressable onPress={() => onComplete(estimate ?? undefined)} style={styles.onboardingButton}>
                <Text style={styles.onboardingButtonText}>
                  {estimate ? copy.useEstimate : copy.startNow}
                </Text>
              </Pressable>
              <Pressable onPress={() => onComplete()} style={styles.ghostButton}>
                <Text style={styles.ghostButtonText}>{copy.skipForNow}</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
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

function MainApp({
  state,
  setState,
  totals,
  dailyHistory,
  incrementCompleted,
  decrementCompleted,
  completeQadaaDay,
  undoQadaaDay,
  resetToday,
  onLanguageChange,
  handleShareProgress,
  handleExport,
  handleImport,
}: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  totals: Totals;
  dailyHistory: DailyActivitySummary[];
  incrementCompleted: (prayer: PrayerKey) => void;
  decrementCompleted: (prayer: PrayerKey) => void;
  completeQadaaDay: () => void;
  undoQadaaDay: () => void;
  resetToday: () => void;
  onLanguageChange: (language: AppLanguage) => void;
  handleShareProgress: () => void;
  handleExport: () => void;
  handleImport: () => void;
}) {
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [showPrayerRows, setShowPrayerRows] = useState(false);
  const copy = COPY[state.language];
  const hadith = DAILY_HADITH[state.language];
  const progress = useMemo(() => {
    const percent = totals.target > 0 ? Math.min(totals.completed / totals.target, 1) : 0;
    const estimatedDaysLeft = estimateCompletionDays(totals.remaining, state.log);
    const finishDate = estimateCompletionDate(totals.remaining, state.log);

    return {
      percent,
      completedDays: totals.completed / PRAYERS_PER_QADAA_DAY,
      remainingDays: totals.remaining / PRAYERS_PER_QADAA_DAY,
      todayDays: totals.today / PRAYERS_PER_QADAA_DAY,
      estimatedDaysLeft:
        estimatedDaysLeft === null ? null : estimatedDaysLeft,
      finishDate,
    };
  }, [state.log, totals]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
      <View style={styles.appShell}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.headerCard}>
            <View style={styles.headerTopRow}>
              <Text style={styles.eyebrow}>{copy.appEyebrow}</Text>
            </View>
            <Text style={[styles.title, isArabic(state.language) && styles.alignRight]}>
              {copy.appTitle}
            </Text>
            <Text style={[styles.subtitle, isArabic(state.language) && styles.alignRight]}>
              {copy.appSummary}
            </Text>
            <DividerOrnament color={COLORS.gold} />
            <Pressable onPress={() => Linking.openURL(hadith.url)} style={styles.hadithCard}>
              <View style={styles.hadithBadge}>
                <Text style={[styles.hadithLabel, isArabic(state.language) && styles.alignRight]}>
                  {copy.dailyHadithTitle}
                </Text>
              </View>
              <Text style={[styles.hadithText, isArabic(state.language) && styles.alignRight]}>
                {hadith.text}
              </Text>
              <Text style={[styles.hadithSource, isArabic(state.language) && styles.alignRight]}>
                {hadith.source}
              </Text>
            </Pressable>
          </View>

          {activeTab === 'home' ? (
            <>
              <ProgressOverview
                copy={copy}
                totals={totals}
                progress={progress}
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
            <HistoryTab copy={copy} language={state.language} dailyHistory={dailyHistory} />
          ) : null}

          {activeTab === 'answers' ? (
            <AnswersTab copy={copy} language={state.language} />
          ) : null}

          {activeTab === 'more' ? (
            <MoreTab
              copy={copy}
              language={state.language}
              onLanguageChange={onLanguageChange}
              accountabilityPartnerName={state.accountabilityPartnerName}
              onAccountabilityPartnerNameChange={(accountabilityPartnerName) =>
                setState((current) => ({ ...current, accountabilityPartnerName }))
              }
              notes={state.notes}
              onNotesChange={(notes) => setState((current) => ({ ...current, notes }))}
              handleShareProgress={handleShareProgress}
              handleExport={handleExport}
              handleImport={handleImport}
            />
          ) : null}
        </ScrollView>

        <TabBar activeTab={activeTab} onChange={setActiveTab} copy={copy} />
      </View>
    </SafeAreaView>
  );
}

function HistoryTab({
  copy,
  language,
  dailyHistory,
}: {
  copy: CopyBlock;
  language: AppLanguage;
  dailyHistory: DailyActivitySummary[];
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
              ) : (
                <View style={styles.prayerBreakdownList}>
                  {PRAYER_KEYS.map((prayer) => (
                    <View key={prayer} style={styles.prayerBreakdownRow}>
                      <Text style={[styles.prayerBreakdownName, isArabic(language) && styles.alignRight]}>
                        {language === 'ar' ? PRAYER_LABELS[prayer].arabic : PRAYER_LABELS[prayer].label}
                      </Text>
                      <Text style={styles.prayerBreakdownValue}>{selectedDay.prayerCounts[prayer]}</Text>
                    </View>
                  ))}
                </View>
              )}
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
      {TRUSTED_QA[language].map((item) => (
        <View key={item.url} style={styles.qaCard}>
          <Text style={[styles.qaTitle, isArabic(language) && styles.alignRight]}>{item.title}</Text>
          <Text style={[styles.qaMeta, isArabic(language) && styles.alignRight]}>
            {item.scholar} · {item.source}
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
  accountabilityPartnerName,
  onAccountabilityPartnerNameChange,
  notes,
  onNotesChange,
  handleShareProgress,
  handleExport,
  handleImport,
}: {
  copy: CopyBlock;
  language: AppLanguage;
  onLanguageChange: (language: AppLanguage) => void;
  accountabilityPartnerName: string;
  onAccountabilityPartnerNameChange: (name: string) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  handleShareProgress: () => void;
  handleExport: () => void;
  handleImport: () => void;
}) {
  return (
    <>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isArabic(language) && styles.alignRight]}>
          {copy.settingsTitle}
        </Text>
        <Text style={[styles.sectionHint, isArabic(language) && styles.alignRight]}>
          {copy.languageHint}
        </Text>
        <View style={styles.settingsRow}>
          <Text style={[styles.settingsLabel, isArabic(language) && styles.alignRight]}>
            {copy.languageTitle}
          </Text>
          <LanguageToggle language={language} onChange={onLanguageChange} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isArabic(language) && styles.alignRight]}>
          {copy.accountabilityTitle}
        </Text>
        <Text style={[styles.sectionHint, isArabic(language) && styles.alignRight]}>
          {copy.accountabilityHint}
        </Text>
        <View style={styles.partnerCard}>
          <Text style={[styles.settingsLabel, isArabic(language) && styles.alignRight]}>
            {copy.partnerNameLabel}
          </Text>
          <TextInput
            value={accountabilityPartnerName}
            onChangeText={onAccountabilityPartnerNameChange}
            style={[styles.partnerInput, isArabic(language) && styles.notesInputArabic]}
            placeholder={copy.partnerNamePlaceholder}
            placeholderTextColor={COLORS.mutedText}
          />
          <Pressable onPress={handleShareProgress} style={styles.shareButton}>
            <Text style={styles.shareButtonText}>{copy.shareProgress}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isArabic(language) && styles.alignRight]}>{copy.notesTitle}</Text>
        <TextInput
          multiline
          value={notes}
          onChangeText={onNotesChange}
          style={[styles.notesInput, isArabic(language) && styles.notesInputArabic]}
          placeholder={copy.notesPlaceholder}
          placeholderTextColor={COLORS.mutedText}
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, isArabic(language) && styles.alignRight]}>
          {copy.comingNextTitle}
        </Text>
        <Text style={[styles.sectionHint, isArabic(language) && styles.alignRight]}>
          {copy.comingNextBody}
        </Text>
      </View>

      <View style={styles.backupSection}>
        <Text style={[styles.backupTitle, isArabic(language) && styles.alignRight]}>{copy.backupTitle}</Text>
        <Text style={[styles.backupHint, isArabic(language) && styles.alignRight]}>{copy.backupHint}</Text>
        <View style={styles.backupStatus}>
          <Text style={styles.backupStatusLabel}>{copy.autoBackup}:</Text>
          <Text style={styles.backupStatusText}>{copy.enabled}</Text>
        </View>
        <Pressable onPress={handleExport} style={styles.backupButton}>
          <Text style={styles.backupButtonText}>{copy.exportBackup}</Text>
        </Pressable>
        <Pressable onPress={handleImport} style={styles.backupButton}>
          <Text style={styles.backupButtonText}>{copy.importBackup}</Text>
        </Pressable>
      </View>
    </>
  );
}

function ProgressOverview({
  copy,
  totals,
  progress,
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
        <View style={styles.progressStatsRow}>
          <ProgressStat label={copy.daysLeft} value={formatEstimatedDaysLeft(progress.estimatedDaysLeft, copy.needHistory, copy.dayUnit)} />
          <ProgressStat label={copy.finish} value={formatFinishDate(progress.finishDate, copy.needHistory)} />
        </View>
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
  const ordered = [...days].reverse();
  const weeks: DailyActivitySummary[][] = [];
  for (let index = 0; index < ordered.length; index += 7) {
    weeks.push(ordered.slice(index, index + 7));
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
  onboardingButtonText: {
    color: COLORS.nightBlue,
    fontSize: 17,
    fontWeight: '800',
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
    backgroundColor: 'rgba(247, 243, 234, 0.08)',
    borderRadius: 22,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.lightGold + '1f',
  },
  hadithBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.inputBg,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.gold + '20',
  },
  hadithLabel: {
    color: COLORS.lightGold,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  hadithText: {
    color: COLORS.cream,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 26,
  },
  hadithSource: {
    color: '#C8D6CD',
    fontSize: 12,
    lineHeight: 18,
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
  settingsLabel: {
    color: COLORS.cream,
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
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
  },
  backupButtonText: {
    color: COLORS.cream,
    fontSize: 13,
    fontWeight: '600',
  },
});
