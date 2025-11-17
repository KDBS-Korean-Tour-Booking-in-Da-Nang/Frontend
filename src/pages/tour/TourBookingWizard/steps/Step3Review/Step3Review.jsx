import React from 'react';
import { useTranslation } from 'react-i18next';
import { useBooking } from '../../../../../contexts/TourBookingContext';
import TourPreview from '../TourPreview/TourPreview';
import styles from './Step3Review.module.css';

const Step3Review = () => {
  const { contact, plan } = useBooking();
  const { t } = useTranslation();

  const formatDate = (dateObj) => {
    if (!dateObj.day || !dateObj.month || !dateObj.year) {
      return t('booking.step3.labels.notSet');
    }
    return `${dateObj.day.toString().padStart(2, '0')}/${dateObj.month.toString().padStart(2, '0')}/${dateObj.year}`;
  };

  const formatGender = (gender) => {
    switch (gender) {
      case 'male': return t('profile.genderOptions.male');
      case 'female': return t('profile.genderOptions.female');
      case 'other': return t('profile.genderOptions.other');
      default: return t('booking.step3.labels.notSet');
    }
  };

  const getMemberTypeLabel = (type) => {
    switch (type) {
      case 'adult': return t('booking.step3.labels.adult');
      case 'child': return t('booking.step3.labels.child');
      case 'infant': return t('booking.step3.labels.infant');
      default: return type;
    }
  };

  const formatNationality = (nationalityCode) => {
    if (!nationalityCode) return t('booking.step3.labels.notSet');
    
    // Get the translated country name using the same pattern as Step2Details
    const countryName = t(`booking.step2.countries.${nationalityCode}`);
    
    // If translation doesn't exist, return the code itself
    return countryName !== `booking.step2.countries.${nationalityCode}` ? countryName : nationalityCode;
  };

  const renderMembersTable = (memberType, members) => {
    if (members.length === 0) return null;

    return (
      <div key={memberType} className={styles['review-section']}>
        <h4 className={styles['review-title']}>
          {getMemberTypeLabel(memberType)} ({members.length})
        </h4>
        <table className={styles['members-table']}>
          <thead>
            <tr>
              <th>{t('booking.step3.table.index')}</th>
              <th>{t('booking.step3.table.fullName')}</th>
              <th>{t('booking.step3.table.dob')}</th>
              <th>{t('booking.step3.table.gender')}</th>
              <th>{t('booking.step3.table.nationality')}</th>
              <th>{t('booking.step3.table.idNumber')}</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member, index) => (
              <tr key={`${memberType}-${index}`}>
                <td>{index + 1}</td>
                <td>{member.fullName || t('booking.step3.labels.notSet')}</td>
                <td>{member.dob || t('booking.step3.labels.notSet')}</td>
                <td>{formatGender(member.gender)}</td>
                <td>{formatNationality(member.nationality)}</td>
                <td>{member.idNumber || t('booking.step3.labels.notSet')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Confirmation is handled by parent component

  return (
    <div className={styles['review-form']}>
      {/* Tour Preview */}
      <TourPreview />
      
      {/* Contact Information Review */}
      <div className={styles['review-section']}>
        <h3 className={styles['review-title']}>{t('booking.step3.sections.contact')}</h3>
        <div className={styles['review-grid']}>
          <div className={styles['review-item']}>
            <span className={styles['review-label']}>{t('booking.step3.labels.departureDate')}</span>
            <span className={styles['review-value']}>{formatDate(plan.date)}</span>
          </div>
          <div className={styles['review-item']}>
            <span className={styles['review-label']}>{t('booking.step3.labels.fullName')}</span>
            <span className={styles['review-value']}>{contact.fullName}</span>
          </div>
          <div className={styles['review-item']}>
            <span className={styles['review-label']}>{t('booking.step3.labels.phone')}</span>
            <span className={styles['review-value']}>{contact.phone}</span>
          </div>
          <div className={styles['review-item']}>
            <span className={styles['review-label']}>{t('booking.step3.labels.email')}</span>
            <span className={styles['review-value']}>{contact.email}</span>
          </div>
          <div className={styles['review-item']}>
            <span className={styles['review-label']}>{t('booking.step3.labels.address')}</span>
            <span className={styles['review-value']}>{contact.address}</span>
          </div>
          {contact.pickupPoint && (
            <div className={styles['review-item']} style={{}}>
              <span className={styles['review-label']}>{t('booking.step3.labels.pickupPoint')}</span>
              <span className={styles['review-value']}>{contact.pickupPoint}</span>
            </div>
          )}
          {contact.note && (
            <div className={styles['review-item']} style={{ gridColumn: '1 / -1' }}>
              <span className={styles['review-label']}>{t('booking.step3.labels.note')}</span>
              <span className={styles['review-value']}>{contact.note}</span>
            </div>
          )}
        </div>
      </div>

      {/* Guests Information Review */}
      <div className={styles['review-section']}>
        <h3 className={styles['review-title']}>{t('booking.step3.sections.guests')}</h3>
        <div className={styles['guests-grid']}>
          <div className={styles['review-item']}>
            <span className={styles['review-label']}>{t('booking.step3.labels.totalGuests')}</span>
            <span className={styles['review-value']}>
              {plan.pax.adult + plan.pax.child + plan.pax.infant}
            </span>
          </div>
          <div className={styles['review-item']}>
            <span className={styles['review-label']}>{t('booking.step3.labels.adult')}</span>
            <span className={styles['review-value']}>{plan.pax.adult}</span>
          </div>
          <div className={styles['review-item']}>
            <span className={styles['review-label']}>{t('booking.step3.labels.child')}</span>
            <span className={styles['review-value']}>{plan.pax.child}</span>
          </div>
          <div className={styles['review-item']}>
            <span className={styles['review-label']}>{t('booking.step3.labels.infant')}</span>
            <span className={styles['review-value']}>{plan.pax.infant}</span>
          </div>
        </div>
      </div>

      {/* Members List Review */}
      <div className={styles['form-section']}>
        <h3 className={styles['section-title']}>{t('booking.step3.sections.members')}</h3>
        {renderMembersTable('adult', plan.members.adult)}
        {renderMembersTable('child', plan.members.child)}
        {renderMembersTable('infant', plan.members.infant)}
      </div>

      {/* Navigation is handled by parent component */}
    </div>
  );
};

// No props needed - navigation handled by parent

export default Step3Review;
