import { describe, expect, it } from 'vitest';
import reducer, { fetchDashboardStats } from './dashboardSlice';
import type { DashboardStats } from '../../services/dashboardService';

describe('dashboard filter request ordering', () => {
  it('keeps the newest filter data when an older response or failure arrives late', () => {
    let state = reducer(undefined, fetchDashboardStats.pending('first', { userId: 'old' }));
    state = reducer(state, fetchDashboardStats.pending('second', { userId: 'new' }));
    const latest = { customerCount: 2 } as DashboardStats;
    state = reducer(state, fetchDashboardStats.fulfilled(latest, 'second', { userId: 'new' }));
    state = reducer(
      state,
      fetchDashboardStats.fulfilled({ customerCount: 99 } as DashboardStats, 'first', {
        userId: 'old',
      }),
    );
    state = reducer(
      state,
      fetchDashboardStats.rejected(new Error('Old failure'), 'first', { userId: 'old' }),
    );
    expect(state.stats).toEqual(latest);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });
});
