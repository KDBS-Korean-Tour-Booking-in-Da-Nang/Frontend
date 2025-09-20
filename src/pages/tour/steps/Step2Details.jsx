import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useBooking } from '../../../contexts/TourBookingContext';
import { formatPrice } from '../../../utils/priceRules';
import './Step2Details.css';

const Step2Details = () => {
  const { id: tourId } = useParams();
  const { 
    plan, 
    setDate, 
    incrementPax, 
    decrementPax, 
    setMember, 
    rebuildMembers, 
    recalcTotal 
  } = useBooking();

  const [errors, setErrors] = useState({});
  const [confirmedNationalities, setConfirmedNationalities] = useState({});
  const [tourPrices, setTourPrices] = useState({
    adult: null,
    child: null,
    infant: null
  });
  const [loading, setLoading] = useState(true);

  // Fetch tour data and prices
  const loadTourPrices = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch tour data directly (public endpoint)
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
      
      const response = await fetch(`${API_BASE_URL}/api/tour/${tourId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const tourData = await response.json();
      console.log('Raw tour data from API:', tourData); // Debug log
      
       // Extract prices from tour data - only use real prices from database
       const prices = {
         adult: tourData.adultPrice !== null && tourData.adultPrice !== undefined ? Number(tourData.adultPrice) : null,
         child: tourData.childrenPrice !== null && tourData.childrenPrice !== undefined ? Number(tourData.childrenPrice) : null,
         infant: tourData.babyPrice !== null && tourData.babyPrice !== undefined ? Number(tourData.babyPrice) : null
       };
      
      console.log('Extracted prices:', {
        adultPrice: tourData.adultPrice,
        childrenPrice: tourData.childrenPrice,
        babyPrice: tourData.babyPrice,
        processed: prices
      }); // Debug log
      
       // Check if prices are null or 0
       if (tourData.adultPrice === null || tourData.adultPrice === undefined) {
         console.warn('⚠️ Adult price is null:', tourData.adultPrice);
       } else if (tourData.adultPrice === 0) {
         console.info('ℹ️ Adult price is 0 (Miễn phí):', tourData.adultPrice);
       }
       if (tourData.childrenPrice === null || tourData.childrenPrice === undefined) {
         console.warn('⚠️ Children price is null:', tourData.childrenPrice);
       } else if (tourData.childrenPrice === 0) {
         console.info('ℹ️ Children price is 0 (Miễn phí):', tourData.childrenPrice);
       }
       if (tourData.babyPrice === null || tourData.babyPrice === undefined) {
         console.warn('⚠️ Baby price is null:', tourData.babyPrice);
       } else if (tourData.babyPrice === 0) {
         console.info('ℹ️ Baby price is 0 (Miễn phí):', tourData.babyPrice);
       }
      
      setTourPrices(prices);
      console.log('Tour prices loaded:', prices); // Debug log
    } catch (error) {
      console.error('Error loading tour prices:', error);
      
      // Set prices to null if API fails - no fallback prices
      setTourPrices({
        adult: null,
        child: null,
        infant: null
      });
    } finally {
      setLoading(false);
    }
  }, [tourId]);

  useEffect(() => {
    if (tourId) {
      loadTourPrices();
    }
  }, [tourId, loadTourPrices]);

  // Update members when pax changes
  useEffect(() => {
    rebuildMembers();
  }, [plan.pax, rebuildMembers]);

  // Recalculate total when prices or pax change
  useEffect(() => {
    // Only recalculate if we have real prices from database
    if (tourPrices.adult !== null || tourPrices.child !== null || tourPrices.infant !== null) {
      recalcTotal(tourPrices);
    }
  }, [plan.pax, tourPrices, recalcTotal]);

  // Validate form
  useEffect(() => {
    const newErrors = {};

    // Check date
    if (!plan.date.day || !plan.date.month || !plan.date.year) {
      newErrors.date = 'Vui lòng chọn ngày khởi hành';
    } else {
      const selectedDate = new Date(plan.date.year, plan.date.month - 1, plan.date.day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        newErrors.date = 'Không thể chọn ngày trong quá khứ';
      } else {
        delete newErrors.date;
      }
    }

    // Check members
    const allMembers = [
      ...plan.members.adult,
      ...plan.members.child,
      ...plan.members.infant
    ];

    allMembers.forEach((member, index) => {
      if (!member.fullName.trim()) {
        newErrors[`member_${index}_name`] = 'Họ tên là bắt buộc';
      }
      if (!member.dob) {
        newErrors[`member_${index}_dob`] = 'Ngày sinh là bắt buộc';
      }
    });

    setErrors(newErrors);
  }, [plan.date, plan.members]);

  const handlePaxChange = (type, action) => {
    if (action === 'increment') {
      incrementPax(type);
    } else if (action === 'decrement') {
      // Prevent adult count from going below 1
      if (type === 'adult' && plan.pax.adult <= 1) {
        return;
      }
      decrementPax(type);
    }
  };

  const handleMemberChange = (memberType, index, field, value) => {
    setMember(memberType, index, { [field]: value });
  };

  const handleNationalityChange = (memberType, index, value) => {
    handleMemberChange(memberType, index, 'nationality', value);
    // Clear confirmed nationality when user types
    const key = `${memberType}-${index}`;
    setConfirmedNationalities(prev => {
      const newState = { ...prev };
      delete newState[key];
      return newState;
    });
  };

  const handleNationalityConfirm = (memberType, index, value) => {
    const key = `${memberType}-${index}`;
    setConfirmedNationalities(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getMemberTypeLabel = (type) => {
    switch (type) {
      case 'adult': return 'Người lớn';
      case 'child': return 'Trẻ em';
      case 'infant': return 'Em bé';
      default: return type;
    }
  };

  const getMemberTypePrice = (type) => {
    const price = (() => {
      switch (type) {
        case 'adult': return tourPrices.adult;
        case 'child': return tourPrices.child;
        case 'infant': return tourPrices.infant;
        default: return null;
      }
    })();
    
    const formattedPrice = (() => {
      if (price === null) return 'Chưa có giá';
      if (price === 0) return 'Miễn phí';
      return formatPrice(price);
    })();
    console.log(`Price for ${type}:`, price, 'Formatted:', formattedPrice); // Debug log
    
    if (price === null) return 'Chưa có giá';
    if (price === 0) return 'Miễn phí';
    return formatPrice(price);
  };

  const renderMemberForm = (memberType, members) => {
    if (members.length === 0) return null;

    return (
      <div key={memberType} className="member-group">
        <h4 className="member-group-title">
          {`${getMemberTypeLabel(memberType)} (${members.length} người) - ${getMemberTypePrice(memberType)}`}
        </h4>
        {members.map((member, index) => (
          <div key={`${memberType}-${index}`} className="member-card">
            <div className="member-title">
              {`${getMemberTypeLabel(memberType)} ${index + 1}`}
            </div>
            <div className="member-form">
              <div className="form-group">
                <label htmlFor={`${memberType}-${index}-fullName`} className="form-label required">Họ và tên</label>
                <input
                  type="text"
                  id={`${memberType}-${index}-fullName`}
                  value={member.fullName}
                  onChange={(e) => handleMemberChange(memberType, index, 'fullName', e.target.value)}
                  className={errors[`member_${index}_name`] ? 'form-input error' : 'form-input'}
                  placeholder="Nhập họ và tên"
                />
                {errors[`member_${index}_name`] && (
                  <span className="form-error">{errors[`member_${index}_name`]}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor={`${memberType}-${index}-dob`} className="form-label required">Ngày sinh</label>
                <input
                  type="date"
                  id={`${memberType}-${index}-dob`}
                  value={member.dob}
                  onChange={(e) => handleMemberChange(memberType, index, 'dob', e.target.value)}
                  className={errors[`member_${index}_dob`] ? 'form-input error' : 'form-input'}
                />
                {errors[`member_${index}_dob`] && (
                  <span className="form-error">{errors[`member_${index}_dob`]}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor={`${memberType}-${index}-gender`} className="form-label">Giới tính</label>
                <select
                  id={`${memberType}-${index}-gender`}
                  value={member.gender}
                  onChange={(e) => handleMemberChange(memberType, index, 'gender', e.target.value)}
                  className="form-select"
                >
                  <option value="">Chọn giới tính</option>
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                  <option value="other">Khác</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor={`${memberType}-${index}-nationality`} className="form-label">Quốc tịch</label>
                <input
                  type="text"
                  id={`${memberType}-${index}-nationality`}
                  value={member.nationality}
                  onChange={(e) => handleNationalityChange(memberType, index, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleNationalityConfirm(memberType, index, e.target.value);
                    }
                  }}
                  className="form-input"
                  placeholder="VD: Việt Nam (Nhấn Enter để xác nhận)"
                />
              </div>

              {/* Dynamic ID/Passport field based on confirmed nationality */}
              {confirmedNationalities[`${memberType}-${index}`] && (
                <div className="form-group">
                  <label htmlFor={`${memberType}-${index}-idNumber`} className="form-label">
                    {confirmedNationalities[`${memberType}-${index}`].toLowerCase() === 'việt nam' || confirmedNationalities[`${memberType}-${index}`].toLowerCase() === 'vietnam' 
                      ? 'Số căn cước công dân' 
                      : 'Số hộ chiếu'
                    }
                  </label>
                  <input
                    type="text"
                    id={`${memberType}-${index}-idNumber`}
                    value={member.idNumber}
                    onChange={(e) => handleMemberChange(memberType, index, 'idNumber', e.target.value)}
                    className="form-input"
                    placeholder={
                      confirmedNationalities[`${memberType}-${index}`].toLowerCase() === 'việt nam' || confirmedNationalities[`${memberType}-${index}`].toLowerCase() === 'vietnam'
                        ? 'Nhập số căn cước công dân'
                        : 'Nhập số hộ chiếu'
                    }
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Show loading state while fetching tour prices
  if (loading) {
    return (
      <div className="details-form">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Đang tải thông tin giá tour...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="details-form">
      {/* Date Selection */}
      <div className="form-section">
        <h3 className="section-title">Ngày khởi hành</h3>
        <div className="date-section">
          {/* Date Picker Input */}
          <div className="date-picker-group">
            <label htmlFor="departureDate" className="form-label required">Chọn ngày khởi hành</label>
            <input
              type="date"
              id="departureDate"
              value={plan.date.year && plan.date.month && plan.date.day 
                ? `${plan.date.year}-${plan.date.month.toString().padStart(2, '0')}-${plan.date.day.toString().padStart(2, '0')}`
                : ''
              }
              onChange={(e) => {
                const dateValue = e.target.value;
                if (dateValue) {
                  const [year, month, day] = dateValue.split('-');
                  setDate({
                    year: parseInt(year),
                    month: parseInt(month),
                    day: parseInt(day)
                  });
                } else {
                  setDate({ day: null, month: null, year: null });
                }
              }}
              min={new Date().toISOString().split('T')[0]} // Không cho chọn ngày trong quá khứ
              className={`form-input ${errors.date ? 'error' : ''}`}
            />
          </div>

          {/* Display Selected Date in 3 separate boxes */}
          {plan.date.day && plan.date.month && plan.date.year && (
            <div className="date-display-section">
              <div className="date-display-group">
                <div className="form-label required">Ngày</div>
                <div className="date-display-box">
                  {plan.date.day}
                </div>
              </div>

              <div className="date-display-group">
                <div className="form-label required">Tháng</div>
                <div className="date-display-box">
                  {plan.date.month}
                </div>
              </div>

              <div className="date-display-group">
                <div className="form-label required">Năm</div>
                <div className="date-display-box">
                  {plan.date.year}
                </div>
              </div>
            </div>
          )}

          {errors.date && (
            <span className="form-error">{errors.date}</span>
          )}
        </div>
      </div>

      {/* Pax Counter */}
      <div className="form-section">
        <h3 className="section-title">Tổng số khách</h3>
        <div className="pax-section">
           <div className="pax-card">
             <div className="pax-title">Người lớn</div>
             <div className="pax-price">
               {(() => {
                 if (tourPrices.adult === null) return 'Chưa có giá';
                 if (tourPrices.adult === 0) return 'Miễn phí';
                 return formatPrice(tourPrices.adult);
               })()}
             </div>
             {/* Debug: {console.log('Adult price in render:', tourPrices.adult)} */}
            <div className="pax-counter">
              <button
                className="pax-button decrement"
                onClick={() => handlePaxChange('adult', 'decrement')}
                disabled={plan.pax.adult <= 1}
                title={plan.pax.adult <= 1 ? "Cần ít nhất 1 người lớn" : ""}
              >
                -
              </button>
              <span className="pax-count">{plan.pax.adult}</span>
              <button
                className="pax-button increment"
                onClick={() => handlePaxChange('adult', 'increment')}
              >
                +
              </button>
            </div>
          </div>

           <div className="pax-card">
             <div className="pax-title">Trẻ em</div>
             <div className="pax-price">
               {(() => {
                 if (tourPrices.child === null) return 'Chưa có giá';
                 if (tourPrices.child === 0) return 'Miễn phí';
                 return formatPrice(tourPrices.child);
               })()}
             </div>
            <div className="pax-counter">
              <button
                className="pax-button decrement"
                onClick={() => handlePaxChange('child', 'decrement')}
                disabled={plan.pax.child <= 0}
              >
                -
              </button>
              <span className="pax-count">{plan.pax.child}</span>
              <button
                className="pax-button increment"
                onClick={() => handlePaxChange('child', 'increment')}
              >
                +
              </button>
            </div>
          </div>

           <div className="pax-card">
             <div className="pax-title">Em bé</div>
             <div className="pax-price">
               {(() => {
                 if (tourPrices.infant === null) return 'Chưa có giá';
                 if (tourPrices.infant === 0) return 'Miễn phí';
                 return formatPrice(tourPrices.infant);
               })()}
             </div>
            <div className="pax-counter">
              <button
                className="pax-button decrement"
                onClick={() => handlePaxChange('infant', 'decrement')}
                disabled={plan.pax.infant <= 0}
              >
                -
              </button>
              <span className="pax-count">{plan.pax.infant}</span>
              <button
                className="pax-button increment"
                onClick={() => handlePaxChange('infant', 'increment')}
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Members List */}
      <div className="form-section">
        <h3 className="section-title">Danh sách đoàn</h3>
        <div className="members-section">
          {renderMemberForm('adult', plan.members.adult)}
          {renderMemberForm('child', plan.members.child)}
          {renderMemberForm('infant', plan.members.infant)}
        </div>
      </div>

      {/* Price Summary */}
      <div className="price-summary">
        <div className="price-breakdown">
          {plan.pax.adult > 0 && (
            <div className="price-item">
              <span className="price-label">Người lớn ({plan.pax.adult} người)</span>
              <span className="price-value">{formatPrice(plan.price.adult)}</span>
            </div>
          )}
          {plan.pax.child > 0 && (
            <div className="price-item">
              <span className="price-label">Trẻ em ({plan.pax.child} người)</span>
              <span className="price-value">{formatPrice(plan.price.child)}</span>
            </div>
          )}
          {plan.pax.infant > 0 && (
            <div className="price-item">
              <span className="price-label">Em bé ({plan.pax.infant} người)</span>
              <span className="price-value">{formatPrice(plan.price.infant)}</span>
            </div>
          )}
        </div>
        <div className="price-total">
          <span className="price-total-label">Tổng thanh toán</span>
          <span className="price-total-value">{formatPrice(plan.price.total)}</span>
        </div>
      </div>

      {/* Navigation is handled by parent component */}
    </div>
  );
};

// No props needed - navigation handled by parent

export default Step2Details;
