import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useTourBooking } from '../../../../../hooks/useTourBooking';
import { useToursAPI } from '../../../../../hooks/useToursAPI';
import TourPreview from '../TourPreview/TourPreview';
import {
  UserCircle2,
  Users,
  ClipboardList,
  MapPin,
  Phone,
  Mail,
  Home,
  StickyNote,
  Calendar,
  User,
  Info,
  Baby,
  UserRound,
  CalendarDays,
  Globe2,
  IdCard,
  Venus,
  Mars,
  CreditCard,
  Tag,
  AlertCircle
} from 'lucide-react';
import styles from './Step3Review.module.css';

const Step3Review = () => {
  const { contact, plan } = useTourBooking();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const tourId = searchParams.get('id');
  const { fetchTourById } = useToursAPI();
  const [tour, setTour] = useState(null);
  const bookingCreatedAtRef = useRef(new Date().toISOString());

  // Load tour data to get depositPercentage
  useEffect(() => {
    let isMounted = true;
    let isCancelled = false;

    const loadTour = async () => {
      if (!tourId) return;

      try {
        const tourData = await fetchTourById(parseInt(tourId));
        if (isMounted && !isCancelled) {
          setTour(tourData);
        }
      } catch (err) {
        // Silently handle error
      }
    };

    loadTour();

    return () => {
      isMounted = false;
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourId]); // Only depend on tourId, not fetchTourById to avoid infinite loop

  // Format currency helper
  const formatCurrency = (value) => {
    if (!Number.isFinite(Number(value))) return '—';
    try {
      const krwValue = Math.round(Number(value) / 18);
      return new Intl.NumberFormat('ko-KR').format(krwValue) + ' KRW';
    } catch (error) {
      return Math.round(Number(value) / 18).toLocaleString('ko-KR') + ' KRW';
    }
  };

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

  const memberTypeIcons = {
    adult: UserCircle2,
    child: UserRound,
    infant: Baby
  };

  const GenderIcon = ({ className = '' }) => (
    <span className={`${styles['gender-icon']} ${className}`}>
      <Mars />
      <Venus />
    </span>
  );

  const memberTableHeaders = [
    { key: 'index', label: t('booking.step3.table.index'), icon: null },
    { key: 'fullName', label: t('booking.step3.table.fullName'), icon: UserRound },
    { key: 'dob', label: t('booking.step3.table.dob'), icon: CalendarDays },
    { key: 'gender', label: t('booking.step3.table.gender'), icon: GenderIcon },
    { key: 'nationality', label: t('booking.step3.table.nationality'), icon: Globe2 },
    { key: 'id', label: t('booking.step3.table.idNumber'), icon: IdCard }
  ];

  const renderMembersTable = (memberType, members) => {
    if (members.length === 0) return null;
    const MemberIcon = memberTypeIcons[memberType] || Users;

    return (
      <div key={memberType} className={styles['review-section']}>
        <h4 className={styles['member-title']}>
          <MemberIcon className={styles['title-icon']} />
          {getMemberTypeLabel(memberType)} ({members.length})
        </h4>
        <table className={styles['members-table']}>
          <thead>
            <tr>
              {memberTableHeaders.map(({ key, label, icon: HeaderIcon }) => (
                <th key={key}>
                  <div className={styles['table-header']}>
                    {HeaderIcon && <HeaderIcon className={styles['table-header-icon']} />}
                    <span>{label}</span>
                  </div>
                </th>
              ))}
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
      <TourPreview createdAt={bookingCreatedAtRef.current} />

      <div className={styles['summary-columns']}>
        {/* Contact Information Review */}
        <div className={styles['review-section']}>
          <h3 className={styles['review-title']}>
            <UserCircle2 className={styles['title-icon']} />
            {t('booking.step3.sections.contact')}
          </h3>
          <div className={styles['contact-columns']}>
            <div className={styles['contact-column']}>
              <div className={styles['review-item']}>
                <div className={styles['item-header']}>
                  <Calendar className={styles['item-icon']} />
                  <span className={styles['review-label']}>{t('booking.step3.labels.departureDate')}</span>
                </div>
                <span className={styles['review-value']}>{formatDate(plan.date)}</span>
              </div>
              <div className={styles['review-item']}>
                <div className={styles['item-header']}>
                  <User className={styles['item-icon']} />
                  <span className={styles['review-label']}>{t('booking.step3.labels.fullName')}</span>
                </div>
                <span className={styles['review-value']}>{contact.fullName}</span>
              </div>
              <div className={styles['review-item']}>
                <div className={styles['item-header']}>
                  <Phone className={styles['item-icon']} />
                  <span className={styles['review-label']}>{t('booking.step3.labels.phone')}</span>
                </div>
                <span className={styles['review-value']}>{contact.phone}</span>
              </div>
            </div>
            <div className={styles['contact-column']}>
              <div className={styles['review-item']}>
                <div className={styles['item-header']}>
                  <Mail className={styles['item-icon']} />
                  <span className={styles['review-label']}>{t('booking.step3.labels.email')}</span>
                </div>
                <span className={styles['review-value']}>{contact.email}</span>
              </div>
              <div className={styles['review-item']}>
                <div className={styles['item-header']}>
                  <Home className={styles['item-icon']} />
                  <span className={styles['review-label']}>{t('booking.step3.labels.address')}</span>
                </div>
                <span className={styles['review-value']}>{contact.address}</span>
              </div>
              {contact.pickupPoint && (
                <div className={styles['review-item']}>
                  <div className={styles['item-header']}>
                    <MapPin className={styles['item-icon']} />
                    <span className={styles['review-label']}>{t('booking.step3.labels.pickupPoint')}</span>
                  </div>
                  <span className={styles['review-value']}>{contact.pickupPoint}</span>
                </div>
              )}
            </div>
          </div>
          {contact.note && (
            <div className={styles['review-item']} style={{ marginTop: '1rem' }}>
              <div className={styles['item-header']}>
                <StickyNote className={styles['item-icon']} />
                <span className={styles['review-label']}>{t('booking.step3.labels.note')}</span>
              </div>
              <span className={styles['review-value']}>{contact.note}</span>
            </div>
          )}
        </div>

        {/* Guests Information Review */}
        <div className={styles['review-section']}>
          <h3 className={styles['review-title']}>
            <Users className={styles['title-icon']} />
            {t('booking.step3.sections.guests')}
          </h3>
          <div className={styles['guests-grid']}>
            <div className={styles['review-item']}>
              <div className={styles['item-header']}>
                <ClipboardList className={styles['item-icon']} />
                <span className={styles['review-label']}>{t('booking.step3.labels.totalGuests')}</span>
              </div>
              <span className={styles['review-value']}>
                {plan.pax.adult + plan.pax.child + plan.pax.infant}
              </span>
            </div>
            <div className={styles['review-item']}>
              <div className={styles['item-header']}>
                <User className={styles['item-icon']} />
                <span className={styles['review-label']}>{t('booking.step3.labels.adult')}</span>
              </div>
              <span className={styles['review-value']}>{plan.pax.adult}</span>
            </div>
            <div className={styles['review-item']}>
              <div className={styles['item-header']}>
                <UserRound className={styles['item-icon']} />
                <span className={styles['review-label']}>{t('booking.step3.labels.child')}</span>
              </div>
              <span className={styles['review-value']}>{plan.pax.child}</span>
            </div>
            <div className={styles['review-item']}>
              <div className={styles['item-header']}>
                <Baby className={styles['item-icon']} />
                <span className={styles['review-label']}>{t('booking.step3.labels.infant')}</span>
              </div>
              <span className={styles['review-value']}>{plan.pax.infant}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Members List Review */}
      <div className={styles['form-section']}>
        <h3 className={styles['section-title']}>
          <Users className={styles['title-icon']} />
          {t('booking.step3.sections.members')}
        </h3>
        {renderMembersTable('adult', plan.members.adult)}
        {renderMembersTable('child', plan.members.child)}
        {renderMembersTable('infant', plan.members.infant)}
      </div>

      {/* ========== PAYMENT SUMMARY SECTION - NEW ========== */}
      <div className={styles['form-section']}>
        <h3 className={styles['section-title']}>
          <CreditCard className={styles['title-icon']} />
          {t('booking.step3.sections.paymentSummary')}
        </h3>

        <div className={styles['payment-summary']}>
          {/* Tổng tiền tour - tính từ members (adult, child, infant) */}
          <div className={styles['payment-row']}>
            <span className={styles['payment-label']}>
              {t('booking.step3.payment.totalAmount')}
            </span>
            <span className={styles['payment-value']}>
              {formatCurrency(plan.price?.total || plan.total || 0)}
            </span>
          </div>

          {/* Deposit and Remaining - Always show to preview payment breakdown */}
          <div className={styles['payment-row']}>
            <span className={styles['payment-label']}>
              {t('booking.step3.payment.depositAmount')}
              {tour?.depositPercentage && ` (${tour.depositPercentage}%)`}
            </span>
            <span className={styles['payment-value']}>
              {formatCurrency(
                tour?.depositPercentage && tour.depositPercentage < 100
                  ? (plan.price?.total || plan.total || 0) * tour.depositPercentage / 100
                  : plan.price?.total || plan.total || 0
              )}
            </span>
          </div>

          <div className={styles['payment-row']}>
            <span className={styles['payment-label']}>
              {t('booking.step3.payment.balanceAmount')}
            </span>
            <span className={styles['payment-value']}>
              {formatCurrency(
                tour?.depositPercentage && tour.depositPercentage < 100
                  ? (plan.price?.total || plan.total || 0) * (100 - tour.depositPercentage) / 100
                  : 0
              )}
            </span>
          </div>

          {/* Voucher Placeholder - DISABLED */}
          <div className={styles['voucher-placeholder']}>
            <div className={styles['voucher-header']}>
              <Tag className={styles['voucher-icon']} />
              <span>{t('booking.step3.payment.voucher')}</span>
            </div>
            <div className={styles['voucher-disabled']}>
              <AlertCircle size={16} />
              <span>{t('booking.step3.payment.voucherNotAvailable')}</span>
            </div>
          </div>

          {/* Số tiền thanh toán lần đầu */}
          <div className={`${styles['payment-row']} ${styles['payment-due']}`}>
            <span className={styles['payment-label']}>
              {t('booking.step3.payment.paymentDue')}
            </span>
            <span className={`${styles['payment-value']} ${styles['highlight']}`}>
              {formatCurrency(
                tour?.depositPercentage && tour.depositPercentage < 100
                  ? (plan.price?.total || plan.total || 0) * tour.depositPercentage / 100
                  : plan.price?.total || plan.total || 0
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation is handled by parent component */}
    </div>
  );
};

// No props needed - navigation handled by parent

export default Step3Review;
