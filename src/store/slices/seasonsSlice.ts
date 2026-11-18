import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { seasonService } from '../../services/seasonService';
import type { Season } from '../../types';

interface SeasonsState {
  list: Season[];
  selectedSeasonId: string;
  loading: boolean;
  error: string | null;
}

const initialState: SeasonsState = {
  list: [],
  selectedSeasonId: '',
  loading: false,
  error: null,
};

export const fetchSeasons = createAsyncThunk(
  'seasons/fetchAll',
  (_options?: { selectCurrent: boolean }) => seasonService.getAll(),
);

const seasonsSlice = createSlice({
  name: 'seasons',
  initialState,
  reducers: {
    setSelectedSeason: (state, action: PayloadAction<string>) => {
      state.selectedSeasonId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSeasons.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        if (action.meta.arg?.selectCurrent === false) state.selectedSeasonId = '';
      })
      .addCase(fetchSeasons.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
        // Tự động chọn mùa chứa ngày hôm nay nếu chưa chọn gì
        if (action.meta.arg?.selectCurrent !== false && !state.selectedSeasonId) {
          const today = new Date();
          const current = action.payload.find(
            (s) => new Date(s.startDate) <= today && today <= new Date(s.endDate),
          );
          if (current) {
            state.selectedSeasonId = current._id;
          }
        }
      })
      .addCase(fetchSeasons.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Lỗi tải mùa chụp';
      });
  },
});

export const { setSelectedSeason } = seasonsSlice.actions;
export default seasonsSlice.reducer;
