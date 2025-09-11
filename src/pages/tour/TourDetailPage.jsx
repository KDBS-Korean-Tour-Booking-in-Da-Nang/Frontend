import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTours } from '../../hooks/useTours';
import './TourDetailPage.css';

const TourDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getTourById, tours } = useTours();
  
  const tour = getTourById(parseInt(id));

  useEffect(() => {
    if (!tour && tours.length > 0) {
      // Nếu không tìm thấy tour, redirect về trang tour list
      navigate('/tour');
    }
  }, [tour, tours, navigate]);

  if (!tour) {
    return (
      <div className="tour-detail-loading">
        <div className="loading-spinner"></div>
        <p>Đang tải thông tin tour...</p>
      </div>
    );
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const handleBookNow = () => {
    // TODO: Implement booking functionality
    alert('Tính năng đặt tour sẽ được phát triển!');
  };

  const handleBackToList = () => {
    navigate('/tour');
  };

  return (
    <div className="tour-detail-page">
      {/* Hero Section */}
      <div className="tour-hero-section">
        <div className="hero-background">
          <img src={tour.image} alt={tour.title} />
          <div className="hero-overlay"></div>
        </div>
        
        <div className="hero-content">
          <div className="container">
            <button onClick={handleBackToList} className="back-button">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Quay lại danh sách
            </button>
            
            <div className="hero-info">
              <div className="hero-badge">
                <span>Tour du lịch</span>
              </div>
              <h1 className="hero-title">{tour.title}</h1>
              <div className="hero-meta">
                <div className="meta-item">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{tour.duration}</span>
                </div>
                <div className="meta-item">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{tour.category === 'domestic' ? 'Trong nước' : tour.category === 'international' ? 'Nước ngoài' : 'Trong ngày'}</span>
                </div>
                <div className="meta-item">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  <span>4.8/5 (127 đánh giá)</span>
                </div>
              </div>
              <p className="hero-description">{tour.description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="tour-detail-content">
        <div className="container">
          <div className="tour-detail-grid">
            {/* Left Column - Content */}
            <div className="tour-detail-left">
              {/* Tour Overview */}
              <div className="tour-overview">
                <h2>Tổng quan tour</h2>
                <p>
                  {tour.title} là một trong những tour du lịch được yêu thích nhất của chúng tôi. 
                  Với lịch trình được thiết kế cẩn thận và đội ngũ hướng dẫn viên chuyên nghiệp, 
                  chúng tôi cam kết mang đến cho bạn những trải nghiệm tuyệt vời nhất.
                </p>
                <p>
                  Tour này được thiết kế đặc biệt để phù hợp với mọi lứa tuổi và sở thích. 
                  Từ những hoạt động thú vị đến những điểm tham quan nổi tiếng, 
                  bạn sẽ có cơ hội khám phá và trải nghiệm những điều tuyệt vời nhất.
                </p>
              </div>

              {/* Tour Highlights */}
              <div className="tour-highlights">
                <h2>Điểm nổi bật của tour</h2>
                <div className="highlights-grid">
                  <div className="highlight-item">
                    <div className="highlight-icon">🏛️</div>
                    <h3>Tham quan di tích lịch sử</h3>
                    <p>Khám phá những di tích lịch sử nổi tiếng với hướng dẫn viên chuyên nghiệp</p>
                  </div>
                  <div className="highlight-item">
                    <div className="highlight-icon">🍽️</div>
                    <h3>Ẩm thực địa phương</h3>
                    <p>Thưởng thức những món ăn đặc sản nổi tiếng của vùng đất này</p>
                  </div>
                  <div className="highlight-item">
                    <div className="highlight-icon">📸</div>
                    <h3>Chụp ảnh kỷ niệm</h3>
                    <p>Ghi lại những khoảnh khắc đáng nhớ tại các điểm check-in nổi tiếng</p>
                  </div>
                  <div className="highlight-item">
                    <div className="highlight-icon">🎁</div>
                    <h3>Mua sắm quà lưu niệm</h3>
                    <p>Thời gian tự do để mua sắm những món quà lưu niệm ý nghĩa</p>
                  </div>
                </div>
              </div>

              {/* Tour Itinerary */}
              <div className="tour-itinerary">
                <div className="itinerary-header">
                  <h2>ĐIỂM ĐẾN VÀ HÀNH TRÌNH</h2>
                </div>
                <div className="itinerary-list">
                  <div className="itinerary-item">
                    <div className="itinerary-day-header">
                      <span className="day-number">NGÀY 01</span>
                      <span className="day-destination">Sân bay - Cố đô Huế</span>
                    </div>
                    <div className="itinerary-content">
                      <div className="time-schedule">
                        <div className="time-item">
                          <span className="time">13h30:</span>
                          <span className="activity">Đón khách tại sân bay Đà Nẵng hoặc Huế, khởi hành đi Huế.</span>
                        </div>
                        <div className="time-item">
                          <span className="time">16h30:</span>
                          <span className="activity">Đến Huế, nhận phòng khách sạn, nghỉ ngơi.</span>
                        </div>
                        <div className="time-item">
                          <span className="time">18h00:</span>
                          <span className="activity">Ăn tối với các món đặc sản Huế, dạo phố Huế về đêm, nghỉ đêm tại Huế.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="itinerary-item">
                    <div className="itinerary-day-header">
                      <span className="day-number">NGÀY 02</span>
                      <span className="day-destination">Tham quan Huế - Thành phố Đồng Hới</span>
                    </div>
                    <div className="itinerary-content">
                      <div className="time-schedule">
                        <div className="time-item">
                          <span className="time">Sáng:</span>
                          <span className="activity">Ăn sáng, khởi hành tham quan Lăng Khải Định (kiến trúc độc đáo nhất trong các lăng tẩm triều Nguyễn).</span>
                        </div>
                        <div className="time-item">
                          <span className="time">Sau Lăng Khải Định:</span>
                          <span className="activity">Tham quan Kinh thành Huế (Ngọ Môn, Điện Thái Hòa, Cửu Đỉnh, v.v...).</span>
                        </div>
                        <div className="time-item">
                          <span className="time">11h00:</span>
                          <span className="activity">Về khách sạn, trả phòng.</span>
                        </div>
                        <div className="time-item">
                          <span className="time">12h00:</span>
                          <span className="activity">Ăn trưa tại nhà hàng. Mua sắm đặc sản Huế (nếu có nhu cầu).</span>
                        </div>
                        <div className="time-item">
                          <span className="time">13h30:</span>
                          <span className="activity">Khởi hành đi Thành phố Đồng Hới, nơi có những hang động đẹp nhất thế giới.</span>
                        </div>
                        <div className="time-item">
                          <span className="time">17h00:</span>
                          <span className="activity">Đến Đồng Hới, nhận phòng khách sạn, nghỉ ngơi.</span>
                        </div>
                        <div className="time-item">
                          <span className="time">19h00:</span>
                          <span className="activity">Hướng dẫn viên đưa đoàn đi ăn tối tại nhà hàng. Nghỉ đêm tại Đồng Hới.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="itinerary-item">
                    <div className="itinerary-day-header">
                      <span className="day-number">NGÀY 03</span>
                      <span className="day-destination">Động Thiên Đường - Thành phố Đà Nẵng</span>
                    </div>
                    <div className="itinerary-content">
                      <div className="time-schedule">
                        <div className="time-item">
                          <span className="time">Sáng:</span>
                          <span className="activity">Ăn sáng, trả phòng khách sạn.</span>
                        </div>
                        <div className="time-item">
                          <span className="time">07h45:</span>
                          <span className="activity">Khởi hành tham quan Động Thiên Đường, nằm trong Vườn quốc gia Phong Nha - Kẻ Bàng, cách Đồng Hới 70km về phía Tây.</span>
                        </div>
                        <div className="time-item">
                          <span className="time">09h00:</span>
                          <span className="activity">Đến Động Thiên Đường. Hướng dẫn viên hỗ trợ làm thủ tục vào cửa. Động Thiên Đường có nhiều nhũ đá, măng đá đẹp tạo nên không gian huyền ảo.</span>
                        </div>
                        <div className="time-item">
                          <span className="time">11h00:</span>
                          <span className="activity">Ăn trưa tại nhà hàng. Nghỉ ngơi và khởi hành về Đà Nẵng.</span>
                        </div>
                        <div className="time-item">
                          <span className="time">Tối:</span>
                          <span className="activity">Ăn tối tại nhà hàng. Đến Đà Nẵng, nhận phòng khách sạn, nghỉ ngơi.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="itinerary-item">
                    <div className="itinerary-day-header">
                      <span className="day-number">NGÀY 04</span>
                      <span className="day-destination">Đà Nẵng City tour - Sân bay</span>
                    </div>
                    <div className="itinerary-content">
                      <div className="time-schedule">
                        <div className="time-item">
                          <span className="time">Sáng:</span>
                          <span className="activity">Ăn sáng, tham quan thành phố Đà Nẵng.</span>
                        </div>
                        <div className="time-item">
                          <span className="time">Trưa:</span>
                          <span className="activity">Ăn trưa, mua sắm quà lưu niệm.</span>
                        </div>
                        <div className="time-item">
                          <span className="time">Chiều:</span>
                          <span className="activity">Đưa khách ra sân bay, kết thúc chương trình tour.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tour Gallery */}
              <div className="tour-gallery">
                <h2>Hình ảnh tour</h2>
                <div className="gallery-grid">
                  <div className="gallery-item">
                    <img src={tour.image} alt="Gallery 1" />
                    <div className="gallery-overlay">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="gallery-item">
                    <img src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=200&fit=crop" alt="Gallery 2" />
                    <div className="gallery-overlay">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="gallery-item">
                    <img src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=300&h=200&fit=crop" alt="Gallery 3" />
                    <div className="gallery-overlay">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="gallery-item">
                    <img src="https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=300&h=200&fit=crop" alt="Gallery 4" />
                    <div className="gallery-overlay">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Booking Info */}
            <div className="tour-detail-right">
              <div className="booking-card">
                <div className="booking-header">
                  <div className="price-section">
                    <span className="price-label">Giá tour</span>
                    <span className="price-amount">{formatPrice(tour.price)}</span>
                  </div>
                  <div className="price-note">
                    <span>Giá đã bao gồm thuế và phí dịch vụ</span>
                  </div>
                </div>

                <div className="booking-actions">
                  <button className="book-now-btn" onClick={handleBookNow}>
                    Đặt tour ngay
                  </button>
                  <button className="contact-btn">
                    Liên hệ tư vấn
                  </button>
                </div>

                <div className="booking-info">
                  <h4>Thông tin đặt tour</h4>
                  <ul>
                    <li>✓ Hỗ trợ đặt tour 24/7</li>
                    <li>✓ Thanh toán an toàn</li>
                    <li>✓ Hủy tour miễn phí 24h trước khởi hành</li>
                    <li>✓ Bảo hiểm du lịch miễn phí</li>
                    <li>✓ Hướng dẫn viên chuyên nghiệp</li>
                    <li>✓ Xe du lịch tiện nghi</li>
                  </ul>
                </div>

                <div className="contact-info">
                  <h4>Liên hệ đặt tour</h4>
                  <div className="contact-item">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>+84 236 247 5555</span>
                  </div>
                  <div className="contact-item">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>kinhdoanh@danangxanh.com</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TourDetailPage;
