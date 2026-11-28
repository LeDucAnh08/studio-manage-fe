import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { transactionService } from '../../services/transactionService';
import type { TransactionResponse, TransactionSummaryRow, TransactionTotals } from '../../types';

interface TransactionsState {
  list: TransactionResponse[];
  total: number;
  totals: TransactionTotals | null;
  summary: TransactionSummaryRow[];
  loading: boolean;
  error: string | null;
}

const initialState: TransactionsState = {
  list: [],
  total: 0,
  totals: null,
  summary: [],
  loading: false,
  error: null,
};

export const fetchTransactions = createAsyncThunk(
  'transactions/fetchAll',
  (params?: Record<string, string | number>) => transactionService.getAll(params),
);

export const fetchTransactionSummary = createAsyncThunk(
  'transactions/fetchSummary',
  (params?: { dateFrom?: string; dateTo?: string }) => transactionService.getSummary(params),
);

const transactionsSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    patchTransaction: (
      state,
      action: { payload: { id: string; changes: Partial<TransactionResponse> } },
    ) => {
      const { id, changes } = action.payload;
      const idx = state.list.findIndex((t) => t._id === id);
      if (idx !== -1) {
        state.list[idx] = { ...state.list[idx], ...changes };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTransactions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload.data;
        state.total = action.payload.total;
        state.totals = action.payload.totals ?? null;
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Lỗi tải giao dịch';
      })
      .addCase(fetchTransactionSummary.fulfilled, (state, action) => {
        state.summary = action.payload;
      });
  },
});

export const { patchTransaction } = transactionsSlice.actions;

export default transactionsSlice.reducer;
