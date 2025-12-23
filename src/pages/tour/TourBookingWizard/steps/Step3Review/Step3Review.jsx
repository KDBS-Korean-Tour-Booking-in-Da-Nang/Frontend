import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useTourBooking } from '../../../../../hooks/useTourBooking';
import { useToursAPI } from '../../../../../hooks/useToursAPI';
import { useToast } from '../../../../../contexts/ToastContext';
import { previewAllAvailableVouchers } from '../../../../../services/voucherAPI';
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
  Baby,
  UserRound,
  CalendarDays,
  Globe2,
  IdCard,
  Venus,
  Mars,
  CreditCard,
  Tag,
  X,
  Ticket,
  CheckCircle2
} from 'lucide-react';
import styles from './Step3Review.module.css';

const Step3Review = () => {
  const { contact, plan } = useTourBooking();
  const { t } = useTranslation();
  const { showSuccess } = useToast();
  const [searchParams] = useSearchParams();
  const tourId = searchParams.get('id');
  const { fetchTourById } = useToursAPI();
  const [tour, setTour] = useState(null);
  const bookingCreatedAtRef = useRef(new Date().toISOString());
  
  const [voucherCode, setLocalVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [availableVouchers, setAvailableVouchers] = useState([]);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [isLoadingVouchers, setIsLoadingVouchers] = useState(false);
  const [voucherError, setVoucherError] = useState('');

  useEffect(() => {
    let isMounted = true;
    let isCancelled = false;

    const loadTour = async () => {
      if (!tourId) return;

      try {
        const tourData = await fetchTourById(Number.parseInt(tourId, 10));
        if (isMounted && !isCancelled) {
          setTour(tourData);
        }
      } catch (err) {
      }
    };

    loadTour();

    return () => {
      isMounted = false;
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourId]);

  useEffect(() => {
    const loadVouchers = async () => {
      if (!tourId || !plan?.pax) return;
      
      const parsedTourId = Number.parseInt(tourId, 10);
      if (isNaN(parsedTourId) || parsedTourId <= 0) return;
      
      const adultsCount = plan.pax.adult || 0;
      const childrenCount = plan.pax.child || 0;
      const babiesCount = plan.pax.infant || 0;
      
      if (adultsCount < 1) return;
      
      setIsLoadingVouchers(true);
      try {
        const vouchers = await previewAllAvailableVouchers({
          tourId: parsedTourId,
          adultsCount,
          childrenCount,
          babiesCount
        });
        
        const mappedVouchers = vouchers.map(v => ({
          ...v,
          code: v.voucherCode || v.code || '',
          voucherId: v.voucherId || v.id
        }));
        
        setAvailableVouchers(mappedVouchers);
      } catch (err) {
        setAvailableVouchers([]);
      } finally {
        setIsLoadingVouchers(false);
      }
    };

    loadVouchers();
  }, [tourId, plan?.pax?.adult, plan?.pax?.child, plan?.pax?.infant]);

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

    const countryName = t(`booking.step2.countries.${nationalityCode}`);

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

  const originalTotal = plan.price?.total || plan.total || 0;
  const depositPercentage = tour?.depositPercentage || 0;
  const isOneTimePayment = depositPercentage === 100;
  
  let discountAmount = 0;
  let finalTotal = originalTotal;
  let finalDepositAmount = depositPercentage < 100 
    ? originalTotal * depositPercentage / 100 
    : originalTotal;
  let finalRemainingAmount = depositPercentage < 100 
    ? originalTotal - finalDepositAmount 
    : 0;
  let oneTimePayment = isOneTimePayment;
  
  if (appliedVoucher) {
    discountAmount = Number(appliedVoucher.discountAmount || 0);
    finalTotal = Number(appliedVoucher.finalTotal || appliedVoucher.finalTotalAmount || originalTotal);
    finalDepositAmount = Number(appliedVoucher.finalDepositAmount || finalDepositAmount);
    finalRemainingAmount = Number(appliedVoucher.finalRemainingAmount || finalRemainingAmount);
    oneTimePayment = appliedVoucher.oneTimePayment !== undefined 
      ? appliedVoucher.oneTimePayment 
      : isOneTimePayment;
  }

  const handleVoucherCodeChange = (e) => {
    setLocalVoucherCode(e.target.value);
    // Clear error when user types
    if (voucherError) {
      setVoucherError('');
    }
  };

  useEffect(() => {
    if (tourId) {
      try {
        const savedData = localStorage.getItem(`bookingData_${tourId}`);
        if (savedData) {
          const parsed = JSON.parse(savedData);
          parsed.voucherCode = appliedVoucher ? (appliedVoucher.code || appliedVoucher.voucherCode || '') : '';
          localStorage.setItem(`bookingData_${tourId}`, JSON.stringify(parsed));
        }
      } catch (err) {
      }
    }
  }, [appliedVoucher, tourId]);

  useEffect(() => {
    if (tourId) {
      try {
        const savedData = localStorage.getItem(`bookingData_${tourId}`);
        if (savedData) {
          const parsed = JSON.parse(savedData);
          if (parsed.voucherCode) {
            const matched = availableVouchers.find(v => 
              (v.code || v.voucherCode || '').toUpperCase().trim() === parsed.voucherCode.toUpperCase().trim()
            );
            if (matched) {
              setLocalVoucherCode(parsed.voucherCode);
              setAppliedVoucher(matched);
            }
          }
        }
      } catch (err) {
      }
    }
  }, [tourId, availableVouchers.length]);

  const handleApplyVoucher = () => {
    const codeToApply = voucherCode.trim().toUpperCase();
    if (!codeToApply) {
      setVoucherError(t('booking.step3.payment.voucherCodeRequired') || 'Vui lòng nhập mã voucher');
      return;
    }

    const matched = availableVouchers.find(v => {
      const vCode = (v.code || v.voucherCode || '').toUpperCase().trim();
      return vCode === codeToApply;
    });

    if (!matched) {
      setVoucherError(t('booking.step3.payment.voucherInvalid') || 'Mã voucher không hợp lệ');
      setAppliedVoucher(null);
      return;
    }

    setVoucherError('');
    setAppliedVoucher(matched);
    setLocalVoucherCode(matched.code || matched.voucherCode || codeToApply);
    showSuccess(t('booking.step3.payment.voucherApplied') || 'Voucher đã được áp dụng');
  };

  const handleSelectVoucherFromList = (voucher) => {
    const code = voucher.code || voucher.voucherCode || '';
    if (!code) return;
    
    setLocalVoucherCode(code);
    setAppliedVoucher(voucher);
    setIsVoucherModalOpen(false);
    showSuccess(t('booking.step3.payment.voucherApplied') || 'Voucher đã được áp dụng');
  };

  const handleRemoveVoucher = () => {
    setLocalVoucherCode('');
    setAppliedVoucher(null);
    showSuccess(t('booking.step3.payment.voucherRemoved') || 'Voucher đã được gỡ bỏ');
  };

  return (
    <div className={styles['review-form']}>
      <TourPreview createdAt={bookingCreatedAtRef.current} />

      <div className={styles['summary-columns']}>
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

      <div className={styles['form-section']}>
        <h3 className={styles['section-title']}>
          <Users className={styles['title-icon']} />
          {t('booking.step3.sections.members')}
        </h3>
        {renderMembersTable('adult', plan.members.adult)}
        {renderMembersTable('child', plan.members.child)}
        {renderMembersTable('infant', plan.members.infant)}
      </div>

      <div className={styles['form-section']}>
        <h3 className={styles['section-title']}>
          <CreditCard className={styles['title-icon']} />
          {t('booking.step3.sections.paymentSummary')}
        </h3>

        <div className={styles['payment-summary']}>
          <div className={styles['payment-row']}>
            <span className={styles['payment-label']}>
              {t('booking.step3.payment.totalAmount')}
            </span>
            <span className={`${styles['payment-value']} ${appliedVoucher ? styles['strikethrough'] : ''}`}>
              {formatCurrency(originalTotal)}
            </span>
          </div>

          <div className={styles['voucher-section']}>
            <div className={styles['voucher-header']}>
              <Tag className={styles['voucher-icon']} size={18} strokeWidth={1.5} />
              <span>{t('booking.step3.payment.voucher')}</span>
            </div>
            <div className={styles['voucher-input-group']}>
              <input
                type="text"
                value={voucherCode}
                onChange={handleVoucherCodeChange}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleApplyVoucher();
                  }
                }}
                placeholder={t('booking.step3.payment.voucherPlaceholder') || 'Enter voucher code'}
                className={`${styles['voucher-input']} ${voucherError ? styles['voucher-input-error'] : ''}`}
                disabled={!!appliedVoucher}
              />
              {appliedVoucher ? (
                <button
                  type="button"
                  onClick={handleRemoveVoucher}
                  className={styles['voucher-remove-btn']}
                  title={t('booking.step3.payment.removeVoucher') || 'Gỡ bỏ voucher'}
                >
                  <span className={styles['voucher-code-display']}>{appliedVoucher.code || appliedVoucher.voucherCode}</span>
                  <X size={16} strokeWidth={1.5} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsVoucherModalOpen(true)}
                  className={styles['voucher-list-btn']}
                  title={t('booking.step3.payment.selectVoucher') || 'Chọn voucher từ danh sách'}
                >
                  <Ticket size={18} strokeWidth={1.5} />
                </button>
              )}
            </div>
            {voucherError && (
              <span className={styles['voucher-error']}>{voucherError}</span>
            )}
            {!appliedVoucher && voucherCode && (
              <button
                type="button"
                onClick={handleApplyVoucher}
                className={styles['voucher-apply-btn']}
              >
                {t('booking.step3.payment.applyVoucher') || 'Áp dụng'}
              </button>
            )}
          </div>

          {appliedVoucher && discountAmount > 0 && (() => {
            const discountType = appliedVoucher.discountType || appliedVoucher.meta?.discountType;
            const discountValue = appliedVoucher.discountValue || appliedVoucher.meta?.discountValue || 0;
            
            let discountDisplay = '';
            if (discountType === 'PERCENT' || discountType === 'PERCENTAGE') {
              const percentValue = Number.isFinite(Number(discountValue)) 
                ? Math.round(Number(discountValue))
                : discountValue;
              discountDisplay = `-${percentValue}%`;
            } else if (discountType === 'FIXED' || discountType === 'AMOUNT') {
              discountDisplay = `-${formatCurrency(discountAmount)}`;
            } else {
              discountDisplay = `-${formatCurrency(discountAmount)}`;
            }
            
            return (
              <div className={styles['payment-row']}>
                <span className={styles['payment-label']}>
                  {t('booking.step3.payment.discountLabel')}
                </span>
                <span className={`${styles['payment-value']} ${styles['discount-value']}`}>
                  {discountDisplay}
                </span>
              </div>
            );
          })()}

          {appliedVoucher && (
            <div className={styles['payment-row']}>
              <span className={styles['payment-label']}>
                {t('booking.step3.payment.finalTotal')}
              </span>
              <span className={`${styles['payment-value']} ${styles['final-total-value']}`}>
                {formatCurrency(finalTotal)}
              </span>
            </div>
          )}

          {!oneTimePayment && (
            <>
              <div className={styles['payment-row']}>
                <span className={styles['payment-label']}>
                  {t('booking.step3.payment.depositAmount')}
                  {depositPercentage && ` (${depositPercentage}%)`}
                </span>
                <span className={styles['payment-value']}>
                  {formatCurrency(finalDepositAmount)}
                </span>
              </div>

              {depositPercentage < 100 && (
                <div className={styles['payment-row']}>
                  <span className={styles['payment-label']}>
                    {t('booking.step3.payment.balanceAmount')}
                  </span>
                  <span className={styles['payment-value']}>
                    {formatCurrency(finalRemainingAmount)}
                  </span>
                </div>
              )}
            </>
          )}

          <div className={`${styles['payment-row']} ${styles['payment-due']}`}>
            <span className={styles['payment-label']}>
              {t('booking.step3.payment.paymentDue')}
            </span>
            <span className={`${styles['payment-value']} ${styles['highlight']}`}>
              {formatCurrency(oneTimePayment ? finalTotal : finalDepositAmount)}
            </span>
          </div>
        </div>
      </div>

      {isVoucherModalOpen && createPortal(
        <div className={styles['voucher-modal-overlay']} onClick={() => setIsVoucherModalOpen(false)}>
          <div className={styles['voucher-modal-container']} onClick={(e) => e.stopPropagation()}>
            <div className={styles['voucher-modal-header']}>
              <h3>{t('booking.step3.payment.voucherListTitle') || 'Danh sách voucher'}</h3>
              <button
                type="button"
                onClick={() => setIsVoucherModalOpen(false)}
                className={styles['voucher-modal-close']}
              >
                <X size={20} />
              </button>
            </div>
            <div className={styles['voucher-modal-content']}>
              {isLoadingVouchers ? (
                <div className={styles['voucher-modal-loading']}>
                  {t('booking.step3.payment.loadingVouchers') || 'Đang tải...'}
                </div>
              ) : availableVouchers.length === 0 ? (
                <div className={styles['voucher-modal-empty']}>
                  {t('booking.step3.payment.noVouchers') || 'Không có voucher nào'}
                </div>
              ) : (
                <div className={styles['voucher-list']}>
                  {availableVouchers.map((voucher) => {
                    const code = voucher.code || voucher.voucherCode || '';
                    const isSelected = appliedVoucher && (
                      (appliedVoucher.code || appliedVoucher.voucherCode || '') === code
                    );
                    // Use discountAmount from API response if available, otherwise calculate
                    const discountAmount = voucher.discountAmount || 0;
                    const discountType = voucher.discountType || 'PERCENT';
                    const discountValue = voucher.discountValue || 0;
                    
                    return (
                      <div
                        key={voucher.voucherId || voucher.id || code}
                        onClick={() => handleSelectVoucherFromList(voucher)}
                        className={`${styles['voucher-item']} ${isSelected ? styles['voucher-item-selected'] : ''}`}
                      >
                        <div className={styles['voucher-item-header']}>
                          <Ticket size={18} />
                          <span className={styles['voucher-item-code']}>{code}</span>
                          {isSelected && <CheckCircle2 size={18} />}
                        </div>
                        <div className={styles['voucher-item-info']}>
                          {voucher.name && (
                            <span className={styles['voucher-item-name']}>{voucher.name}</span>
                          )}
                          <div className={styles['voucher-item-discount-row']}>
                            <span className={styles['voucher-item-discount']}>
                              {discountType === 'PERCENT' || discountType === 'PERCENTAGE'
                                ? `${discountValue}%`
                                : formatCurrency(discountValue)}
                            </span>
                            {discountAmount > 0 && (
                              <span className={styles['voucher-item-discount-amount']}>
                                {t('booking.step3.payment.discountLabel') || 'Giảm'}: {formatCurrency(discountAmount)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Step3Review;
