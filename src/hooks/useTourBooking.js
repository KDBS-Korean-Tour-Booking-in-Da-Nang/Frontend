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

// Custom hook to replace useBooking from Context
// Interface giống hệt với useBooking để đảm bảo backward compatibility
export function useTourBooking() {
  const dispatch = useDispatch();
  
  // Select individual pieces with shallowEqual to prevent unnecessary re-renders
  const contact = useSelector((state) => state.tourBooking.contact, shallowEqual);
  const plan = useSelector((state) => state.tourBooking.plan, shallowEqual);
  const booking = useSelector((state) => state.tourBooking.booking, shallowEqual);

  // Use ref to store stable action creators
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

  // Return object - actions are stable via ref, only state changes trigger re-render
  return {
    contact,
    plan,
    booking,
    ...actionsRef.current
  };
}
