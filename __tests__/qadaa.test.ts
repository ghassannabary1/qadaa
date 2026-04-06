import {
  decrementCount,
  emptyCounts,
  incrementCount,
  remainingCounts,
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

  it('does not decrement below zero', () => {
    expect(decrementCount(emptyCounts(), 'isha').isha).toBe(0);
  });
});
