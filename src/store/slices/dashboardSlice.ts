import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { dashboardService } from '../../services/dashboardService';
import type { DashboardStats } from '../../services/dashboardService';

interface DashboardState {
  stats: DashboardStats | null;
  loading: boolean;
  error: string | null;
  requestId?: string;
}

const initialState: DashboardState = { stats: null, loading: false, error: null };

export const fetchDashboardStats = createAsyncThunk(
  'dashboard/fetchStats',
  (params?: { userId?: string; months?: number }) => dashboardService.getStats(params),
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardStats.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.requestId = action.meta.requestId;
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        if (state.requestId !== action.meta.requestId) return;
        state.loading = false;
        state.stats = action.payload;
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        if (state.requestId !== action.meta.requestId) return;
        state.loading = false;
        state.error = action.error.message ?? 'Lỗi tải dashboard';
      });
  },
});

export default dashboardSlice.reducer;
