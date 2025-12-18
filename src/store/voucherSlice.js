import { createSlice } from '@reduxjs/toolkit';

// Trạng thái ban đầu cho quản lý voucher
// Bao gồm danh sách voucher, trạng thái loading/error, bộ lọc, phân trang và danh sách tour
const initialState = {
  vouchers: [],
  loading: false,
  error: null,
  
  // Bộ lọc và sắp xếp (dùng cho trang VoucherList - User)
  filters: {
    filterType: 'ALL', // 'ALL' | 'PERCENT' | 'AMOUNT'
    sortBy: 'newest' // 'newest' | 'oldest'
  },
  
  // Phân trang (dùng cho trang VoucherManagement - Company)
  pagination: {
    currentPage: 1,
    pageSize: 15
  },
  
  // Danh sách tour cho dropdown và hiển thị
  tours: [], // Mảng { id, name } cho dropdown
  allToursMap: {} // Object: { [tourId]: tourName } để hiển thị tên tour nhanh
  
};

const voucherSlice = createSlice({
  name: 'vouchers',
  initialState,
  reducers: {
    setVouchers: (state, action) => {
      state.vouchers = action.payload;
      state.error = null;
    },
    
    setLoading: (state, action) => {
      state.loading = action.payload;
      if (action.payload) {
        state.error = null;
      }
    },
    
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    
    setFilterType: (state, action) => {
      state.filters.filterType = action.payload;
    },
    
    setSortBy: (state, action) => {
      state.filters.sortBy = action.payload;
    },
    
    setCurrentPage: (state, action) => {
      state.pagination.currentPage = action.payload;
    },
    
    resetPagination: (state) => {
      state.pagination.currentPage = 1;
    },
    
    setTours: (state, action) => {
      state.tours = action.payload;
    },
    
    // Thiết lập map tour để tra cứu nhanh tên tour theo ID
    // Hỗ trợ cả Map và Object, tự động chuyển đổi Map sang Object nếu cần
    setAllToursMap: (state, action) => {
      if (action.payload instanceof Map) {
        // Chuyển đổi Map sang Object để lưu trữ trong state
        state.allToursMap = Object.fromEntries(action.payload);
      } else {
        // Nếu đã là Object, sử dụng trực tiếp
        state.allToursMap = action.payload;
      }
    },
    
    resetVouchers: () => initialState
  }
});

export const {
  setVouchers,
  setLoading,
  setError,
  setFilterType,
  setSortBy,
  setCurrentPage,
  resetPagination,
  setTours,
  setAllToursMap,
  resetVouchers
} = voucherSlice.actions;

export default voucherSlice.reducer;
