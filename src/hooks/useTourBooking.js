import { useDispatch, useSelector, shallowEqual } from 'react-redux';
import { useRef } from 'react';
import {
  setContact,
  setDate,
  setPax,
  incrementPax,
  decrementPax,
  setMember,
  rebuildMembers,
  recalcTotal,
  resetBooking,
  setBookingLoading,
  setBookingError,
  setBookingSuccess,
  clearBookingStatus,
  restoreBookingData
} from '../store/tourBookingSlice';

// Custom hook để thay thế useBooking từ Context: interface giống hệt với useBooking để đảm bảo backward compatibility, select individual pieces với shallowEqual để tránh unnecessary re-renders, dùng ref để lưu stable action creators
export function useTourBooking() {
  const dispatch = useDispatch();
  
  const contact = useSelector((state) => state.tourBooking.contact, shallowEqual);
  const plan = useSelector((state) => state.tourBooking.plan, shallowEqual);
  const booking = useSelector((state) => state.tourBooking.booking, shallowEqual);

  const actionsRef = useRef({
    setContact: (partial) => dispatch(setContact(partial)),
    setDate: (dateData) => dispatch(setDate(dateData)),
    setPax: (paxData) => dispatch(setPax(paxData)),
    incrementPax: (type) => dispatch(incrementPax({ type })),
    decrementPax: (type) => dispatch(decrementPax({ type })),
    setMember: (memberType, index, partial) => dispatch(setMember({ memberType, index, partial })),
    rebuildMembers: () => dispatch(rebuildMembers()),
    recalcTotal: (prices = null) => dispatch(recalcTotal(prices)),
    resetBooking: () => dispatch(resetBooking()),
    setBookingLoading: (loading) => dispatch(setBookingLoading(loading)),
    setBookingError: (error) => dispatch(setBookingError(error)),
    setBookingSuccess: (bookingData) => dispatch(setBookingSuccess(bookingData)),
    clearBookingStatus: () => dispatch(clearBookingStatus()),
    restoreBookingData: (data) => dispatch(restoreBookingData(data))
  });

  // Trả về object: actions stable qua ref, chỉ state changes mới trigger re-render
  return {
    contact,
    plan,
    booking,
    ...actionsRef.current
  };
}
