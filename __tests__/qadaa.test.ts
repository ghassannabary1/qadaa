import {
  applyPrayerCompletion,
  defaultAppState,
  emptyCounts,
  incrementCount,
  latestLogEntries,
  remainingCounts,
  rollbackPrayerCompletion,
  totalCounts,
} from '../src/utils/qadaa';

describe('qadaa helpers', () => {
  it('creates empty counts', () => {
    expect(emptyCounts()).toEqual({
      fajr: 0,
      dhuhr: 0,
      asr: 0,
      maghrib: 0,
      isha: 0,
    });
  });

  it('builds a default app state', () => {
    const state = defaultAppState();
    expect(state.log).toEqual([]);
    expect(state.notes).toContain('Shafi');
  });

  it('totals all prayers', () => {
    expect(
      totalCounts({ fajr: 1, dhuhr: 2, asr: 3, maghrib: 4, isha: 5 })
    ).toBe(15);
  });

  it('computes remaining totals', () => {
    expect(
      remainingCounts(
        { fajr: 10, dhuhr: 10, asr: 10, maghrib: 10, isha: 10 },
        { fajr: 2, dhuhr: 1, asr: 0, maghrib: 3, isha: 4 }
      )
    ).toBe(40);
  });

  it('never returns negative remaining totals', () => {
    expect(
      remainingCounts(
        { fajr: 1, dhuhr: 1, asr: 1, maghrib: 1, isha: 1 },
        { fajr: 5, dhuhr: 5, asr: 5, maghrib: 5, isha: 5 }
      )
    ).toBe(0);
  });

  it('increments a prayer count', () => {
    expect(incrementCount(emptyCounts(), 'fajr').fajr).toBe(1);
  });

  it('logs a completion and keeps recent history', () => {
    const state = applyPrayerCompletion(defaultAppState(), 'asr');
    expect(state.completed.asr).toBe(1);
    expect(state.log).toHaveLength(1);
    expect(state.log[0].prayer).toBe('asr');
    expect(latestLogEntries(state.log, 1)).toHaveLength(1);
  });

  it('rolls back a prayer completion safely', () => {
    const afterAdd = applyPrayerCompletion(defaultAppState(), 'isha');
    const rolledBack = rollbackPrayerCompletion(afterAdd, 'isha');
    expect(rolledBack.completed.isha).toBe(0);
    expect(rolledBack.todayCompleted.isha).toBe(0);
    expect(rolledBack.log).toHaveLength(0);
  });
});
