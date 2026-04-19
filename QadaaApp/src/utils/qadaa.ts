export type PrayerKey = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
export type PrayerCounts = Record<PrayerKey, number>;
export type AppLanguage = 'en' | 'ar';

export type PrayerLogEntry = {
  id: string;
  prayer: PrayerKey;
  createdAt: string;
  source: 'quick_add' | 'manual_adjust' | 'full_day';
  batchId?: string | null;
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

export type FastingLogEntry = {
  id: string;
  createdAt: string;
};

export type FastingDailySummary = {
  dayKey: string;
  totalCount: number;
};

export type FastingHistorySection = {
  monthKey: string;
  days: FastingDailySummary[];
};

export type AppState = {
  target: PrayerCounts;
  completed: PrayerCounts;
  todayCompleted: PrayerCounts;
  log: PrayerLogEntry[];
  profileName: string;
  profileAge: string;
  profileEmail: string;
  includeWitr: boolean;
  notes: string;
  language: AppLanguage;
  notificationEnabled: boolean;
  notificationHour: number;
  notificationMinute: number;
  notificationScheduleId: string | null;
  defaultDailyAddDays: number;
  fastingEnabled: boolean;
  fastingTargetDays: number;
  fastingCompletedDays: number;
  fastingLog: FastingLogEntry[];
  fastingKafarahDays: number;
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
  profileName: '',
  profileAge: '',
  profileEmail: '',
  includeWitr: false,
  notes: 'Shafi‘i profile — simple counting first, detailed fiqh options later.',
  language: 'en',
  notificationEnabled: false,
  notificationHour: 21,
  notificationMinute: 0,
  notificationScheduleId: null,
  defaultDailyAddDays: 1,
  fastingEnabled: false,
  fastingTargetDays: 0,
  fastingCompletedDays: 0,
  fastingLog: [],
  fastingKafarahDays: 0,
});

export const hydrateState = (raw?: Partial<AppState>): AppState => ({
  ...defaultAppState(),
  ...raw,
  target: { ...emptyCounts(), ...(raw?.target ?? {}) },
  completed: { ...emptyCounts(), ...(raw?.completed ?? {}) },
  todayCompleted: { ...emptyCounts(), ...(raw?.todayCompleted ?? {}) },
  log: raw?.log ?? [],
  fastingLog: raw?.fastingLog ?? [],
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

export const remainingFastingDays = (targetDays: number, completedDays: number) =>
  Math.max(Math.round(targetDays) - Math.round(completedDays), 0);

export const calculateKafarahPoorPeople = (kafarahDays: number) =>
  Math.max(0, Math.round(kafarahDays)) * 60;

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
  source: PrayerLogEntry['source'] = 'quick_add',
  batchId?: string,
  createdAt?: string
): PrayerLogEntry => ({
  id: `${prayer}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  prayer,
  createdAt: createdAt ?? new Date().toISOString(),
  source,
  batchId,
});

export const applyPrayerCompletion = (state: AppState, prayer: PrayerKey): AppState => ({
  ...state,
  completed: incrementCount(state.completed, prayer),
  todayCompleted: incrementCount(state.todayCompleted, prayer),
  log: [createLogEntry(prayer), ...state.log],
});

export const applyPrayerCompletionForDay = (
  state: AppState,
  prayer: PrayerKey,
  dayKey: string,
  now = new Date()
): AppState => {
  const todayKey = formatDayKey(now);
  const createdAt =
    dayKey === todayKey ? now.toISOString() : new Date(`${dayKey}T12:00:00`).toISOString();

  return {
    ...state,
    completed: incrementCount(state.completed, prayer),
    todayCompleted:
      dayKey === todayKey ? incrementCount(state.todayCompleted, prayer) : state.todayCompleted,
    log: [createLogEntry(prayer, 'manual_adjust', undefined, createdAt), ...state.log],
  };
};

export const applyFullDayCompletion = (state: AppState, days = 1): AppState => {
  const nextCompleted = { ...state.completed };
  const nextTodayCompleted = { ...state.todayCompleted };
  const safeDays = Math.max(1, Math.round(days));
  const batchId = `full-day-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const nextLogEntries = Array.from({ length: safeDays }).flatMap(() =>
    PRAYER_KEYS.map((prayer) => createLogEntry(prayer, 'full_day', batchId))
  );

  for (let day = 0; day < safeDays; day += 1) {
    for (const prayer of PRAYER_KEYS) {
      nextCompleted[prayer] += 1;
      nextTodayCompleted[prayer] += 1;
    }
  }

  return {
    ...state,
    completed: nextCompleted,
    todayCompleted: nextTodayCompleted,
    log: [...nextLogEntries, ...state.log],
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

export const rollbackPrayerCompletionForDay = (
  state: AppState,
  prayer: PrayerKey,
  dayKey: string,
  now = new Date()
): AppState => {
  const logIndex = state.log.findIndex(
    (entry) => entry.prayer === prayer && formatDayKey(new Date(entry.createdAt)) === dayKey
  );

  if (logIndex === -1) {
    return state;
  }

  const todayKey = formatDayKey(now);
  const nextLog = state.log.filter((_, index) => index !== logIndex);

  return {
    ...state,
    completed: decrementCount(state.completed, prayer),
    todayCompleted:
      dayKey === todayKey ? decrementCount(state.todayCompleted, prayer) : state.todayCompleted,
    log: nextLog,
  };
};

export const rollbackFullDayCompletion = (state: AppState): AppState => {
  const latestFullDayEntry = state.log.find((entry) => entry.source === 'full_day');

  if (latestFullDayEntry?.batchId) {
    const batchEntries = state.log.filter((entry) => entry.batchId === latestFullDayEntry.batchId);

    if (batchEntries.length > 0) {
      const nextCompleted = { ...state.completed };
      const nextTodayCompleted = { ...state.todayCompleted };

      for (const entry of batchEntries) {
        nextCompleted[entry.prayer] = Math.max(nextCompleted[entry.prayer] - 1, 0);
        nextTodayCompleted[entry.prayer] = Math.max(nextTodayCompleted[entry.prayer] - 1, 0);
      }

      return {
        ...state,
        completed: nextCompleted,
        todayCompleted: nextTodayCompleted,
        log: state.log.filter((entry) => entry.batchId !== latestFullDayEntry.batchId),
      };
    }
  }

  let nextState = state;

  for (const prayer of PRAYER_KEYS) {
    nextState = rollbackPrayerCompletion(nextState, prayer);
  }

  return nextState;
};

export const latestLogEntries = (log: PrayerLogEntry[], limit = 5) => log.slice(0, limit);

export const applyFastingCompletion = (state: AppState): AppState => ({
  ...state,
  fastingCompletedDays: state.fastingCompletedDays + 1,
  fastingLog: [
    {
      id: `fast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    },
    ...state.fastingLog,
  ],
});

export const rollbackFastingCompletion = (state: AppState): AppState => ({
  ...state,
  fastingCompletedDays: Math.max(state.fastingCompletedDays - 1, 0),
  fastingLog: state.fastingLog.slice(1),
});

export const clearTodayPrayerProgress = (state: AppState, now = new Date()): AppState => {
  const todayKey = formatDayKey(now);
  const todayEntries = state.log.filter((entry) => formatDayKey(new Date(entry.createdAt)) === todayKey);

  if (todayEntries.length === 0) {
    return {
      ...state,
      todayCompleted: emptyCounts(),
    };
  }

  const nextCompleted = { ...state.completed };

  for (const entry of todayEntries) {
    nextCompleted[entry.prayer] = Math.max(nextCompleted[entry.prayer] - 1, 0);
  }

  return {
    ...state,
    completed: nextCompleted,
    todayCompleted: emptyCounts(),
    log: state.log.filter((entry) => formatDayKey(new Date(entry.createdAt)) !== todayKey),
  };
};

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
  plannedDaysPerDay = 1,
  now = new Date()
) => {
  if (remainingPrayers <= 0) return now;
  const safePlannedDaysPerDay = Math.max(1, plannedDaysPerDay);
  const daysLeft = Math.ceil(remainingPrayers / (PRAYERS_PER_QADAA_DAY * safePlannedDaysPerDay));
  const finishDate = new Date(now);
  finishDate.setDate(finishDate.getDate() + daysLeft);
  return finishDate;
};

export const estimateCompletionDays = (
  remainingPrayers: number,
  _log: PrayerLogEntry[],
  plannedDaysPerDay = 1,
  _now = new Date()
) => {
  if (remainingPrayers <= 0) return 0;
  const safePlannedDaysPerDay = Math.max(1, plannedDaysPerDay);
  return remainingPrayers / (PRAYERS_PER_QADAA_DAY * safePlannedDaysPerDay);
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

export const getRecentFastingActivity = (
  log: FastingLogEntry[],
  days = 30,
  now = new Date()
): FastingDailySummary[] => {
  const activityMap = new Map<string, number>();

  for (const entry of log) {
    const dayKey = formatDayKey(new Date(entry.createdAt));
    activityMap.set(dayKey, (activityMap.get(dayKey) ?? 0) + 1);
  }

  const currentDay = startOfDay(now);
  const summaries: FastingDailySummary[] = [];

  for (let index = 0; index < days; index += 1) {
    const day = new Date(currentDay);
    day.setDate(currentDay.getDate() - index);
    const dayKey = formatDayKey(day);

    summaries.push({
      dayKey,
      totalCount: activityMap.get(dayKey) ?? 0,
    });
  }

  return summaries;
};

export const groupFastingActivityByMonth = (
  history: FastingDailySummary[]
): FastingHistorySection[] => {
  const monthMap = new Map<string, FastingDailySummary[]>();

  for (const day of history) {
    if (day.totalCount <= 0) continue;
    const monthKey = day.dayKey.slice(0, 7);
    const existing = monthMap.get(monthKey) ?? [];
    existing.push(day);
    monthMap.set(monthKey, existing);
  }

  return Array.from(monthMap.entries()).map(([monthKey, days]) => ({
    monthKey,
    days,
  }));
};
