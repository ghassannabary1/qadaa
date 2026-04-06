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
  decrementCount,
  emptyCounts,
  incrementCount,
  PrayerCounts,
  PrayerKey,
  remainingCounts,
  totalCounts,
} from './src/utils/qadaa';

type AppState = {
  target: PrayerCounts;
  completed: PrayerCounts;
  todayCompleted: PrayerCounts;
  includeWitr: boolean;
  notes: string;
};

const STORAGE_KEY = 'qadaa-simple-v1';

const PRAYERS: { key: PrayerKey; label: string; arabic: string }[] = [
  { key: 'fajr', label: 'Fajr', arabic: 'الفجر' },
  { key: 'dhuhr', label: 'Dhuhr', arabic: 'الظهر' },
  { key: 'asr', label: 'Asr', arabic: 'العصر' },
  { key: 'maghrib', label: 'Maghrib', arabic: 'المغرب' },
  { key: 'isha', label: 'Isha', arabic: 'العشاء' },
];

const defaultState: AppState = {
  target: emptyCounts(),
  completed: emptyCounts(),
  todayCompleted: emptyCounts(),
  includeWitr: false,
  notes: 'Shafi‘i profile — simple counting first, detailed fiqh options later.',
};

export default function App() {
  const [state, setState] = useState<AppState>(defaultState);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loadState = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<AppState>;
          setState({
            ...defaultState,
            ...parsed,
            target: { ...emptyCounts(), ...(parsed.target ?? {}) },
            completed: { ...emptyCounts(), ...(parsed.completed ?? {}) },
            todayCompleted: { ...emptyCounts(), ...(parsed.todayCompleted ?? {}) },
          });
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

  const incrementCompleted = (prayer: PrayerKey) => {
    setState((current) => ({
      ...current,
      completed: incrementCount(current.completed, prayer),
      todayCompleted: incrementCount(current.todayCompleted, prayer),
    }));
  };

  const decrementCompleted = (prayer: PrayerKey) => {
    setState((current) => ({
      ...current,
      completed: decrementCount(current.completed, prayer),
      todayCompleted: decrementCount(current.todayCompleted, prayer),
    }));
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
      todayCompleted: emptyCounts(),
    }));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <Text style={styles.eyebrow}>Qadaa</Text>
          <Text style={styles.title}>Make up missed prayers simply.</Text>
          <Text style={styles.subtitle}>
            Built for quick daily use with a Shafi‘i-friendly setup.
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

          {PRAYERS.map((prayer) => {
            const remaining = Math.max(state.target[prayer.key] - state.completed[prayer.key], 0);
            return (
              <View key={prayer.key} style={styles.prayerCard}>
                <View style={styles.prayerInfo}>
                  <Text style={styles.prayerLabel}>{prayer.label}</Text>
                  <Text style={styles.prayerArabic}>{prayer.arabic}</Text>
                  <Text style={styles.prayerMeta}>
                    Done {state.completed[prayer.key]} / {state.target[prayer.key]} · Remaining {remaining}
                  </Text>
                </View>

                <View style={styles.actionsColumn}>
                  <Pressable style={styles.addButton} onPress={() => incrementCompleted(prayer.key)}>
                    <Text style={styles.addButtonText}>+1</Text>
                  </Pressable>
                  <Pressable style={styles.minusButton} onPress={() => decrementCompleted(prayer.key)}>
                    <Text style={styles.minusButtonText}>Undo</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Backlog setup</Text>
          <Text style={styles.sectionHint}>
            Enter your estimated qadaa count for each prayer. You can refine this later.
          </Text>

          {PRAYERS.map((prayer) => (
            <View key={prayer.key} style={styles.inputRow}>
              <View>
                <Text style={styles.inputLabel}>{prayer.label}</Text>
                <Text style={styles.inputArabic}>{prayer.arabic}</Text>
              </View>
              <TextInput
                keyboardType="number-pad"
                value={String(state.target[prayer.key])}
                onChangeText={(value) => updateTarget(prayer.key, value)}
                style={styles.input}
                placeholder="0"
                placeholderTextColor="#94A3B8"
              />
            </View>
          ))}
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
            Later we can add: Witr support, smarter estimation, streaks, and calendar-based catch-up plans.
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
