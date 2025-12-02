import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../contexts/ToastContext';
import { getAllVouchers } from '../../../services/voucherAPI';
import { API_ENDPOINTS } from '../../../config/api';
import { getCompanyName } from '../../../utils/companyUtils';
import { checkAndHandle401 } from '../../../utils/apiErrorHandler';
import { Calendar, Copy, Percent, Banknote, Clock, Minus } from 'lucide-react';
import Modal from '../Modal';
import styles from './VoucherDetailModal.module.css';

const formatCurrency = (value) => {
  try {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value || 0));
  } catch {
    return `${value}`;
  }
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '-';
  }
};

const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    // Numeric, locale-agnostic format to work across languages
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return '-';
  }
};

const VoucherDetailModal = ({ isOpen, onClose, voucherId }) => {
  const { t } = useTranslation();
  const { showSuccess } = useToast();
  const [voucher, setVoucher] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toursMap, setToursMap] = useState(new Map());
  const [companyName, setCompanyName] = useState('N/A');

  // Get gradient colors based on voucher type
  const getVoucherHeaderGradient = (discountType) => {
    if (discountType === 'PERCENT') {
      return styles['voucher-header-gradient-percent'];
    } else {
      return styles['voucher-header-gradient-amount'];
    }
  };

  const getVoucherButtonGradient = (discountType) => {
    if (discountType === 'PERCENT') {
      return styles['voucher-button-gradient-percent'];
    } else {
      return styles['voucher-button-gradient-amount'];
    }
  };

  const getDaysLeftLabel = (endDate) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    if (Number.isNaN(end.getTime())) return null;
    const diff = Math.ceil((end - new Date()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return t('tourPage.detail.vouchers.expired');
    if (diff === 0) return t('tourPage.detail.vouchers.expiresToday');
    return t('tourPage.detail.vouchers.daysLeft', { days: diff });
  };

  // Fetch tour details from tourIds
  const fetchTourDetails = async (tourIds) => {
    if (!tourIds || tourIds.length === 0) return;

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) return;

      const response = await fetch(API_ENDPOINTS.TOURS, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Handle 401 if token expired
      if (!response.ok && response.status === 401) {
        await checkAndHandle401(response);
        return;
      }

      if (response.ok) {
        const allTours = await response.json();
        const toursMap = new Map();
        
        if (Array.isArray(allTours)) {
          allTours.forEach(tour => {
            const tourId = tour.id || tour.tourId;
            if (tourId && tourIds.includes(tourId)) {
              const tourName = tour.tourName || tour.name || tour.title || `Tour #${tourId}`;
              toursMap.set(tourId, tourName);
            }
          });
        }
        
        setToursMap(toursMap);
      }
    } catch (error) {
      console.error('Error fetching tour details:', error);
    }
  };

  useEffect(() => {
    if (!isOpen || !voucherId) {
      setVoucher(null);
      setError(null);
      setToursMap(new Map());
      return;
    }

    const fetchVoucher = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const allVouchers = await getAllVouchers();
        
        if (!Array.isArray(allVouchers)) {
          setError(t('tourPage.detail.vouchers.notFound'));
          setLoading(false);
          return;
        }

        const id = parseInt(voucherId);
        const foundVoucher = allVouchers.find(v => 
          (v.voucherId && v.voucherId === id) || 
          (v.id && v.id === id)
        );

        if (!foundVoucher) {
          setError(t('tourPage.detail.vouchers.notExist'));
          setLoading(false);
          return;
        }

        // Map backend response to frontend format
        // Map FIXED -> AMOUNT for display, but keep PERCENT as is
        const mappedVoucher = {
          id: foundVoucher.voucherId || foundVoucher.id,
          voucherId: foundVoucher.voucherId || foundVoucher.id,
          companyId: foundVoucher.companyId,
          code: foundVoucher.code,
          name: foundVoucher.name,
          // Handle discountType: FIXED from API becomes AMOUNT for display, PERCENT stays PERCENT
          discountType: foundVoucher.discountType === 'FIXED' ? 'AMOUNT' : (foundVoucher.discountType || 'PERCENT'),
          discountValue: foundVoucher.discountValue,
          minOrderValue: foundVoucher.minOrderValue,
          totalQuantity: foundVoucher.totalQuantity,
          remainingQuantity: foundVoucher.remainingQuantity,
          startDate: foundVoucher.startDate,
          endDate: foundVoucher.endDate,
          status: foundVoucher.status,
          createdAt: foundVoucher.createdAt,
          tourIds: foundVoucher.tourIds || []
        };

        setVoucher(mappedVoucher);
        
        // Fetch company name
        if (mappedVoucher.companyId) {
          const name = await getCompanyName(mappedVoucher.companyId);
          setCompanyName(name);
        }
        
        if (foundVoucher.tourIds && foundVoucher.tourIds.length > 0) {
          fetchTourDetails(foundVoucher.tourIds);
        }
      } catch (err) {
        console.error('Error fetching voucher:', err);
        setError(t('tourPage.detail.vouchers.loadError'));
      } finally {
        setLoading(false);
      }
    };

    fetchVoucher();
  }, [isOpen, voucherId]);

  const handleCopyCode = async () => {
    if (!voucher?.code) return;
    
    try {
      await navigator.clipboard.writeText(voucher.code);
      showSuccess(
        t('tourPage.detail.vouchers.copySuccess', { code: voucher.code })
      );
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = voucher.code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showSuccess(
        t('tourPage.detail.vouchers.copySuccess', { code: voucher.code })
      );
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('tourPage.detail.vouchers.detailTitle')}
      size="md"
    >
      <div className={styles['voucher-detail-wrapper']}>
        <div className={styles['voucher-detail-container']}>
        {loading && (
          <div className={styles['loading-container']}>
            <div className={styles['spinner']}></div>
            <p>{t('tourPage.detail.vouchers.loadingDetail')}</p>
          </div>
        )}

        {error && (
          <div className={styles['error-container']}>
            <p className={styles['error-text']}>{error}</p>
          </div>
        )}

        {!loading && !error && voucher && (
          <div className={styles['voucher-detail-content']}>
            {/* Gradient Header */}
            <div className={`${styles['voucher-header']} ${getVoucherHeaderGradient(voucher.discountType)}`}>
              <div className={styles['voucher-header-content']}>
                <div className={styles['voucher-header-left']}>
                  <div className={styles['voucher-company-id']}>
                    {companyName !== 'N/A'
                      ? companyName
                      : `${t('tourPage.detail.vouchers.companyIdLabel')} ${
                          voucher.companyId || 'N/A'
                        }`}
                  </div>
                  <div className={styles['voucher-discount-display']}>
                    {voucher.discountType === 'PERCENT' ? (
                      <span className={styles['voucher-discount-text']}>
                        {t('tourPage.detail.vouchers.discountPercent', {
                          value: voucher.discountValue,
                        })}
                      </span>
                    ) : (
                      <span className={styles['voucher-discount-text']}>
                        {t('tourPage.detail.vouchers.discountAmount', {
                          amount: formatCurrency(voucher.discountValue),
                        })}
                      </span>
                    )}
                  </div>
                  <div className={styles['voucher-expiry']}>
                    {t('tourPage.detail.vouchers.expiryLabel')}{' '}
                    {formatDate(voucher.endDate)}
                  </div>
                </div>
                <div className={styles['voucher-header-right']}>
                  <div className={styles['voucher-code-display']}>
                    {voucher.code}
                  </div>
                  {voucher.remainingQuantity !== undefined && voucher.remainingQuantity !== null && (
                    <div className={styles['voucher-remaining-display']}>
                      {t('tourPage.detail.vouchers.remainingQuantity', {
                        count: voucher.remainingQuantity,
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Content Sections - Compact Layout */}
            <div className={styles['voucher-content']}>
              <div className={styles['voucher-section']}>
                <div className={styles['voucher-section-header']}>
                  <div className={styles['section-title-wrapper']}>
                    <Calendar className={styles['section-icon']} size={14} strokeWidth={1.5} />
                    <h3 className={styles['section-title']}>
                      {t('tourPage.detail.vouchers.usageTimeTitle')}
                    </h3>
                  </div>
                  {getDaysLeftLabel(voucher.endDate) && (
                    <span className={styles['voucher-days-left']}>
                      {getDaysLeftLabel(voucher.endDate)}
                    </span>
                  )}
                </div>
                <div className={styles['section-box']}>
                  <div className={styles['section-text']}>
                    {formatDateTime(voucher.startDate)} <Minus className={styles['inline-icon']} size={12} strokeWidth={1.5} /> {formatDateTime(voucher.endDate)}
                  </div>
                </div>
              </div>

              {voucher.minOrderValue && (
                <div className={styles['voucher-section']}>
                  <div className={styles['section-title-wrapper']}>
                    <Banknote className={styles['section-icon']} size={14} strokeWidth={1.5} />
                    <h3 className={styles['section-title']}>
                      {t('tourPage.detail.vouchers.minOrderTitle')}
                    </h3>
                  </div>
                  <div className={styles['section-box']}>
                    <div className={styles['section-text']}>
                      {formatCurrency(voucher.minOrderValue)}
                    </div>
                  </div>
                </div>
              )}

              <div className={styles['voucher-section']}>
                <div className={styles['section-title-wrapper']}>
                  {voucher.discountType === 'PERCENT' ? (
                    <Percent className={styles['section-icon']} size={14} strokeWidth={1.5} />
                  ) : (
                    <Banknote className={styles['section-icon']} size={14} strokeWidth={1.5} />
                  )}
                  <h3 className={styles['section-title']}>
                    {t('tourPage.detail.vouchers.benefitsTitle')}
                  </h3>
                </div>
                <div className={styles['section-box']}>
                  <div className={styles['benefits-list']}>
                    {voucher.discountType === 'PERCENT' ? (
                      <>
                        <div className={styles['benefit-item']}>
                          {t('tourPage.detail.vouchers.discountPercent', {
                            value: voucher.discountValue,
                          })}
                        </div>
                        {voucher.minOrderValue && (
                          <div className={styles['benefit-item']}>
                            {t('tourPage.detail.vouchers.maxDiscount', {
                              amount: formatCurrency(
                                Math.min(voucher.minOrderValue, 100000)
                              ),
                            })}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className={styles['benefit-item']}>
                        {t('tourPage.detail.vouchers.discountAmount', {
                          amount: formatCurrency(voucher.discountValue),
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {voucher.tourIds && voucher.tourIds.length > 0 && (
                <div className={styles['voucher-section']}>
                  <div className={styles['section-title-wrapper']}>
                    <Clock className={styles['section-icon']} size={14} strokeWidth={1.5} />
                    <h3 className={styles['section-title']}>
                      {t('tourPage.detail.vouchers.appliesToToursTitle')}
                    </h3>
                  </div>
                  <div className={styles['section-box']}>
                    <div className={styles['tours-items']}>
                      {voucher.tourIds.slice(0, 3).map((tourId, idx) => {
                        const tourName = toursMap.get(tourId) || `Tour #${tourId}`;
                        return (
                          <div key={idx} className={styles['tour-item']}>
                            <span className={styles['tour-bullet']}></span>
                            <span>{tourName}</span>
                          </div>
                        );
                      })}
                      {voucher.tourIds.length > 3 && (
                        <div className={styles['tour-item']}>
                          <span className={styles['tour-more']}>
                            {t('tourPage.detail.vouchers.moreTours', {
                              count: voucher.tourIds.length - 3,
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Button */}
            <div className={styles['voucher-actions']}>
              <button
                onClick={handleCopyCode}
                className={`${styles['copy-button']} ${getVoucherButtonGradient(voucher.discountType)}`}
              >
                <Copy className={styles['copy-icon']} size={16} strokeWidth={2} />
                {t('tourPage.detail.vouchers.copyButton')}
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </Modal>
  );
};

export default VoucherDetailModal;
