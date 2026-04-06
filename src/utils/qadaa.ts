export type PrayerKey = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
export type PrayerCounts = Record<PrayerKey, number>;

export const PRAYER_KEYS: PrayerKey[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

export const emptyCounts = (): PrayerCounts => ({
  fajr: 0,
  dhuhr: 0,
  asr: 0,
  maghrib: 0,
  isha: 0,
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
