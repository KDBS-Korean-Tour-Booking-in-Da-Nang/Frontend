import { configureStore } from '@reduxjs/toolkit';
import tourReducer from './tourSlice';
import tourBookingReducer from './tourBookingSlice';
import voucherReducer from './voucherSlice';

// Cấu hình Redux store với các reducer
// tours: Quản lý danh sách tour, tìm kiếm, lọc theo danh mục
// tourBooking: Quản lý quá trình đặt tour (thông tin liên hệ, thành viên, giá)
// vouchers: Quản lý voucher, bộ lọc, phân trang
export const store = configureStore({
  reducer: {
    tours: tourReducer,
    tourBooking: tourBookingReducer,
    vouchers: voucherReducer,
  },
});

export default store;
