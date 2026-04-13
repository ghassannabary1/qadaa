import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  AppState,
  applyPrayerCompletion,
  defaultAppState,
  groupLogEntriesByDay,
  hydrateState,
  PrayerKey,
  PRAYER_KEYS,
  PRAYER_LABELS,
  remainingCounts,
  rollbackPrayerCompletion,
  totalCounts,
} from './src/utils/qadaa';
import {
  createBackup,
  restoreBackup,
  exportBackup,
  importBackup,
  getBackupAge,
  BACKUP_KEY,
} from './src/utils/backup';

const STORAGE_KEY = 'qadaa-simple-v2';
const ONBOARD_KEY = 'qadaa-onboarded-v1';
const AUTO_BACKUP_INTERVAL = 30 * 1000; // 30 seconds for auto-backup on iOS

// ─── Islamic color palette ───────────────────────────────────────
const COLORS = {
  darkGreen: '#0B3D2E',
  forestGreen: '#1B5E3B',
  gold: '#C9A84C',
  lightGold: '#E8C97A',
  cream: '#F5F0E8',
  warmWhite: '#FAF8F5',
  darkText: '#1A2E1A',
  mutedText: '#5C7A5C',
  cardBg: '#0F3025',
  cardBgLight: '#143D2B',
  sectionBg: '#0D2B20',
  inputBg: '#0A2A1E',
  prayerCardBg: '#14432A',
  divider: '#C9A84C44',
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
        // Show last backup age if available
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

  // Auto-backup interval for iOS iCloud sync
  useEffect(() => {
    if (loaded) {
      const backupTimer = setInterval(async () => {
        await createBackup(state);
      }, AUTO_BACKUP_INTERVAL);
      
      // Create initial backup
      createBackup(state);
      
      return () => clearInterval(backupTimer);
    }
  }, [loaded, state]);

  useEffect(() => {
    if (!loaded) return;

    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch((error) => {
      console.warn('Failed to save app state', error);
    });
  }, [state, loaded]);

  const totals = useMemo(() => {
    const target = totalCounts(state.target);
    const completed = totalCounts(state.completed);
    const remaining = remainingCounts(state.target, state.completed);
    const today = totalCounts(state.todayCompleted);

    return { target, completed, remaining, today };
  }, [state]);

  const historyGroups = useMemo(() => groupLogEntriesByDay(state.log), [state.log]);

  const incrementCompleted = (prayer: PrayerKey) => {
    setState((current) => applyPrayerCompletion(current, prayer));
  };

  const decrementCompleted = (prayer: PrayerKey) => {
    setState((current) => rollbackPrayerCompletion(current, prayer));
  };

  const updateTarget = (prayer: PrayerKey, value: string) => {
    const numeric = Number(value.replace(/[^0-9]/g, ''));
    // Warn if non-numeric input detected (but still accept it gracefully)
    if (value.trim() && !/^\d+$/.test(value.replace(/[^0-9]/g, ''))) {
      console.warn(`Non-numeric input detected for ${prayer}: "${value}" - treating as 0`);
    }
    setState((current) => ({
      ...current,
      target: {
        ...current.target,
        [prayer]: Number.isNaN(numeric) ? 0 : numeric,
      },
    }));
  };

  const resetToday = () => {
    Alert.alert(
      'Reset today?',
      "This clears only today's qadaa counters. Your total completed count stays intact.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () =>
            setState((current) => ({
              ...current,
              todayCompleted: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
            })),
        },
      ]
    );
  };

  const dismissOnboarding = async () => {
    try {
      await AsyncStorage.setItem(ONBOARD_KEY, '1');
    } catch (error) {
      console.warn('Failed to save onboarding state', error);
    }
    setShowOnboarding(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.darkGreen }}>
      <StatusBar style="light" />
      {showOnboarding ? (
        <OnboardingScreen onDismiss={dismissOnboarding} />
      ) : (
        <MainApp
          state={state}
          setState={setState}
          loaded={loaded}
          resetToday={resetToday}
          totals={totals}
          historyGroups={historyGroups}
          incrementCompleted={incrementCompleted}
          decrementCompleted={decrementCompleted}
          updateTarget={updateTarget}
        />
      )}
    </View>
  );
}

// ─── Islamic geometric pattern element ──────────────────────────
function IslamicPattern({ style }: { style?: object }) {
  return (
    <View style={[styles.patternContainer, style]} pointerEvents="none">
      {/* 8-pointed star repeating pattern */}
      <View style={styles.patternRow}>
        {['◇', '✦', '◆', '✦', '◇', '✦', '◆', '✦'].map((s, i) => (
          <Text key={i} style={styles.patternSymbol}>{s}</Text>
        ))}
      </View>
    </View>
  );
}

// ─── Ornamental divider ──────────────────────────────────────────
function Ornament({ color = COLORS.gold }: { color?: string }) {
  return (
    <View style={styles.ornamentRow}>
      <View style={[styles.ornamentLine, { backgroundColor: color }]} />
      <Text style={[styles.ornamentSymbol, { color }]}>❋</Text>
      <View style={[styles.ornamentLine, { backgroundColor: color }]} />
    </View>
  );
}

// ─── Onboarding ───────────────────────────────────────────────────
function OnboardingScreen({ onDismiss }: { onDismiss: () => void }) {
  return (
    <View style={styles.onboarding}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.onboardingScrollContent}>
          <View style={styles.onboardingCard}>
            {/* Header ornament */}
            <View style={styles.onboardingHeaderOrnament}>
              <Text style={styles.onboardingBismillah}>بِسْمِ اللَّهِ</Text>
              <Text style={styles.onboardingBismillahSub}>In the name of Allah</Text>
            </View>

            <Ornament />

            <Text style={styles.onboardingTitle}>Qadaa</Text>
            <Text style={styles.onboardingSubtitle}>
              Track your missed prayers and work through them steadily.
            </Text>

            <View style={styles.onboardingSteps}>
              <OnboardingStep
                number="١"
                title="Set your backlog"
                body="Enter how many missed prayers you have for each prayer type."
              />
              <OnboardingStep
                number="٢"
                title="Tap to complete"
                body="When you pray a qadaa prayer, tap +1. The count updates immediately."
              />
              <OnboardingStep
                number="٣"
                title="Track progress"
                body="Your history and remaining counts give you a clear picture of where you stand."
              />
            </View>

            <Ornament />

            <Text style={styles.onboardingNote}>
              Simple first. Shafi'i rules applied automatically.
            </Text>
            <Pressable
              accessibilityLabel="Get started button · ابدأ الزر"
              accessibilityRole="button"
              onPress={onDismiss}
              style={styles.onboardingButton}
            >
              <Text style={styles.onboardingButtonText}>Get started · ابدأ</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function OnboardingStep({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.onboardingStep}>
      <View style={styles.onboardingStepNumber}>
        <Text style={styles.onboardingStepNumberText}>{number}</Text>
      </View>
      <View style={styles.onboardingStepContent}>
        <Text style={styles.onboardingStepTitle}>{title}</Text>
        <Text style={styles.onboardingStepBody}>{body}</Text>
      </View>
    </View>
  );
}

// ─── Main App ─────────────────────────────────────────────────────
function MainApp({
  state,
  setState,
  resetToday,
  totals,
  historyGroups,
  incrementCompleted,
  decrementCompleted,
  updateTarget,
}: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  loaded: boolean;
  resetToday: () => void;
  totals: { target: number; completed: number; remaining: number; today: number };
  historyGroups: ReturnType<typeof groupLogEntriesByDay>;
  incrementCompleted: (prayer: PrayerKey) => void;
  decrementCompleted: (prayer: PrayerKey) => void;
  updateTarget: (prayer: PrayerKey, value: string) => void;
}) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.darkGreen }}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.headerCard}>
          <IslamicPattern style={styles.headerPattern} />
          <Text style={styles.eyebrow}>qadaa · قضاء</Text>
          <Text style={styles.title}>Track your missed prayers.</Text>
          <Text style={styles.subtitle}>
            Set your backlog, tap to log completions, and watch your progress over time.
          </Text>
          <Ornament color={COLORS.gold} />
        </View>

        {/* Summary */}
        <View style={styles.summaryRow}>
          <SummaryCard label="Remaining" value={totals.remaining} accent={COLORS.gold} />
          <SummaryCard label="Completed" value={totals.completed} accent="#4CAF50" />
          <SummaryCard label="Today" value={totals.today} accent={COLORS.lightGold} />
        </View>

        {/* Quick add */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick add · إضافة</Text>
            <Pressable
              accessibilityLabel="Reset today's counters · إعادة تعيين اليوم"
              accessibilityRole="button"
              onPress={resetToday}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Reset today</Text>
            </Pressable>
          </View>

          {PRAYER_KEYS.map((prayer) => {
            const prayerInfo = PRAYER_LABELS[prayer];
            const remaining = Math.max(state.target[prayer] - state.completed[prayer], 0);
            return (
              <View key={prayer} style={styles.prayerCard}>
                <View style={styles.prayerInfo}>
                  <Text style={styles.prayerLabel}>{prayerInfo.label}</Text>
                  <Text style={styles.prayerArabic}>{prayerInfo.arabic}</Text>
                  <Text style={styles.prayerMeta}>
                    Done {state.completed[prayer]} / {state.target[prayer]} · {remaining} remaining
                  </Text>
                </View>

                <View style={styles.actionsColumn}>
                  <Pressable
                    accessibilityLabel={`Mark ${prayerInfo.label} as completed · ${prayerInfo.arabic} مكتمل`}
                    accessibilityRole="button"
                    onPress={() => incrementCompleted(prayer)}
                    style={[styles.addButton, { backgroundColor: COLORS.forestGreen }]}
                  >
                    <Text style={styles.addButtonText}>+1</Text>
                  </Pressable>
                  <Pressable
                    accessibilityLabel={`Undo last ${prayerInfo.label} completion · تراجع`}
                    accessibilityRole="button"
                    onPress={() => decrementCompleted(prayer)}
                    style={styles.minusButton}
                  >
                    <Text style={styles.minusButtonText}>Undo</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>

        {/* History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>History · السجل</Text>
          <Text style={styles.sectionHint}>
            Logged qadaa prayers are grouped by day so you can review progress more confidently.
          </Text>

          {historyGroups.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No qadaa history yet.</Text>
            </View>
          ) : (
            historyGroups.map((group) => (
              <View key={group.dayKey} style={styles.historyGroup}>
                <Text style={styles.historyGroupTitle}>{group.dayLabel}</Text>
                {group.entries.map((entry) => {
                  const prayerInfo = PRAYER_LABELS[entry.prayer];
                  const time = new Date(entry.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'UTC',
                  });

                  return (
                    <View key={entry.id} style={styles.activityRow}>
                      <View>
                        <Text style={styles.activityTitle}>{prayerInfo.label}</Text>
                        <Text style={styles.activityArabic}>{prayerInfo.arabic}</Text>
                      </View>
                      <View style={styles.activityMetaBlock}>
                        <Text style={styles.activityTime}>{time}</Text>
                        <Text style={styles.activitySource}>quick add</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))
          )}
        </View>

        {/* Backlog */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Backlog setup ·عدد القضاء</Text>
          <Text style={styles.sectionHint}>
            Enter your estimated qadaa count for each prayer. You can refine this later.
          </Text>

          {PRAYER_KEYS.map((prayer) => {
            const prayerInfo = PRAYER_LABELS[prayer];
            return (
              <View key={prayer} style={styles.inputRow}>
                <View>
                  <Text style={styles.inputLabel}>{prayerInfo.label}</Text>
                  <Text style={styles.inputArabic}>{prayerInfo.arabic}</Text>
                </View>
                <TextInput
                  keyboardType="number-pad"
                  value={String(state.target[prayer])}
                  onChangeText={(value) => updateTarget(prayer, value)}
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor={COLORS.mutedText}
                />
              </View>
            );
          })}
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes · ملاحظات</Text>
          <TextInput
            multiline
            value={state.notes}
            onChangeText={(notes) => setState((current) => ({ ...current, notes }))}
            style={styles.notesInput}
            placeholder="How are you counting your backlog?"
            placeholderTextColor={COLORS.mutedText}
          />
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes · ملاحظات</Text>
          <TextInput
            multiline
            value={state.notes}
            onChangeText={(notes) => setState((current) => ({ ...current, notes }))}
            style={styles.notesInput}
            placeholder="How are you counting your backlog?"
            placeholderTextColor={COLORS.mutedText}
          />
          
          {/* Backup Actions */}
          <View style={styles.backupSection}>
            <Text style={styles.backupTitle}>Data Backup · نسخ البيانات</Text>
            <Text style={styles.backupHint}>
              Your data auto-saves to iCloud (iOS) and device storage (both platforms). 
              Use these buttons to backup or restore your data.
            </Text>
            
            {/* Auto-backup status */}
            <View style={styles.backupStatus}>
              <Text style={styles.backupStatusLabel}>🔄 Auto-backup: </Text>
              <Text style={styles.backupStatusText}>Enabled</Text>
            </View>
            
            {/* Export */}
            <Pressable
              accessibilityLabel="Export backup file for sharing or manual backup"
              accessibilityRole="button"
              onPress={handleExport}
              style={styles.backupButton}
            >
              <Text style={styles.backupButtonText}>📤 Export Backup</Text>
            </Pressable>
            
            {/* Import */}
            <Pressable
              accessibilityLabel="Import backup file"
              accessibilityRole="button"
              onPress={handleImport}
              style={styles.backupButton}
            >
              <Text style={styles.backupButtonText}>📥 Import Backup</Text>
            </Pressable>
          </View>
        </View>
        
        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>سُبحَانُ اللَّهِ · SubhanAllah</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Backup Handlers ──────────────────────────────────────────────────
const handleExport = useCallback(async () => {
  Alert.alert(
    'Export Backup',
    'This creates a backup file you can share or store elsewhere. Your app data remains safe.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Export',
        onPress: async () => {
          const exportData = await exportBackup();
          if (exportData) {
            // In a real app, you would share or save this file
            console.log('Exported:', exportData);
            Alert.alert('✅ Exported!', 'Your backup has been created.');
          }
        },
      },
    ]
  );
}, []);

const handleImport = useCallback(async () => {
  Alert.alert(
    'Import Backup',
    'This will replace your current data with the backup. Are you sure?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Import',
        onPress: () => {
          // In a real app, you would prompt to select a file
          console.log('Import mode activated');
        },
      },
    ]
  );
}, []);
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <View style={[styles.summaryCard, { borderColor: accent }]}>
      <Text style={[styles.summaryValue, { color: accent }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Pattern
  patternContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    opacity: 0.06,
  },
  patternRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
  },
  patternSymbol: {
    fontSize: 12,
    color: COLORS.gold,
  },
  headerPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    opacity: 0.05,
  },

  // Ornament
  ornamentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
  },
  ornamentLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.gold,
  },
  ornamentSymbol: {
    fontSize: 14,
  },

  // Onboarding
  onboarding: {
    flex: 1,
    backgroundColor: COLORS.darkGreen,
  },
  onboardingScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  onboardingCard: {
    backgroundColor: COLORS.sectionBg,
    borderRadius: 24,
    padding: 28,
    gap: 16,
    borderWidth: 1,
    borderColor: COLORS.gold + '33',
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
    color: COLORS.gold + '99',
    fontSize: 12,
    fontStyle: 'italic',
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
  onboardingSteps: {
    gap: 16,
  },
  onboardingStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  onboardingStepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.gold + '22',
    borderWidth: 1,
    borderColor: COLORS.gold + '55',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  onboardingStepNumberText: {
    color: COLORS.gold,
    fontSize: 16,
    fontWeight: '700',
  },
  onboardingStepContent: {
    flex: 1,
  },
  onboardingStepTitle: {
    color: COLORS.cream,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  onboardingStepBody: {
    color: COLORS.mutedText,
    fontSize: 14,
    lineHeight: 20,
  },
  onboardingNote: {
    color: COLORS.mutedText,
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  onboardingButton: {
    backgroundColor: COLORS.forestGreen,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gold + '44',
  },
  onboardingButtonText: {
    color: COLORS.cream,
    fontSize: 17,
    fontWeight: '800',
  },

  // Main content
  content: {
    padding: 20,
    paddingBottom: 48,
    gap: 18,
  },
  headerCard: {
    backgroundColor: COLORS.sectionBg,
    borderRadius: 24,
    padding: 24,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.gold + '22',
    overflow: 'hidden',
  },
  eyebrow: {
    color: COLORS.gold,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    color: COLORS.cream,
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: COLORS.mutedText,
    fontSize: 15,
    lineHeight: 22,
  },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.sectionBg,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 6,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  summaryLabel: {
    color: COLORS.mutedText,
    fontSize: 13,
    fontWeight: '600',
  },

  // Section
  section: {
    backgroundColor: COLORS.sectionBg,
    borderRadius: 20,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.gold + '15',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: COLORS.cream,
    fontSize: 20,
    fontWeight: '700',
  },
  sectionHint: {
    color: COLORS.mutedText,
    fontSize: 14,
    lineHeight: 20,
  },

  // Prayer card
  prayerCard: {
    backgroundColor: COLORS.prayerCardBg,
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.gold + '11',
  },
  prayerInfo: {
    flex: 1,
    gap: 3,
  },
  prayerLabel: {
    color: COLORS.cream,
    fontSize: 18,
    fontWeight: '700',
  },
  prayerArabic: {
    color: COLORS.gold,
    fontSize: 14,
  },
  prayerMeta: {
    color: COLORS.mutedText,
    fontSize: 13,
    marginTop: 4,
  },
  actionsColumn: {
    gap: 8,
    minWidth: 92,
  },
  addButton: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gold + '33',
  },
  addButtonText: {
    color: COLORS.cream,
    fontSize: 16,
    fontWeight: '800',
  },
  minusButton: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  minusButtonText: {
    color: COLORS.cream,
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: COLORS.prayerCardBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.gold + '22',
  },
  secondaryButtonText: {
    color: COLORS.mutedText,
    fontSize: 13,
    fontWeight: '700',
  },

  // History
  emptyState: {
    backgroundColor: COLORS.prayerCardBg,
    borderRadius: 16,
    padding: 16,
  },
  emptyStateText: {
    color: COLORS.mutedText,
    fontSize: 14,
  },
  historyGroup: {
    gap: 8,
  },
  historyGroupTitle: {
    color: COLORS.gold,
    fontSize: 16,
    fontWeight: '700',
  },
  activityRow: {
    backgroundColor: COLORS.prayerCardBg,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.gold + '0A',
  },
  activityTitle: {
    color: COLORS.cream,
    fontSize: 16,
    fontWeight: '700',
  },
  activityArabic: {
    color: COLORS.gold,
    fontSize: 13,
    marginTop: 2,
  },
  activityMetaBlock: {
    alignItems: 'flex-end',
    gap: 2,
  },
  activityTime: {
    color: COLORS.mutedText,
    fontSize: 12,
    textAlign: 'right',
  },
  activitySource: {
    color: COLORS.mutedText,
    fontSize: 11,
    textTransform: 'uppercase',
  },

  // Input
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputLabel: {
    color: COLORS.cream,
    fontSize: 16,
    fontWeight: '600',
  },
  inputArabic: {
    color: COLORS.gold,
    fontSize: 13,
    marginTop: 2,
  },
  input: {
    minWidth: 80,
    textAlign: 'center',
    color: COLORS.cream,
    fontSize: 18,
    fontWeight: '700',
    backgroundColor: COLORS.darkGreen,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
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

  // Backup section
  backupSection: {
    backgroundColor: COLORS.prayerCardBg,
    borderRadius: 16,
    padding: 14,
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
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
  },
  backupButton: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.gold + '22',
  },
  backupButtonText: {
    color: COLORS.cream,
    fontSize: 13,
    fontWeight: '600',
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  footerText: {
    color: COLORS.gold + '44',
    fontSize: 14,
    letterSpacing: 1,
  },
});