import { ACTIONS } from './TourBookingConstants';

// Action creators
export const createSetContactAction = (partial) => ({
  type: ACTIONS.SET_CONTACT,
  payload: partial
});

export const createSetDateAction = (dateData) => ({
  type: ACTIONS.SET_DATE,
  payload: dateData
});

export const createIncrementPaxAction = (type) => ({
  type: ACTIONS.INCREMENT_PAX,
  payload: { type }
});

export const createDecrementPaxAction = (type) => ({
  type: ACTIONS.DECREMENT_PAX,
  payload: { type }
});

export const createSetMemberAction = (memberType, index, partial) => ({
  type: ACTIONS.SET_MEMBER,
  payload: { memberType, index, partial }
});

export const createRebuildMembersAction = () => ({
  type: ACTIONS.REBUILD_MEMBERS
});

export const createRecalcTotalAction = () => ({
  type: ACTIONS.RECALC_TOTAL
});

export const createResetBookingAction = () => ({
  type: ACTIONS.RESET_BOOKING
});
