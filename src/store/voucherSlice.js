import { createSlice } from '@reduxjs/toolkit';

// Initial state
const initialState = {
  vouchers: [],
  loading: false,
  error: null,
  
  // Filtering and sorting (for VoucherList - User page)
  filters: {
    filterType: 'ALL', // 'ALL' | 'PERCENT' | 'AMOUNT'
    sortBy: 'newest' // 'newest' | 'oldest'
  },
  
  // Pagination (for VoucherManagement - Company page)
  pagination: {
    currentPage: 1,
    pageSize: 15
  },
  
  // Tours for dropdown and display
  tours: [], // Array of { id, name } for dropdown
  allToursMap: {} // Object: { [tourId]: tourName } for display
  
};

const voucherSlice = createSlice({
  name: 'vouchers',
  initialState,
  reducers: {
    // Set vouchers
    setVouchers: (state, action) => {
      state.vouchers = action.payload;
      state.error = null;
    },
    
    // Set loading state
    setLoading: (state, action) => {
      state.loading = action.payload;
      if (action.payload) {
        state.error = null; // Clear error when loading starts
      }
    },
    
    // Set error
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    
    // Filter actions
    setFilterType: (state, action) => {
      state.filters.filterType = action.payload;
    },
    
    setSortBy: (state, action) => {
      state.filters.sortBy = action.payload;
    },
    
    // Pagination actions
    setCurrentPage: (state, action) => {
      state.pagination.currentPage = action.payload;
    },
    
    // Reset pagination to first page (when vouchers change)
    resetPagination: (state) => {
      state.pagination.currentPage = 1;
    },
    
    // Tours actions
    setTours: (state, action) => {
      state.tours = action.payload;
    },
    
    setAllToursMap: (state, action) => {
      // Convert Map to Object if needed, or accept Object directly
      if (action.payload instanceof Map) {
        state.allToursMap = Object.fromEntries(action.payload);
      } else {
        state.allToursMap = action.payload;
      }
    },
    
    // Reset all state
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
