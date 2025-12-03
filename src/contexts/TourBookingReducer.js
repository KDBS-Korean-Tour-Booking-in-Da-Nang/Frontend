import { ACTIONS, initialState } from './TourBookingConstants';

// Reducer function
export function bookingReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_CONTACT:
      return {
        ...state,
        contact: { ...state.contact, ...action.payload }
      };

    case ACTIONS.SET_DATE:
      return {
        ...state,
        plan: {
          ...state.plan,
          date: action.payload
        }
      };

    case ACTIONS.SET_PAX:
      return {
        ...state,
        plan: {
          ...state.plan,
          pax: { ...state.plan.pax, ...action.payload }
        }
      };

    case ACTIONS.INCREMENT_PAX: {
      const { type: incrementType } = action.payload;
      const newPax = { ...state.plan.pax };
      newPax[incrementType] += 1;
      
      return {
        ...state,
        plan: {
          ...state.plan,
          pax: newPax
        }
      };
    }

    case ACTIONS.DECREMENT_PAX: {
      const { type: decrementType } = action.payload;
      const updatedPax = { ...state.plan.pax };
      
      // Ensure adult count never goes below 1
      if (decrementType === 'adult' && updatedPax[decrementType] <= 1) {
        return state; // No change if trying to go below 1 adult
      }
      
      if (updatedPax[decrementType] > 0) {
        updatedPax[decrementType] -= 1;
      }
      
      return {
        ...state,
        plan: {
          ...state.plan,
          pax: updatedPax
        }
      };
    }

    case ACTIONS.SET_MEMBER: {
      const { memberType, index, partial } = action.payload;
      const updatedMembers = { ...state.plan.members };
      updatedMembers[memberType] = [...updatedMembers[memberType]];
      
      // Ensure array has enough elements for the index
      while (updatedMembers[memberType].length <= index) {
        updatedMembers[memberType].push({
          fullName: '',
          dob: '',
          gender: '',
          nationality: '',
          idNumber: ''
        });
      }
      
      updatedMembers[memberType][index] = {
        ...updatedMembers[memberType][index],
        ...partial
      };
      
      return {
        ...state,
        plan: {
          ...state.plan,
          members: updatedMembers
        }
      };
    }

    case ACTIONS.REBUILD_MEMBERS: {
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

      return {
        ...state,
        plan: {
          ...state.plan,
          members: newMembers
        }
      };
    }

    case ACTIONS.RECALC_TOTAL: {
      const { adult, child, infant } = state.plan.pax;
      
      // Use prices from API if provided, otherwise set to 0
      const prices = action.payload || { adult: null, child: null, infant: null };
      
      // Calculate totals only for non-null prices
      const adultTotal = prices.adult ? adult * prices.adult : 0;
      const childTotal = prices.child ? child * prices.child : 0;
      const infantTotal = prices.infant ? infant * prices.infant : 0;
      const total = adultTotal + childTotal + infantTotal;
      
      return {
        ...state,
        plan: {
          ...state.plan,
          price: {
            adult: adultTotal,
            child: childTotal,
            infant: infantTotal,
            total
          }
        }
      };
    }

    case ACTIONS.RESET_BOOKING:
      return initialState;

    case ACTIONS.SET_BOOKING_LOADING:
      return {
        ...state,
        booking: {
          ...state.booking,
          loading: action.payload,
          error: null
        }
      };

    case ACTIONS.SET_BOOKING_ERROR:
      return {
        ...state,
        booking: {
          ...state.booking,
          loading: false,
          error: action.payload,
          success: false
        }
      };

    case ACTIONS.SET_BOOKING_SUCCESS:
      return {
        ...state,
        booking: {
          ...state.booking,
          loading: false,
          error: null,
          success: true,
          bookingData: action.payload
        }
      };

    case ACTIONS.CLEAR_BOOKING_STATUS:
      return {
        ...state,
        booking: {
          ...state.booking,
          loading: false,
          error: null,
          success: false,
          bookingData: null
        }
      };

    default:
      return state;
  }
}
