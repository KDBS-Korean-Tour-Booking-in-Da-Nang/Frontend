import { ACTIONS, initialState } from './TourBookingConstants';

// Reducer function: xử lý tất cả các action types để cập nhật booking state (contact, plan, members, price, booking status)
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

    // Giảm số lượng pax: đảm bảo adult count không bao giờ xuống dưới 1, chỉ giảm nếu > 0
    case ACTIONS.DECREMENT_PAX: {
      const { type: decrementType } = action.payload;
      const updatedPax = { ...state.plan.pax };
      
      if (decrementType === 'adult' && updatedPax[decrementType] <= 1) {
        return state;
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

    // Set member info: đảm bảo array có đủ elements cho index (push empty member nếu thiếu), update member tại index với partial data
    case ACTIONS.SET_MEMBER: {
      const { memberType, index, partial } = action.payload;
      const updatedMembers = { ...state.plan.members };
      updatedMembers[memberType] = [...updatedMembers[memberType]];
      
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

    // Rebuild members arrays dựa trên current pax counts: giữ existing members đến target count, thêm empty member mới nếu thiếu
    case ACTIONS.REBUILD_MEMBERS: {
      const { pax } = state.plan;
      const newMembers = {
        adult: [],
        child: [],
        infant: []
      };

      ['adult', 'child', 'infant'].forEach(type => {
        const currentMembers = state.plan.members[type] || [];
        const targetCount = pax[type];
        
        for (let i = 0; i < targetCount; i++) {
          const currentMember = currentMembers[i];
          
          if (currentMember && currentMember !== undefined && currentMember !== null) {
            newMembers[type].push(currentMember);
          } else {
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

    // Tính lại tổng tiền: dùng prices từ API nếu có, tính totals chỉ cho non-null prices, tổng = adultTotal + childTotal + infantTotal
    case ACTIONS.RECALC_TOTAL: {
      const { adult, child, infant } = state.plan.pax;
      
      const prices = action.payload || { adult: null, child: null, infant: null };
      
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
