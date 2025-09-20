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
          if (currentMembers[i]) {
            newMembers[type].push(currentMembers[i]);
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
      const PRICE = { ADULT: 1000000, CHILD: 700000, INFANT: 200000 };
      const total = adult * PRICE.ADULT + child * PRICE.CHILD + infant * PRICE.INFANT;
      
      return {
        ...state,
        plan: {
          ...state.plan,
          price: {
            adult: adult * PRICE.ADULT,
            child: child * PRICE.CHILD,
            infant: infant * PRICE.INFANT,
            total
          }
        }
      };
    }

    case ACTIONS.RESET_BOOKING:
      return initialState;

    default:
      return state;
  }
}
