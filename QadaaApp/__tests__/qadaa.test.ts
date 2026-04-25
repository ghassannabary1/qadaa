import {
  applyFastingCompletion,
  applyFullDayCompletion,
  applyPrayerCompletion,
  applyPrayerCompletionForDay,
  calculateKafarahPoorPeople,
  clearTodayPrayerProgress,
  countsFromMissedDays,
  defaultAppState,
  estimateCompletionDays,
  emptyCounts,
  estimateCompletionDate,
  estimateMissedDaysFromShafiiSetup,
  estimatePrayerPacePerDay,
  getRecentDailyActivity,
  groupLogEntriesByDay,
  groupFastingActivityByMonth,
  incrementCount,
  latestLogEntries,
  PRAYERS_PER_QADAA_DAY,
  remainingCounts,
  remainingFastingDays,
  rollbackFastingCompletion,
  rollbackFullDayCompletion,
  rollbackPrayerCompletion,
  rollbackPrayerCompletionForDay,
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
    expect(state.profileName).toBe('');
    expect(state.profileAge).toBe('');
    expect(state.profileEmail).toBe('');
    expect(state.notes).toContain('Shafi');
    expect(state.language).toBe('en');
    expect(state.notificationEnabled).toBe(false);
    expect(state.notificationHour).toBe(21);
    expect(state.notificationMinute).toBe(0);
    expect(state.notificationScheduleId).toBeNull();
    expect(state.defaultDailyAddDays).toBe(1);
    expect(state.fastingEnabled).toBe(false);
    expect(state.fastingTargetDays).toBe(0);
    expect(state.fastingCompletedDays).toBe(0);
    expect(state.fastingLog).toEqual([]);
    expect(state.fastingKafarahDays).toBe(0);
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

  it('computes remaining fasting days', () => {
    expect(remainingFastingDays(10, 3)).toBe(7);
    expect(remainingFastingDays(3, 10)).toBe(0);
  });

  it('calculates kaffarah poor-person count', () => {
    expect(calculateKafarahPoorPeople(0)).toBe(0);
    expect(calculateKafarahPoorPeople(2)).toBe(120);
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

  it('keeps more than 100 prayer log entries for longer history', () => {
    let state = defaultAppState();

    for (let index = 0; index < 25; index += 1) {
      state = applyFullDayCompletion(state);
    }

    expect(state.log).toHaveLength(PRAYERS_PER_QADAA_DAY * 25);
  });

  it('applies a full qadaa day across all five prayers', () => {
    const state = applyFullDayCompletion(defaultAppState());

    expect(totalCounts(state.completed)).toBe(PRAYERS_PER_QADAA_DAY);
    expect(totalCounts(state.todayCompleted)).toBe(PRAYERS_PER_QADAA_DAY);
    expect(state.log).toHaveLength(PRAYERS_PER_QADAA_DAY);
    expect(state.completed.fajr).toBe(1);
    expect(state.completed.isha).toBe(1);
  });

  it('applies multiple qadaa days in one batch when requested', () => {
    const state = applyFullDayCompletion(defaultAppState(), 3);

    expect(totalCounts(state.completed)).toBe(PRAYERS_PER_QADAA_DAY * 3);
    expect(totalCounts(state.todayCompleted)).toBe(PRAYERS_PER_QADAA_DAY * 3);
    expect(state.log).toHaveLength(PRAYERS_PER_QADAA_DAY * 3);
    expect(state.completed.fajr).toBe(3);
    expect(state.completed.isha).toBe(3);
  });

  it('rolls back a prayer completion safely', () => {
    const afterAdd = applyPrayerCompletion(defaultAppState(), 'isha');
    const rolledBack = rollbackPrayerCompletion(afterAdd, 'isha');
    expect(rolledBack.completed.isha).toBe(0);
    expect(rolledBack.todayCompleted.isha).toBe(0);
    expect(rolledBack.log).toHaveLength(0);
  });

  it('applies a prayer completion to a selected past day', () => {
    const state = applyPrayerCompletionForDay(
      defaultAppState(),
      'dhuhr',
      '2026-04-10',
      new Date('2026-04-18T12:00:00.000Z')
    );

    expect(state.completed.dhuhr).toBe(1);
    expect(state.todayCompleted.dhuhr).toBe(0);
    expect(state.log[0].createdAt.slice(0, 10)).toBe('2026-04-10');
    expect(state.log[0].source).toBe('manual_adjust');
  });

  it('rolls back a prayer completion from a selected day only', () => {
    const state = {
      ...defaultAppState(),
      completed: { fajr: 1, dhuhr: 2, asr: 0, maghrib: 0, isha: 0 },
      todayCompleted: { fajr: 1, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
      log: [
        { id: 'today-fajr', prayer: 'fajr', createdAt: '2026-04-18T08:00:00.000Z', source: 'quick_add' as const },
        { id: 'past-dhuhr-2', prayer: 'dhuhr', createdAt: '2026-04-10T13:00:00.000Z', source: 'manual_adjust' as const },
        { id: 'past-dhuhr-1', prayer: 'dhuhr', createdAt: '2026-04-10T12:00:00.000Z', source: 'quick_add' as const },
      ],
    };

    const rolledBack = rollbackPrayerCompletionForDay(
      state,
      'dhuhr',
      '2026-04-10',
      new Date('2026-04-18T12:00:00.000Z')
    );

    expect(rolledBack.completed.dhuhr).toBe(1);
    expect(rolledBack.todayCompleted.fajr).toBe(1);
    expect(rolledBack.todayCompleted.dhuhr).toBe(0);
    expect(rolledBack.log.map((entry) => entry.id)).toEqual(['today-fajr', 'past-dhuhr-1']);
  });

  it('applies and rolls back a fasting completion safely', () => {
    const afterAdd = applyFastingCompletion({
      ...defaultAppState(),
      fastingEnabled: true,
      fastingTargetDays: 12,
    });

    expect(afterAdd.fastingCompletedDays).toBe(1);
    expect(afterAdd.fastingLog).toHaveLength(1);

    const rolledBack = rollbackFastingCompletion(afterAdd);
    expect(rolledBack.fastingCompletedDays).toBe(0);
    expect(rolledBack.fastingLog).toHaveLength(0);
  });

  it('keeps more than 100 fasting log entries for longer history', () => {
    let state = {
      ...defaultAppState(),
      fastingEnabled: true,
    };

    for (let index = 0; index < 125; index += 1) {
      state = applyFastingCompletion(state);
    }

    expect(state.fastingLog).toHaveLength(125);
  });

  it('rolls back a full qadaa day safely', () => {
    const afterAdd = applyFullDayCompletion(defaultAppState());
    const rolledBack = rollbackFullDayCompletion(afterAdd);

    expect(totalCounts(rolledBack.completed)).toBe(0);
    expect(totalCounts(rolledBack.todayCompleted)).toBe(0);
    expect(rolledBack.log).toHaveLength(0);
  });

  it('clears only today prayer progress from totals and history', () => {
    const state = {
      ...defaultAppState(),
      completed: { fajr: 2, dhuhr: 1, asr: 1, maghrib: 1, isha: 1 },
      todayCompleted: { fajr: 1, dhuhr: 1, asr: 1, maghrib: 1, isha: 1 },
      log: [
        { id: 'today-fajr', prayer: 'fajr', createdAt: '2026-04-18T08:00:00.000Z', source: 'quick_add' },
        { id: 'today-dhuhr', prayer: 'dhuhr', createdAt: '2026-04-18T10:00:00.000Z', source: 'quick_add' },
        { id: 'today-asr', prayer: 'asr', createdAt: '2026-04-18T13:00:00.000Z', source: 'quick_add' },
        { id: 'today-maghrib', prayer: 'maghrib', createdAt: '2026-04-18T16:00:00.000Z', source: 'quick_add' },
        { id: 'today-isha', prayer: 'isha', createdAt: '2026-04-18T18:00:00.000Z', source: 'quick_add' },
        { id: 'older-fajr', prayer: 'fajr', createdAt: '2026-04-17T08:00:00.000Z', source: 'quick_add' },
      ],
    };

    const cleared = clearTodayPrayerProgress(state, new Date('2026-04-18T19:00:00.000Z'));

    expect(cleared.completed).toEqual({
      fajr: 1,
      dhuhr: 0,
      asr: 0,
      maghrib: 0,
      isha: 0,
    });
    expect(cleared.todayCompleted).toEqual(emptyCounts());
    expect(cleared.log).toHaveLength(1);
    expect(cleared.log[0].id).toBe('older-fajr');
  });

  it('undoes only the latest full qadaa day batch', () => {
    const firstDay = applyFullDayCompletion(defaultAppState());
    const withManualPrayer = applyPrayerCompletion(firstDay, 'fajr');
    const secondDay = applyFullDayCompletion(withManualPrayer);
    const rolledBack = rollbackFullDayCompletion(secondDay);

    expect(rolledBack.completed).toEqual({
      fajr: 2,
      dhuhr: 1,
      asr: 1,
      maghrib: 1,
      isha: 1,
    });
    expect(rolledBack.log).toHaveLength(6);
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
      1,
      new Date('2026-04-11T12:00:00.000Z')
    );

    expect(finishDate?.toISOString().slice(0, 10)).toBe('2026-04-13');
  });

  it('estimates qadaa days left directly from remaining prayers', () => {
    const daysLeft = estimateCompletionDays(
      10,
      [
        { id: '1', prayer: 'fajr', createdAt: '2026-04-10T07:00:00.000Z', source: 'quick_add' },
        { id: '2', prayer: 'dhuhr', createdAt: '2026-04-10T08:00:00.000Z', source: 'quick_add' },
        { id: '3', prayer: 'asr', createdAt: '2026-04-11T07:00:00.000Z', source: 'quick_add' },
        { id: '4', prayer: 'maghrib', createdAt: '2026-04-11T08:00:00.000Z', source: 'quick_add' },
      ],
      1,
      new Date('2026-04-11T12:00:00.000Z')
    );

    expect(daysLeft).toBe(2);
  });

  it('brings the finish date closer when planned daily pace is higher', () => {
    const finishDate = estimateCompletionDate(
      10,
      [],
      2,
      new Date('2026-04-11T12:00:00.000Z')
    );

    expect(finishDate?.toISOString().slice(0, 10)).toBe('2026-04-12');
  });

  it('reduces estimated days left when planned daily pace is higher', () => {
    const daysLeft = estimateCompletionDays(
      10,
      [],
      2,
      new Date('2026-04-11T12:00:00.000Z')
    );

    expect(daysLeft).toBe(1);
  });

  it('turns off the finish estimate when planned daily pace is 0', () => {
    const daysLeft = estimateCompletionDays(10, [], 0, new Date('2026-04-11T12:00:00.000Z'));
    const finishDate = estimateCompletionDate(10, [], 0, new Date('2026-04-11T12:00:00.000Z'));

    expect(daysLeft).toBeNull();
    expect(finishDate).toBeNull();
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

  it('groups fasting activity into month sections', () => {
    const sections = groupFastingActivityByMonth([
      { dayKey: '2026-04-18', totalCount: 1 },
      { dayKey: '2026-04-17', totalCount: 1 },
      { dayKey: '2026-03-30', totalCount: 1 },
      { dayKey: '2026-03-29', totalCount: 0 },
    ]);

    expect(sections).toHaveLength(2);
    expect(sections[0].monthKey).toBe('2026-04');
    expect(sections[0].days).toHaveLength(2);
    expect(sections[1].monthKey).toBe('2026-03');
    expect(sections[1].days).toHaveLength(1);
  });
});
