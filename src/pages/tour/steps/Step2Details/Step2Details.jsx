import React, { useState, useEffect } from 'react';
import { useBooking } from '../../../../contexts/TourBookingContext';
import { PRICE, formatPrice } from '../../../../utils/priceRules';
import './Step2Details.css';

const Step2Details = () => {
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

  useEffect(() => {
    rebuildMembers();
    recalcTotal();
  }, [plan.pax, rebuildMembers, recalcTotal]);

  const computeEarliestDate = () => {
    const minAdvance = Number(plan?.minAdvancedDays ?? 0) || 0;
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    base.setDate(base.getDate() + minAdvance);
    return base;
  };

  const earliestDate = computeEarliestDate();

  useEffect(() => {
    const newErrors = {};

    if (!plan.date.day || !plan.date.month || !plan.date.year) {
      newErrors.date = 'Vui lòng chọn ngày khởi hành';
    } else {
      const selectedDate = new Date(plan.date.year, plan.date.month - 1, plan.date.day);
      const minDate = computeEarliestDate();
      if (selectedDate < minDate) {
        newErrors.date = `Vui lòng chọn ngày khởi hành từ ${minDate.toLocaleDateString('vi-VN')}`;
      } else {
        delete newErrors.date;
      }
    }

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
    switch (type) {
      case 'adult': return formatPrice(PRICE.ADULT);
      case 'child': return formatPrice(PRICE.CHILD);
      case 'infant': return formatPrice(PRICE.INFANT);
      default: return '0 VND';
    }
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

  return (
    <div className="details-form">
      <div className="form-section">
        <h3 className="section-title">Ngày khởi hành</h3>
        <div className="date-section">
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
              min={earliestDate.toISOString().split('T')[0]} // Không cho chọn trước Minimum Advance Days
              className={`form-input ${errors.date ? 'error' : ''}`}
            />
          </div>

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

      <div className="form-section">
        <h3 className="section-title">Tổng số khách</h3>
        <div className="pax-section">
          <div className="pax-card">
            <div className="pax-title">Người lớn</div>
            <div className="pax-price">{formatPrice(PRICE.ADULT)}</div>
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
            <div className="pax-price">{formatPrice(PRICE.CHILD)}</div>
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
            <div className="pax-price">{formatPrice(PRICE.INFANT)}</div>
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

      <div className="form-section">
        <h3 className="section-title">Danh sách đoàn</h3>
        <div className="members-section">
          {renderMemberForm('adult', plan.members.adult)}
          {renderMemberForm('child', plan.members.child)}
          {renderMemberForm('infant', plan.members.infant)}
        </div>
      </div>

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
    </div>
  );
};

export default Step2Details;
