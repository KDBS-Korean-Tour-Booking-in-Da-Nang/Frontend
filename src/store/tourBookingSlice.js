import { createSlice } from '@reduxjs/toolkit';

// Initial state - giống hệt với TourBookingConstants
const initialState = {
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

const tourBookingSlice = createSlice({
  name: 'tourBooking',
  initialState,
  reducers: {
    setContact: (state, action) => {
      state.contact = { ...state.contact, ...action.payload };
    },
    
    setDate: (state, action) => {
      state.plan.date = action.payload;
    },
    
    setPax: (state, action) => {
      state.plan.pax = { ...state.plan.pax, ...action.payload };
    },
    
    incrementPax: (state, action) => {
      const { type: incrementType } = action.payload;
      state.plan.pax[incrementType] += 1;
    },
    
    decrementPax: (state, action) => {
      const { type: decrementType } = action.payload;
      
      // Ensure adult count never goes below 1
      if (decrementType === 'adult' && state.plan.pax[decrementType] <= 1) {
        return; // No change if trying to go below 1 adult
      }
      
      if (state.plan.pax[decrementType] > 0) {
        state.plan.pax[decrementType] -= 1;
      }
    },
    
    setMember: (state, action) => {
      const { memberType, index, partial } = action.payload;
      
      // Ensure array has enough elements for the index
      while (state.plan.members[memberType].length <= index) {
        state.plan.members[memberType].push({
          fullName: '',
          dob: '',
          gender: '',
          nationality: '',
          idNumber: ''
        });
      }
      
      state.plan.members[memberType][index] = {
        ...state.plan.members[memberType][index],
        ...partial
      };
    },
    
    rebuildMembers: (state) => {
      const { pax } = state.plan;
      const newMembers = {
        adult: [],
        child: [],
        infant: []
      };

      // Rebuild members arrays based on current pax counts
      ['adult', 'child', 'infant'].forEach(type => {
        const currentMembers = state.plan.members[type] || [];
        const targetCount = pax[type];
        
        // Keep existing members up to target count
        for (let i = 0; i < targetCount; i++) {
          const currentMember = currentMembers[i];
          
          if (currentMember && currentMember !== undefined && currentMember !== null) {
            newMembers[type].push(currentMember);
          } else {
            // Add new empty member
            newMembers[type].push({
              fullName: '',
              dob: '',
              gender: '',
              nationality: '',
              idNumber: ''
            });
          }
        }
      });

      state.plan.members = newMembers;
    },
    
    recalcTotal: (state, action) => {
      const { adult, child, infant } = state.plan.pax;
      
      // Use prices from API if provided, otherwise set to 0
      const prices = action.payload || { adult: null, child: null, infant: null };
      
      // Calculate totals only for non-null prices
      const adultTotal = prices.adult ? adult * prices.adult : 0;
      const childTotal = prices.child ? child * prices.child : 0;
      const infantTotal = prices.infant ? infant * prices.infant : 0;
      const total = adultTotal + childTotal + infantTotal;
      
      state.plan.price = {
        adult: adultTotal,
        child: childTotal,
        infant: infantTotal,
        total
      };
    },
    
    resetBooking: () => initialState,
    
    setBookingLoading: (state, action) => {
      state.booking.loading = action.payload;
      state.booking.error = null;
    },
    
    setBookingError: (state, action) => {
      state.booking.loading = false;
      state.booking.error = action.payload;
      state.booking.success = false;
    },
    
    setBookingSuccess: (state, action) => {
      state.booking.loading = false;
      state.booking.error = null;
      state.booking.success = true;
      state.booking.bookingData = action.payload;
    },
    
    clearBookingStatus: (state) => {
      state.booking.loading = false;
      state.booking.error = null;
      state.booking.success = false;
      state.booking.bookingData = null;
    },
    
    // Restore booking data from localStorage - batch restore to prevent infinite loops
    restoreBookingData: (state, action) => {
      const { contact, plan } = action.payload;
      
      if (contact) {
        state.contact = { ...contact };
      }
      
      if (plan) {
        if (plan.date) {
          state.plan.date = plan.date;
        }
        if (plan.pax) {
          state.plan.pax = { ...plan.pax };
        }
        if (plan.members) {
          // Restore members if available
          state.plan.members = {
            adult: Array.isArray(plan.members.adult) ? [...plan.members.adult] : [],
            child: Array.isArray(plan.members.child) ? [...plan.members.child] : [],
            infant: Array.isArray(plan.members.infant) ? [...plan.members.infant] : []
          };
        } else if (plan.pax) {
          // If no members but have pax, rebuild members based on pax
          const { pax } = plan;
          const newMembers = {
            adult: [],
            child: [],
            infant: []
          };
          
          ['adult', 'child', 'infant'].forEach(type => {
            const targetCount = pax[type] || 0;
            for (let i = 0; i < targetCount; i++) {
              newMembers[type].push({
                fullName: '',
                dob: '',
                gender: '',
                nationality: '',
                idNumber: ''
              });
            }
          });
          
          state.plan.members = newMembers;
        }
        if (plan.price) {
          state.plan.price = { ...plan.price };
        }
      }
    }
  }
});

export const {
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
} = tourBookingSlice.actions;

export default tourBookingSlice.reducer;
