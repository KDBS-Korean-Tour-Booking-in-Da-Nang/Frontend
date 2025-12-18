import { ACTIONS } from './TourBookingConstants';

// Action creators: các hàm tạo action objects để dispatch vào reducer, mỗi action có type và payload tương ứng
export const createSetContactAction = (partial) => ({
  type: ACTIONS.SET_CONTACT,
  payload: partial
});

export const createSetDateAction = (dateData) => ({
  type: ACTIONS.SET_DATE,
  payload: dateData
});

export const createSetPaxAction = (paxData) => ({
  type: ACTIONS.SET_PAX,
  payload: paxData
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

export const createRecalcTotalAction = (prices = null) => ({
  type: ACTIONS.RECALC_TOTAL,
  payload: prices
});

export const createResetBookingAction = () => ({
  type: ACTIONS.RESET_BOOKING
});

export const createSetBookingLoadingAction = (loading) => ({
  type: ACTIONS.SET_BOOKING_LOADING,
  payload: loading
});

export const createSetBookingErrorAction = (error) => ({
  type: ACTIONS.SET_BOOKING_ERROR,
  payload: error
});

export const createSetBookingSuccessAction = (bookingData) => ({
  type: ACTIONS.SET_BOOKING_SUCCESS,
  payload: bookingData
});

export const createClearBookingStatusAction = () => ({
  type: ACTIONS.CLEAR_BOOKING_STATUS
});
