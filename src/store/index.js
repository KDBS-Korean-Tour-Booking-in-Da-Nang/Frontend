import { configureStore } from '@reduxjs/toolkit';
import tourReducer from './tourSlice';

export const store = configureStore({
  reducer: {
    tours: tourReducer,
  },
});

export default store;
