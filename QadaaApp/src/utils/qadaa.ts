export type PrayerKey = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
export type PrayerCounts = Record<PrayerKey, number>;
export type AppLanguage = 'en' | 'ar';

export type PrayerLogEntry = {
  id: string;
  prayer: PrayerKey;
  createdAt: string;
  source: 'quick_add' | 'manual_adjust' | 'full_day';
};

export type HistoryDayGroup = {
  dayKey: string;
  dayLabel: string;
  entries: PrayerLogEntry[];
};

export type DailyActivitySummary = {
  dayKey: string;
  totalCount: number;
  prayerCounts: PrayerCounts;
};

export type AppState = {
  target: PrayerCounts;
  completed: PrayerCounts;
  todayCompleted: PrayerCounts;
  log: PrayerLogEntry[];
  includeWitr: boolean;
  notes: string;
  language: AppLanguage;
  accountabilityPartnerName: string;
};

export const PRAYER_KEYS: PrayerKey[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
export const PRAYERS_PER_QADAA_DAY = PRAYER_KEYS.length;

export const PRAYER_LABELS: Record<PrayerKey, { label: string; arabic: string }> = {
  fajr: { label: 'Fajr', arabic: 'الفجر' },
  dhuhr: { label: 'Dhuhr', arabic: 'الظهر' },
  asr: { label: 'Asr', arabic: 'العصر' },
  maghrib: { label: 'Maghrib', arabic: 'المغرب' },
  isha: { label: 'Isha', arabic: 'العشاء' },
};

export const emptyCounts = (): PrayerCounts => ({
  fajr: 0,
  dhuhr: 0,
  asr: 0,
  maghrib: 0,
  isha: 0,
});

export const countsFromMissedDays = (days: number): PrayerCounts => {
  const safeDays = Math.max(0, Math.round(days));

  return {
    fajr: safeDays,
    dhuhr: safeDays,
    asr: safeDays,
    maghrib: safeDays,
    isha: safeDays,
  };
};

export const defaultAppState = (): AppState => ({
  target: emptyCounts(),
  completed: emptyCounts(),
  todayCompleted: emptyCounts(),
  log: [],
  includeWitr: false,
  notes: 'Shafi‘i profile — simple counting first, detailed fiqh options later.',
  language: 'en',
  accountabilityPartnerName: '',
});

export const hydrateState = (raw?: Partial<AppState>): AppState => ({
  ...defaultAppState(),
  ...raw,
  target: { ...emptyCounts(), ...(raw?.target ?? {}) },
  completed: { ...emptyCounts(), ...(raw?.completed ?? {}) },
  todayCompleted: { ...emptyCounts(), ...(raw?.todayCompleted ?? {}) },
  log: raw?.log ?? [],
});

export const totalCounts = (counts: PrayerCounts) =>
  PRAYER_KEYS.reduce((sum, key) => sum + counts[key], 0);

export const estimateMissedDaysFromShafiiSetup = ({
  latestPubertyAge,
  regularPrayerAge,
  menstruationDaysPerYear = 0,
}: {
  latestPubertyAge: number;
  regularPrayerAge: number;
  menstruationDaysPerYear?: number;
}) => {
  const startAge = Math.max(0, latestPubertyAge);
  const endAge = Math.max(startAge, regularPrayerAge);
  const yearsMissed = endAge - startAge;
  const lunarDaysPerYear = 354.367;
  const estimatedMissedDays = yearsMissed * lunarDaysPerYear;
  const excludedDays = Math.max(0, menstruationDaysPerYear) * yearsMissed;

  return Math.max(0, Math.round(estimatedMissedDays - excludedDays));
};

export const remainingCounts = (target: PrayerCounts, completed: PrayerCounts) =>
  Math.max(totalCounts(target) - totalCounts(completed), 0);

export const incrementCount = (counts: PrayerCounts, key: PrayerKey): PrayerCounts => ({
  ...counts,
  [key]: counts[key] + 1,
});

export const decrementCount = (counts: PrayerCounts, key: PrayerKey): PrayerCounts => ({
  ...counts,
  [key]: Math.max(counts[key] - 1, 0),
});

export const createLogEntry = (
  prayer: PrayerKey,
  source: PrayerLogEntry['source'] = 'quick_add'
): PrayerLogEntry => ({
  id: `${prayer}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  prayer,
  createdAt: new Date().toISOString(),
  source,
});

export const applyPrayerCompletion = (state: AppState, prayer: PrayerKey): AppState => ({
  ...state,
  completed: incrementCount(state.completed, prayer),
  todayCompleted: incrementCount(state.todayCompleted, prayer),
  log: [createLogEntry(prayer), ...state.log].slice(0, 100),
});

export const applyFullDayCompletion = (state: AppState): AppState => {
  const nextCompleted = { ...state.completed };
  const nextTodayCompleted = { ...state.todayCompleted };
  const nextLogEntries = PRAYER_KEYS.map((prayer) => createLogEntry(prayer, 'full_day'));

  for (const prayer of PRAYER_KEYS) {
    nextCompleted[prayer] += 1;
    nextTodayCompleted[prayer] += 1;
  }

  return {
    ...state,
    completed: nextCompleted,
    todayCompleted: nextTodayCompleted,
    log: [...nextLogEntries, ...state.log].slice(0, 100),
  };
};

export const rollbackPrayerCompletion = (state: AppState, prayer: PrayerKey): AppState => {
  const logIndex = state.log.findIndex((entry) => entry.prayer === prayer);
  const nextLog =
    logIndex === -1 ? state.log : state.log.filter((_, index) => index !== logIndex);

  return {
    ...state,
    completed: decrementCount(state.completed, prayer),
    todayCompleted: decrementCount(state.todayCompleted, prayer),
    log: nextLog,
  };
};

export const rollbackFullDayCompletion = (state: AppState): AppState => {
  let nextState = state;

  for (const prayer of PRAYER_KEYS) {
    nextState = rollbackPrayerCompletion(nextState, prayer);
  }

  return nextState;
};

export const latestLogEntries = (log: PrayerLogEntry[], limit = 5) => log.slice(0, limit);

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const formatDayKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const estimatePrayerPacePerDay = (log: PrayerLogEntry[], now = new Date()) => {
  if (log.length === 0) return 0;

  const earliestEntry = log.reduce((earliest, entry) => {
    const entryTime = new Date(entry.createdAt).getTime();
    return Math.min(earliest, entryTime);
  }, Number.POSITIVE_INFINITY);

  const firstDay = startOfDay(new Date(earliestEntry));
  const currentDay = startOfDay(now);
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const elapsedDays = Math.max(
    1,
    Math.floor((currentDay.getTime() - firstDay.getTime()) / millisecondsPerDay) + 1
  );

  return log.length / elapsedDays;
};

export const estimateCompletionDate = (
  remainingPrayers: number,
  _log: PrayerLogEntry[],
  now = new Date()
) => {
  if (remainingPrayers <= 0) return now;
  const daysLeft = Math.ceil(remainingPrayers / PRAYERS_PER_QADAA_DAY);
  const finishDate = new Date(now);
  finishDate.setDate(finishDate.getDate() + daysLeft);
  return finishDate;
};

export const estimateCompletionDays = (
  remainingPrayers: number,
  _log: PrayerLogEntry[],
  _now = new Date()
) => {
  if (remainingPrayers <= 0) return 0;
  return remainingPrayers / PRAYERS_PER_QADAA_DAY;
};

export const groupLogEntriesByDay = (log: PrayerLogEntry[]): HistoryDayGroup[] => {
  const map = new Map<string, PrayerLogEntry[]>();

  for (const entry of log) {
    const date = new Date(entry.createdAt);
    const dayKey = date.toISOString().slice(0, 10);
    const existing = map.get(dayKey) ?? [];
    existing.push(entry);
    map.set(dayKey, existing);
  }

  return Array.from(map.entries()).map(([dayKey, entries]) => ({
    dayKey,
    dayLabel: new Date(entries[0].createdAt).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }),
    entries,
  }));
};

export const getRecentDailyActivity = (
  log: PrayerLogEntry[],
  days = 30,
  now = new Date()
): DailyActivitySummary[] => {
  const activityMap = new Map<string, PrayerCounts>();

  for (const entry of log) {
    const dayKey = formatDayKey(new Date(entry.createdAt));
    const existing = activityMap.get(dayKey) ?? emptyCounts();
    activityMap.set(dayKey, incrementCount(existing, entry.prayer));
  }

  const currentDay = startOfDay(now);
  const summaries: DailyActivitySummary[] = [];

  for (let index = 0; index < days; index += 1) {
    const day = new Date(currentDay);
    day.setDate(currentDay.getDate() - index);
    const dayKey = formatDayKey(day);
    const prayerCounts = activityMap.get(dayKey) ?? emptyCounts();

    summaries.push({
      dayKey,
      totalCount: totalCounts(prayerCounts),
      prayerCounts,
    });
  }

  return summaries;
};
