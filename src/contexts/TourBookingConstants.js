// Action types for TourBookingContext
export const ACTIONS = {
  SET_CONTACT: 'SET_CONTACT',
  SET_DATE: 'SET_DATE',
  INCREMENT_PAX: 'INCREMENT_PAX',
  DECREMENT_PAX: 'DECREMENT_PAX',
  SET_MEMBER: 'SET_MEMBER',
  REBUILD_MEMBERS: 'REBUILD_MEMBERS',
  RECALC_TOTAL: 'RECALC_TOTAL',
  RESET_BOOKING: 'RESET_BOOKING',
  SET_BOOKING_LOADING: 'SET_BOOKING_LOADING',
  SET_BOOKING_ERROR: 'SET_BOOKING_ERROR',
  SET_BOOKING_SUCCESS: 'SET_BOOKING_SUCCESS',
  CLEAR_BOOKING_STATUS: 'CLEAR_BOOKING_STATUS'
};

// Initial state structure
export const initialState = {
  contact: {
    fullName: '',
    address: '',
    phone: '',
    email: '',
    pickupPoint: '',
    note: ''
  },
  plan: {
    date: { day: null, month: null, year: null },
    pax: { adult: 1, child: 0, infant: 0 },
    members: {
      adult: [{ fullName: '', dob: '', gender: '', nationality: '', idNumber: '' }],
      child: [],
      infant: []
    },
    price: { adult: 0, child: 0, infant: 0, total: 0 }
  },
  booking: {
    loading: false,
    error: null,
    success: false,
    bookingData: null
  }
};
