import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { useRef } from 'react';
import {
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
} from '../store/voucherSlice';

// Custom hook cho voucher management: select individual pieces với shallowEqual để tránh unnecessary re-renders, dùng ref để lưu stable action creators, trả về state (vouchers, loading, error, filters, pagination, tours, allToursMap) và actions
export function useVoucher() {
  const dispatch = useDispatch();
  
  const vouchers = useSelector((state) => state.vouchers.vouchers, shallowEqual);
  const loading = useSelector((state) => state.vouchers.loading);
  const error = useSelector((state) => state.vouchers.error);
  const filters = useSelector((state) => state.vouchers.filters, shallowEqual);
  const pagination = useSelector((state) => state.vouchers.pagination, shallowEqual);
  const tours = useSelector((state) => state.vouchers.tours, shallowEqual);
  const allToursMap = useSelector((state) => state.vouchers.allToursMap, shallowEqual);

  const actionsRef = useRef({
    setVouchers: (vouchers) => dispatch(setVouchers(vouchers)),
    setLoading: (loading) => dispatch(setLoading(loading)),
    setError: (error) => dispatch(setError(error)),
    setFilterType: (filterType) => dispatch(setFilterType(filterType)),
    setSortBy: (sortBy) => dispatch(setSortBy(sortBy)),
    setCurrentPage: (page) => dispatch(setCurrentPage(page)),
    resetPagination: () => dispatch(resetPagination()),
    setTours: (tours) => dispatch(setTours(tours)),
    setAllToursMap: (map) => dispatch(setAllToursMap(map)),
    resetVouchers: () => dispatch(resetVouchers())
  });

  // Trả về object với state và stable actions (actions stable qua ref)
  return {
    vouchers,
    loading,
    error,
    filters,
    pagination,
    tours,
    allToursMap,
    ...actionsRef.current
  };
}
