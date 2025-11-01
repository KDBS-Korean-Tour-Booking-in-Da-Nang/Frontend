import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { initialState } from './TourBookingConstants';
import { bookingReducer } from './TourBookingReducer';
import {
  createSetContactAction,
  createSetDateAction,
  createSetPaxAction,
  createIncrementPaxAction,
  createDecrementPaxAction,
  createSetMemberAction,
  createRebuildMembersAction,
  createRecalcTotalAction,
  createResetBookingAction,
  createSetBookingLoadingAction,
  createSetBookingErrorAction,
  createSetBookingSuccessAction,
  createClearBookingStatusAction
} from './TourBookingActions';

// Create context
export const TourBookingContext = createContext();

// Provider component
export function TourBookingProvider({ children }) {
  const [state, dispatch] = useReducer(bookingReducer, initialState);

  // Action creators
  const setContact = useCallback((partial) => {
    dispatch(createSetContactAction(partial));
  }, []);

  const setDate = useCallback((dateData) => {
    dispatch(createSetDateAction(dateData));
  }, []);

  const setPax = useCallback((paxData) => {
    dispatch(createSetPaxAction(paxData));
  }, []);

  const incrementPax = useCallback((type) => {
    dispatch(createIncrementPaxAction(type));
  }, []);

  const decrementPax = useCallback((type) => {
    dispatch(createDecrementPaxAction(type));
  }, []);

  const setMember = useCallback((memberType, index, partial) => {
    dispatch(createSetMemberAction(memberType, index, partial));
  }, []);

  const rebuildMembers = useCallback(() => {
    dispatch(createRebuildMembersAction());
  }, []);

  const recalcTotal = useCallback((prices = null) => {
    dispatch(createRecalcTotalAction(prices));
  }, []);

  const resetBooking = useCallback(() => {
    dispatch(createResetBookingAction());
  }, []);

  const setBookingLoading = useCallback((loading) => {
    dispatch(createSetBookingLoadingAction(loading));
  }, []);

  const setBookingError = useCallback((error) => {
    dispatch(createSetBookingErrorAction(error));
  }, []);

  const setBookingSuccess = useCallback((bookingData) => {
    dispatch(createSetBookingSuccessAction(bookingData));
  }, []);

  const clearBookingStatus = useCallback(() => {
    dispatch(createClearBookingStatusAction());
  }, []);

  const value = useMemo(() => ({
    ...state,
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
    clearBookingStatus
  }), [state, setContact, setDate, setPax, incrementPax, decrementPax, setMember, rebuildMembers, recalcTotal, resetBooking, setBookingLoading, setBookingError, setBookingSuccess, clearBookingStatus]);

  return (
    <TourBookingContext.Provider value={value}>
      {children}
    </TourBookingContext.Provider>
  );
}

TourBookingProvider.propTypes = {
  children: PropTypes.node.isRequired
};

// Custom hook
export function useBooking() {
  const context = useContext(TourBookingContext);
  if (!context) {
    throw new Error('useBooking must be used within a TourBookingProvider');
  }
  return context;
}
