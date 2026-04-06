export type PrayerKey = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
export type PrayerCounts = Record<PrayerKey, number>;

export type PrayerLogEntry = {
  id: string;
  prayer: PrayerKey;
  createdAt: string;
  source: 'quick_add' | 'manual_adjust';
};

export type AppState = {
  target: PrayerCounts;
  completed: PrayerCounts;
  todayCompleted: PrayerCounts;
  log: PrayerLogEntry[];
  includeWitr: boolean;
  notes: string;
};

export const PRAYER_KEYS: PrayerKey[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

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

export const defaultAppState = (): AppState => ({
  target: emptyCounts(),
  completed: emptyCounts(),
  todayCompleted: emptyCounts(),
  log: [],
  includeWitr: false,
  notes: 'Shafi‘i profile — simple counting first, detailed fiqh options later.',
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
  log: [createLogEntry(prayer), ...state.log].slice(0, 50),
});

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

export const latestLogEntries = (log: PrayerLogEntry[], limit = 5) => log.slice(0, limit);
