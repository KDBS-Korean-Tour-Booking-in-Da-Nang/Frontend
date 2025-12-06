import { configureStore } from '@reduxjs/toolkit';
import tourReducer from './tourSlice';
import tourBookingReducer from './tourBookingSlice';
import voucherReducer from './voucherSlice';

export const store = configureStore({
  reducer: {
    tours: tourReducer,
    tourBooking: tourBookingReducer,
    vouchers: voucherReducer,
  },
});

export default store;
