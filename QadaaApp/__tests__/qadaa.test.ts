import {
  applyFullDayCompletion,
  applyPrayerCompletion,
  countsFromMissedDays,
  defaultAppState,
  emptyCounts,
  estimateCompletionDate,
  estimateMissedDaysFromShafiiSetup,
  estimatePrayerPacePerDay,
  getRecentDailyActivity,
  groupLogEntriesByDay,
  incrementCount,
  latestLogEntries,
  PRAYERS_PER_QADAA_DAY,
  remainingCounts,
  rollbackFullDayCompletion,
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

  it('builds prayer counts from missed days', () => {
    expect(countsFromMissedDays(12)).toEqual({
      fajr: 12,
      dhuhr: 12,
      asr: 12,
      maghrib: 12,
      isha: 12,
    });
  });

  it('builds a default app state', () => {
    const state = defaultAppState();
    expect(state.log).toEqual([]);
    expect(state.notes).toContain('Shafi');
    expect(state.language).toBe('en');
    expect(state.accountabilityPartnerName).toBe('');
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

  it('applies a full qadaa day across all five prayers', () => {
    const state = applyFullDayCompletion(defaultAppState());

    expect(totalCounts(state.completed)).toBe(PRAYERS_PER_QADAA_DAY);
    expect(totalCounts(state.todayCompleted)).toBe(PRAYERS_PER_QADAA_DAY);
    expect(state.log).toHaveLength(PRAYERS_PER_QADAA_DAY);
    expect(state.completed.fajr).toBe(1);
    expect(state.completed.isha).toBe(1);
  });

  it('rolls back a prayer completion safely', () => {
    const afterAdd = applyPrayerCompletion(defaultAppState(), 'isha');
    const rolledBack = rollbackPrayerCompletion(afterAdd, 'isha');
    expect(rolledBack.completed.isha).toBe(0);
    expect(rolledBack.todayCompleted.isha).toBe(0);
    expect(rolledBack.log).toHaveLength(0);
  });

  it('rolls back a full qadaa day safely', () => {
    const afterAdd = applyFullDayCompletion(defaultAppState());
    const rolledBack = rollbackFullDayCompletion(afterAdd);

    expect(totalCounts(rolledBack.completed)).toBe(0);
    expect(totalCounts(rolledBack.todayCompleted)).toBe(0);
    expect(rolledBack.log).toHaveLength(0);
  });

  it('estimates prayer pace per day from the first logged day', () => {
    const pace = estimatePrayerPacePerDay(
      [
        { id: '1', prayer: 'fajr', createdAt: '2026-04-10T07:00:00.000Z', source: 'quick_add' },
        { id: '2', prayer: 'dhuhr', createdAt: '2026-04-11T07:00:00.000Z', source: 'quick_add' },
        { id: '3', prayer: 'asr', createdAt: '2026-04-12T07:00:00.000Z', source: 'quick_add' },
        { id: '4', prayer: 'maghrib', createdAt: '2026-04-13T07:00:00.000Z', source: 'quick_add' },
      ],
      new Date('2026-04-13T12:00:00.000Z')
    );

    expect(pace).toBe(1);
  });

  it('estimates a finish date from the current pace', () => {
    const finishDate = estimateCompletionDate(
      10,
      [
        { id: '1', prayer: 'fajr', createdAt: '2026-04-10T07:00:00.000Z', source: 'quick_add' },
        { id: '2', prayer: 'dhuhr', createdAt: '2026-04-10T08:00:00.000Z', source: 'quick_add' },
        { id: '3', prayer: 'asr', createdAt: '2026-04-11T07:00:00.000Z', source: 'quick_add' },
        { id: '4', prayer: 'maghrib', createdAt: '2026-04-11T08:00:00.000Z', source: 'quick_add' },
      ],
      new Date('2026-04-11T12:00:00.000Z')
    );

    expect(finishDate?.toISOString().slice(0, 10)).toBe('2026-04-16');
  });

  it('estimates missed days from a simple Shafii setup', () => {
    expect(
      estimateMissedDaysFromShafiiSetup({
        latestPubertyAge: 12,
        regularPrayerAge: 14,
      })
    ).toBe(709);
  });

  it('subtracts menstruation days from the estimate when provided', () => {
    expect(
      estimateMissedDaysFromShafiiSetup({
        latestPubertyAge: 12,
        regularPrayerAge: 13,
        menstruationDaysPerYear: 60,
      })
    ).toBe(294);
  });

  it('groups history entries by day', () => {
    const base = defaultAppState();
    const withLogs = {
      ...base,
      log: [
        { id: '1', prayer: 'fajr' as const, createdAt: '2026-04-06T07:00:00.000Z', source: 'quick_add' as const },
        { id: '2', prayer: 'asr' as const, createdAt: '2026-04-06T12:00:00.000Z', source: 'quick_add' as const },
        { id: '3', prayer: 'isha' as const, createdAt: '2026-04-05T19:30:00.000Z', source: 'quick_add' as const },
      ],
    };

    const grouped = groupLogEntriesByDay(withLogs.log);
    expect(grouped).toHaveLength(2);
    expect(grouped[0].entries).toHaveLength(2);
    expect(grouped[1].entries).toHaveLength(1);
  });

  it('builds recent daily activity for the last 30 days', () => {
    const recent = getRecentDailyActivity(
      [
        { id: '1', prayer: 'fajr', createdAt: '2026-04-17T07:00:00.000Z', source: 'quick_add' },
        { id: '2', prayer: 'isha', createdAt: '2026-04-17T19:30:00.000Z', source: 'quick_add' },
        { id: '3', prayer: 'dhuhr', createdAt: '2026-04-16T12:00:00.000Z', source: 'quick_add' },
      ],
      3,
      new Date('2026-04-17T20:00:00.000Z')
    );

    expect(recent).toHaveLength(3);
    expect(recent[0].dayKey).toBe('2026-04-17');
    expect(recent[0].totalCount).toBe(2);
    expect(recent[1].dayKey).toBe('2026-04-16');
    expect(recent[1].totalCount).toBe(1);
    expect(recent[2].dayKey).toBe('2026-04-15');
    expect(recent[2].totalCount).toBe(0);
  });
});
