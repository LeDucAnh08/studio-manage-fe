import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import customersReducer from './slices/customersSlice';
import schedulesReducer from './slices/schedulesSlice';
import categoriesReducer from './slices/categoriesSlice';
import packagesReducer from './slices/packagesSlice';
import transactionsReducer from './slices/transactionsSlice';
import usersReducer from './slices/usersSlice';
import dashboardReducer from './slices/dashboardSlice';

export const store = configureStore({
  reducer: {
    customers: customersReducer,
    schedules: schedulesReducer,
    categories: categoriesReducer,
    packages: packagesReducer,
    transactions: transactionsReducer,
    users: usersReducer,
    dashboard: dashboardReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

/** Typed dispatch hook — use instead of plain useDispatch */
export const useAppDispatch = () => useDispatch<AppDispatch>();
/** Typed selector hook — use instead of plain useSelector */
export const useAppSelector = <T>(selector: (state: RootState) => T) => useSelector(selector);
