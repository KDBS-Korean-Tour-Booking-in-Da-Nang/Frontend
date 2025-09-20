import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { initialState } from './TourBookingConstants';
import { bookingReducer } from './TourBookingReducer';
import {
  createSetContactAction,
  createSetDateAction,
  createIncrementPaxAction,
  createDecrementPaxAction,
  createSetMemberAction,
  createRebuildMembersAction,
  createRecalcTotalAction,
  createResetBookingAction
} from './TourBookingActions';

// Create context
const TourBookingContext = createContext();

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

  const recalcTotal = useCallback(() => {
    dispatch(createRecalcTotalAction());
  }, []);

  const resetBooking = useCallback(() => {
    dispatch(createResetBookingAction());
  }, []);

  const value = useMemo(() => ({
    ...state,
    setContact,
    setDate,
    incrementPax,
    decrementPax,
    setMember,
    rebuildMembers,
    recalcTotal,
    resetBooking
  }), [state, setContact, setDate, incrementPax, decrementPax, setMember, rebuildMembers, recalcTotal, resetBooking]);

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
