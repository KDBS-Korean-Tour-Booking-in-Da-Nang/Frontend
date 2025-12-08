import React from 'react';
import { useBooking } from '../../../../contexts/TourBookingContext';
import { formatPrice } from '../../../../utils/priceRules';
import TourPreview from '../TourPreview/TourPreview';
import './Step3Review.css';

const Step3Review = () => {
  const { contact, plan } = useBooking();

  const formatDate = (dateObj) => {
    if (!dateObj.day || !dateObj.month || !dateObj.year) {
      return 'Chưa chọn ngày';
    }
    return `${dateObj.day.toString().padStart(2, '0')}/${dateObj.month.toString().padStart(2, '0')}/${dateObj.year}`;
  };

  const formatGender = (gender) => {
    switch (gender) {
      case 'male': return 'Nam';
      case 'female': return 'Nữ';
      case 'other': return 'Khác';
      default: return 'Chưa chọn';
    }
  };

  const getMemberTypeLabel = (type) => {
    switch (type) {
      case 'adult': return 'Người lớn';
      case 'child': return 'Trẻ em';
      case 'infant': return 'Em bé';
      default: return type;
    }
  };

  const renderMembersTable = (memberType, members) => {
    if (members.length === 0) return null;

    return (
      <div key={memberType} className="review-section">
        <h4 className="review-title">
          {getMemberTypeLabel(memberType)} ({members.length} người)
        </h4>
        <table className="members-table">
          <thead>
            <tr>
              <th>STT</th>
              <th>Họ và tên</th>
              <th>Ngày sinh</th>
              <th>Giới tính</th>
              <th>Quốc tịch</th>
              <th>Số ID/Passport</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member, index) => (
              <tr key={`${memberType}-${index}`}>
                <td>{index + 1}</td>
                <td>{member.fullName || 'Chưa nhập'}</td>
                <td>{member.dob || 'Chưa nhập'}</td>
                <td>{formatGender(member.gender)}</td>
                <td>{member.nationality || 'Chưa nhập'}</td>
                <td>{member.idNumber || 'Chưa nhập'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Confirmation is handled by parent component

  return (
    <div className="review-form">
      {/* Tour Preview */}
      <TourPreview />
      
      {/* Contact Information Review */}
      <div className="review-section">
        <h3 className="review-title">Thông tin liên hệ</h3>
        <div className="review-grid">
          <div className="review-item">
            <span className="review-label">Họ và tên</span>
            <span className="review-value">{contact.fullName}</span>
          </div>
          <div className="review-item">
            <span className="review-label">Số điện thoại</span>
            <span className="review-value">{contact.phone}</span>
          </div>
          <div className="review-item">
            <span className="review-label">Email</span>
            <span className="review-value">{contact.email}</span>
          </div>
          <div className="review-item">
            <span className="review-label">Địa chỉ</span>
            <span className="review-value">{contact.address}</span>
          </div>
          {contact.pickupPoint && (
            <div className="review-item">
              <span className="review-label">Điểm đón</span>
              <span className="review-value">{contact.pickupPoint}</span>
            </div>
          )}
          {contact.note && (
            <div className="review-item" style={{ gridColumn: '1 / -1' }}>
              <span className="review-label">Ghi chú</span>
              <span className="review-value">{contact.note}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tour Details Review */}
      <div className="review-section">
        <h3 className="review-title">Thông tin tour</h3>
        <div className="review-grid">
          <div className="review-item">
            <span className="review-label">Ngày khởi hành</span>
            <span className="review-value">{formatDate(plan.date)}</span>
          </div>
          <div className="review-item">
            <span className="review-label">Tổng số khách</span>
            <span className="review-value">
              {plan.pax.adult + plan.pax.child + plan.pax.infant} người
            </span>
          </div>
          <div className="review-item">
            <span className="review-label">Người lớn</span>
            <span className="review-value">{plan.pax.adult} người</span>
          </div>
          <div className="review-item">
            <span className="review-label">Trẻ em</span>
            <span className="review-value">{plan.pax.child} người</span>
          </div>
          <div className="review-item">
            <span className="review-label">Em bé</span>
            <span className="review-value">{plan.pax.infant} người</span>
          </div>
        </div>
      </div>

      {/* Members List Review */}
      <div className="form-section">
        <h3 className="section-title">Danh sách đoàn</h3>
        {renderMembersTable('adult', plan.members.adult)}
        {renderMembersTable('child', plan.members.child)}
        {renderMembersTable('infant', plan.members.infant)}
      </div>

      {/* Price Summary Review */}
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

export default Step3Review;
