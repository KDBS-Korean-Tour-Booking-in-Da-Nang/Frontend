import { createSlice } from '@reduxjs/toolkit';

// Trạng thái ban đầu cho quá trình đặt tour
// Bao gồm thông tin liên hệ, kế hoạch tour (ngày, số lượng người, thành viên, giá) và trạng thái booking
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
    
    // Giảm số lượng người theo loại (người lớn, trẻ em, trẻ sơ sinh)
    // Đảm bảo số người lớn không bao giờ dưới 1 (yêu cầu tối thiểu)
    decrementPax: (state, action) => {
      const { type: decrementType } = action.payload;
      
      // Nếu là người lớn và số lượng đã <= 1, không cho phép giảm thêm
      if (decrementType === 'adult' && state.plan.pax[decrementType] <= 1) {
        return;
      }
      
      // Chỉ giảm nếu số lượng hiện tại > 0
      if (state.plan.pax[decrementType] > 0) {
        state.plan.pax[decrementType] -= 1;
      }
    },
    
    // Cập nhật thông tin thành viên theo loại và chỉ số
    // Tự động mở rộng mảng nếu chỉ số vượt quá độ dài hiện tại để tránh lỗi
    setMember: (state, action) => {
      const { memberType, index, partial } = action.payload;
      
      // Đảm bảo mảng có đủ phần tử cho chỉ số được chỉ định
      while (state.plan.members[memberType].length <= index) {
        state.plan.members[memberType].push({
          fullName: '',
          dob: '',
          gender: '',
          nationality: '',
          idNumber: ''
        });
      }
      
      // Cập nhật thông tin thành viên bằng cách merge với dữ liệu mới
      state.plan.members[memberType][index] = {
        ...state.plan.members[memberType][index],
        ...partial
      };
    },
    
    // Xây dựng lại danh sách thành viên dựa trên số lượng người hiện tại (pax)
    // Giữ lại thông tin thành viên hiện có, thêm thành viên mới nếu thiếu
    rebuildMembers: (state) => {
      const { pax } = state.plan;
      const newMembers = {
        adult: [],
        child: [],
        infant: []
      };

      // Xử lý từng loại thành viên (người lớn, trẻ em, trẻ sơ sinh)
      ['adult', 'child', 'infant'].forEach(type => {
        const currentMembers = state.plan.members[type] || [];
        const targetCount = pax[type];
        
        // Tạo danh sách thành viên với số lượng bằng targetCount
        for (let i = 0; i < targetCount; i++) {
          const currentMember = currentMembers[i];
          
          // Nếu đã có thông tin thành viên ở vị trí này, giữ lại
          if (currentMember && currentMember !== undefined && currentMember !== null) {
            newMembers[type].push(currentMember);
          } else {
            // Nếu chưa có, tạo thành viên mới với thông tin rỗng
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
    
    // Tính lại tổng tiền dựa trên số lượng người và giá từ API
    // Chỉ tính cho các loại có giá (không null), nếu không có giá thì = 0
    recalcTotal: (state, action) => {
      const { adult, child, infant } = state.plan.pax;
      
      // Nhận giá từ API, nếu không có thì mặc định null
      const prices = action.payload || { adult: null, child: null, infant: null };
      
      // Tính tổng cho từng loại: số lượng × giá (nếu có giá)
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
    
    // Khôi phục dữ liệu booking từ localStorage
    // Khôi phục theo batch để tránh vòng lặp vô hạn (không trigger các effect khác trong quá trình restore)
    restoreBookingData: (state, action) => {
      const { contact, plan } = action.payload;
      
      // Khôi phục thông tin liên hệ nếu có
      if (contact) {
        state.contact = { ...contact };
      }
      
      // Khôi phục kế hoạch tour nếu có
      if (plan) {
        if (plan.date) {
          state.plan.date = plan.date;
        }
        if (plan.pax) {
          state.plan.pax = { ...plan.pax };
        }
        // Khôi phục danh sách thành viên nếu có
        if (plan.members) {
          state.plan.members = {
            adult: Array.isArray(plan.members.adult) ? [...plan.members.adult] : [],
            child: Array.isArray(plan.members.child) ? [...plan.members.child] : [],
            infant: Array.isArray(plan.members.infant) ? [...plan.members.infant] : []
          };
        } else if (plan.pax) {
          // Nếu không có danh sách thành viên nhưng có số lượng người, tự động tạo danh sách rỗng
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
