import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Mock data dựa trên hình ảnh và mở rộng
const mockTours = [
  // Tour trong nước
  {
    id: 1,
    title: "Tour Teambuilding Gala Huế",
    duration: "3 NGÀY",
    price: 3950000,
    image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=300&fit=crop",
    description: "Tour teambuilding đặc biệt tại Huế với các hoạt động gắn kết đội nhóm, tham quan cung đình và trải nghiệm ẩm thực cung đình",
    category: "domestic",
    featured: false
  },
  {
    id: 2,
    title: "Tour ghép Đà Nẵng Miền Tây",
    duration: "4 NGÀY",
    price: 7299000,
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop",
    description: "Khám phá vùng đất miền Tây sông nước với chợ nổi Cái Răng, vườn trái cây và đời sống người dân địa phương",
    category: "domestic",
    featured: false
  },
  {
    id: 3,
    title: "Tour ghép Đà Nẵng đi Sapa Hạ Long",
    duration: "4 NGÀY",
    price: 7299000,
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop",
    description: "Khám phá Sapa với ruộng bậc thang và Vịnh Hạ Long - kỳ quan thiên nhiên thế giới",
    category: "domestic",
    featured: false
  },
  {
    id: 4,
    title: "Tour ghép Đà Nẵng Hà Giang Cao Bằng",
    duration: "4 NGÀY",
    price: 7199000,
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop",
    description: "Khám phá Hà Giang với cột cờ Lũng Cú và Cao Bằng với thác Bản Giốc hùng vĩ",
    category: "domestic",
    featured: false
  },
  {
    id: 5,
    title: "Tour Đà Nẵng - Hội An - Bà Nà",
    duration: "3 NGÀY",
    price: 4999000,
    image: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=300&fit=crop",
    description: "Tour trọn gói khám phá Đà Nẵng, phố cổ Hội An và cầu Vàng Bà Nà Hills",
    category: "domestic",
    featured: true
  },
  {
    id: 6,
    title: "Tour Nha Trang - Đà Lạt",
    duration: "5 NGÀY",
    price: 8999000,
    image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop",
    description: "Kết hợp biển đảo Nha Trang và cao nguyên Đà Lạt mát mẻ",
    category: "domestic",
    featured: false
  },
  {
    id: 7,
    title: "Tour Phú Quốc - Đảo Ngọc",
    duration: "4 NGÀY",
    price: 7999000,
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop",
    description: "Khám phá đảo Phú Quốc với bãi biển đẹp và ẩm thực hải sản tươi ngon",
    category: "domestic",
    featured: false
  },
  {
    id: 8,
    title: "Tour Côn Đảo - Hòn Đảo Lịch Sử",
    duration: "3 NGÀY",
    price: 6999000,
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop",
    description: "Tham quan di tích lịch sử và tận hưởng thiên nhiên hoang sơ tại Côn Đảo",
    category: "domestic",
    featured: false
  },

  // Tour nước ngoài
  {
    id: 9,
    title: "Tour Lệ Giang Shangrila",
    duration: "5 NGÀY",
    price: 17990000,
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop",
    description: "Khám phá vẻ đẹp thiên nhiên hùng vĩ của Lệ Giang và Shangrila - thiên đường trên mặt đất",
    category: "international",
    featured: false
  },
  {
    id: 10,
    title: "Tour Hồng Kông đi từ Đà Nẵng",
    duration: "4 NGÀY",
    price: 17990000,
    image: "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=400&h=300&fit=crop",
    description: "Khám phá Hong Kong - thành phố không bao giờ ngủ với Disneyland và Victoria Peak",
    category: "international",
    featured: false
  },
  {
    id: 11,
    title: "Tour Đà Nẵng đi Nhật Bản tết âm lịch",
    duration: "6 NGÀY",
    price: 34990000,
    image: "https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=400&h=300&fit=crop",
    description: "Trải nghiệm Tết âm lịch tại Nhật Bản với hoa anh đào và văn hóa truyền thống",
    category: "international",
    featured: true
  },
  {
    id: 12,
    title: "Tour Hàn Quốc đi tết âm lịch từ Đà Nẵng",
    duration: "5 NGÀY",
    price: 14990000,
    image: "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=400&h=300&fit=crop",
    description: "Trải nghiệm văn hóa Hàn Quốc trong dịp Tết âm lịch với Seoul và Busan",
    category: "international",
    featured: false
  },
  {
    id: 13,
    title: "Tour Đà Nẵng Singapore Indonesia Malaysia",
    duration: "6 NGÀY",
    price: 13990000,
    image: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=400&h=300&fit=crop",
    description: "Tour đa quốc gia khám phá 3 nước Đông Nam Á với Singapore, Bali và Kuala Lumpur",
    category: "international",
    featured: false
  },
  {
    id: 14,
    title: "Tour Bắc Kinh Thượng Hải Ô Trấn Hàng Châu",
    duration: "8 NGÀY",
    price: 21490000,
    image: "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=400&h=300&fit=crop",
    description: "Khám phá Trung Quốc với các thành phố nổi tiếng: Bắc Kinh, Thượng Hải, Ô Trấn và Hàng Châu",
    category: "international",
    featured: false
  },
  {
    id: 15,
    title: "Tour Đà Nẵng Trung Quốc",
    duration: "7 NGÀY",
    price: 23990000,
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop",
    description: "Tour Trung Quốc với Vạn Lý Trường Thành, Tử Cấm Thành và Thiên An Môn",
    category: "international",
    featured: false
  },
  {
    id: 16,
    title: "Tour Thái Lan - Bangkok Pattaya",
    duration: "5 NGÀY",
    price: 12990000,
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop",
    description: "Khám phá Bangkok với chùa Vàng và Pattaya với các hoạt động biển",
    category: "international",
    featured: false
  },
  {
    id: 17,
    title: "Tour Đài Loan - Đảo Đài Loan",
    duration: "6 NGÀY",
    price: 18990000,
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop",
    description: "Khám phá Đài Loan với Đài Bắc, Đài Trung và các điểm du lịch nổi tiếng",
    category: "international",
    featured: false
  },
  {
    id: 18,
    title: "Tour Châu Âu - Pháp Ý Thụy Sĩ",
    duration: "12 NGÀY",
    price: 89990000,
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop",
    description: "Tour Châu Âu cao cấp khám phá Paris, Rome, Florence và dãy Alps Thụy Sĩ",
    category: "international",
    featured: true
  },

  // Tour trong ngày
  {
    id: 19,
    title: "Vé pháo hoa Đà Nẵng",
    duration: "1 NGÀY",
    price: 1000000,
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop",
    description: "Vé xem Lễ hội pháo hoa quốc tế Đà Nẵng 2024 với các đội thi đấu từ khắp thế giới",
    category: "day-tour",
    featured: true
  },
  {
    id: 20,
    title: "Tour Bà Nà Hills 1 ngày",
    duration: "1 NGÀY",
    price: 1500000,
    image: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=300&fit=crop",
    description: "Khám phá Bà Nà Hills với cầu Vàng, làng Pháp và các trò chơi giải trí",
    category: "day-tour",
    featured: false
  },
  {
    id: 21,
    title: "Tour Hội An 1 ngày",
    duration: "1 NGÀY",
    price: 1200000,
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop",
    description: "Tham quan phố cổ Hội An với kiến trúc cổ kính và ẩm thực địa phương",
    category: "day-tour",
    featured: false
  },
  {
    id: 22,
    title: "Tour Cù Lao Chàm 1 ngày",
    duration: "1 NGÀY",
    price: 1800000,
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop",
    description: "Khám phá đảo Cù Lao Chàm với lặn biển, tắm biển và ẩm thực hải sản",
    category: "day-tour",
    featured: false
  },
  {
    id: 23,
    title: "Tour Huế 1 ngày",
    duration: "1 NGÀY",
    price: 1300000,
    image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=300&fit=crop",
    description: "Tham quan cung đình Huế, lăng tẩm và trải nghiệm ẩm thực cung đình",
    category: "day-tour",
    featured: false
  },
  {
    id: 24,
    title: "Tour Đà Nẵng City Tour",
    duration: "1 NGÀY",
    price: 800000,
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop",
    description: "City tour Đà Nẵng với chùa Linh Ứng, bãi biển Mỹ Khê và cầu Rồng",
    category: "day-tour",
    featured: false
  }
];

// Simple action để load tours
export const loadTours = () => (dispatch) => {
  dispatch(setTours(mockTours));
};

// Simple action để load tours theo category
export const loadToursByCategory = (category) => (dispatch) => {
  const filteredTours = category === 'all' 
    ? mockTours 
    : mockTours.filter(tour => tour.category === category);
  dispatch(setFilteredTours(filteredTours));
  dispatch(setCurrentCategory(category));
};

const initialState = {
  tours: [],
  filteredTours: [],
  selectedTour: null,
  loading: false,
  error: null,
  currentCategory: 'all',
  searchQuery: ''
};

const tourSlice = createSlice({
  name: 'tours',
  initialState,
  reducers: {
    setTours: (state, action) => {
      state.tours = action.payload;
      state.filteredTours = action.payload;
      state.loading = false;
    },
    setFilteredTours: (state, action) => {
      state.filteredTours = action.payload;
    },
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
      // Filter tours based on search query
      if (action.payload.trim() === '') {
        state.filteredTours = state.tours;
      } else {
        state.filteredTours = state.tours.filter(tour =>
          tour.title.toLowerCase().includes(action.payload.toLowerCase()) ||
          tour.description.toLowerCase().includes(action.payload.toLowerCase())
        );
      }
    },
    setCurrentCategory: (state, action) => {
      state.currentCategory = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    setSelectedTour: (state, action) => {
      state.selectedTour = action.payload;
    }
  }
});

export const { setTours, setFilteredTours, setSearchQuery, setCurrentCategory, setLoading, clearError, setSelectedTour } = tourSlice.actions;
export default tourSlice.reducer;
