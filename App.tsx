import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
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

const STORAGE_KEY = 'qadaa-simple-v2';

export default function App() {
  const [state, setState] = useState<AppState>(defaultAppState());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loadState = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          setState(hydrateState(JSON.parse(raw) as Partial<AppState>));
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
    setState((current) => ({
      ...current,
      target: {
        ...current.target,
        [prayer]: Number.isNaN(numeric) ? 0 : numeric,
      },
    }));
  };

  const resetToday = () => {
    setState((current) => ({
      ...current,
      todayCompleted: {
        fajr: 0,
        dhuhr: 0,
        asr: 0,
        maghrib: 0,
        isha: 0,
      },
    }));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <Text style={styles.eyebrow}>Qadaa</Text>
          <Text style={styles.title}>History is now part of the product.</Text>
          <Text style={styles.subtitle}>
            You can now see qadaa activity grouped by day, not just raw recent items.
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <SummaryCard label="Remaining" value={totals.remaining} accent="#F59E0B" />
          <SummaryCard label="Completed" value={totals.completed} accent="#10B981" />
          <SummaryCard label="Today" value={totals.today} accent="#60A5FA" />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick add</Text>
            <Pressable onPress={resetToday} style={styles.secondaryButton}>
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
                    Done {state.completed[prayer]} / {state.target[prayer]} · Remaining {remaining}
                  </Text>
                </View>

                <View style={styles.actionsColumn}>
                  <Pressable style={styles.addButton} onPress={() => incrementCompleted(prayer)}>
                    <Text style={styles.addButtonText}>+1</Text>
                  </Pressable>
                  <Pressable style={styles.minusButton} onPress={() => decrementCompleted(prayer)}>
                    <Text style={styles.minusButtonText}>Undo</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>History</Text>
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Backlog setup</Text>
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
                  placeholderTextColor="#94A3B8"
                />
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <TextInput
            multiline
            value={state.notes}
            onChangeText={(notes) => setState((current) => ({ ...current, notes }))}
            style={styles.notesInput}
            placeholder="How are you counting your backlog?"
            placeholderTextColor="#94A3B8"
          />
          <Text style={styles.footnote}>
            Next step: safer undo, better review controls, and a more polished phone-first history experience.
          </Text>
        </View>
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
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    padding: 20,
    paddingBottom: 48,
    gap: 18,
  },
  headerCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 20,
    gap: 8,
  },
  eyebrow: {
    color: '#93C5FD',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: '#CBD5E1',
    fontSize: 15,
    lineHeight: 22,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  summaryValue: {
    color: '#F8FAFC',
    fontSize: 28,
    fontWeight: '800',
  },
  summaryLabel: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 18,
    gap: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '700',
  },
  sectionHint: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
  },
  prayerCard: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  prayerInfo: {
    flex: 1,
    gap: 3,
  },
  prayerLabel: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  prayerArabic: {
    color: '#93C5FD',
    fontSize: 14,
  },
  prayerMeta: {
    color: '#CBD5E1',
    fontSize: 13,
    marginTop: 4,
  },
  actionsColumn: {
    gap: 8,
    minWidth: 92,
  },
  addButton: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#052E16',
    fontSize: 16,
    fontWeight: '800',
  },
  minusButton: {
    backgroundColor: '#334155',
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  minusButtonText: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  secondaryButtonText: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyState: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
  },
  emptyStateText: {
    color: '#CBD5E1',
    fontSize: 14,
  },
  historyGroup: {
    gap: 8,
  },
  historyGroupTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  activityRow: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  activityTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  activityArabic: {
    color: '#93C5FD',
    fontSize: 13,
    marginTop: 2,
  },
  activityMetaBlock: {
    alignItems: 'flex-end',
    gap: 2,
  },
  activityTime: {
    color: '#CBD5E1',
    fontSize: 12,
    textAlign: 'right',
  },
  activitySource: {
    color: '#94A3B8',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputLabel: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '600',
  },
  inputArabic: {
    color: '#93C5FD',
    fontSize: 13,
    marginTop: 2,
  },
  input: {
    minWidth: 80,
    textAlign: 'center',
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  notesInput: {
    minHeight: 110,
    textAlignVertical: 'top',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 14,
    color: '#F8FAFC',
    fontSize: 15,
    lineHeight: 22,
  },
  footnote: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
  },
});
