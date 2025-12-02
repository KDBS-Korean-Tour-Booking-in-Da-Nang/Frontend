import React from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../contexts/ToastContext';
import { X, Percent, ShoppingBag, Calendar, Eye, Clock, Copy } from 'lucide-react';
import styles from './VoucherListModal.module.css';

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
      year: 'numeric'
    });
  } catch {
    return '-';
  }
};

const getDaysLeftText = (endDate, t) => {
  if (!endDate) return null;
  const now = new Date();
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return null;
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  if (diff < 0) return null;
  if (diff === 0) return t('tourPage.detail.vouchers.expiresToday');
  if (diff <= 7) return t('tourPage.detail.vouchers.daysLeft', { days: diff });
  return null;
};

const getStatusBadge = (endDate, t) => {
  const daysLeftText = getDaysLeftText(endDate, t);
  if (!daysLeftText) return null;
  return <span className={styles.statusBadge}>{daysLeftText}</span>;
};

const VoucherListModal = ({ isOpen, onClose, vouchers = [], onVoucherClick }) => {
  const { t } = useTranslation();
  const { showSuccess } = useToast();

  if (!isOpen) return null;

  const handleCopyCode = async (voucherCode) => {
    try {
      await navigator.clipboard.writeText(voucherCode);
      showSuccess(
        t('tourPage.detail.vouchers.copySuccess', { code: voucherCode })
      );
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = voucherCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showSuccess(
        t('tourPage.detail.vouchers.copySuccess', { code: voucherCode })
      );
    }
  };

  const getVoucherHeaderGradient = (discountType) => {
    return discountType === 'PERCENT' 
      ? styles.headerGradientPercent 
      : styles.headerGradientAmount;
  };

  const getVoucherButtonGradient = (discountType) => {
    return discountType === 'PERCENT' 
      ? styles.buttonGradientPercent 
      : styles.buttonGradientAmount;
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {t('tourPage.detail.vouchers.listTitle')}
          </h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label={t('tourPage.detail.vouchers.listCloseLabel')}
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        {/* Content */}
        <div className={styles.modalContent}>
          {vouchers.length === 0 ? (
            <div className={styles.emptyState}>
              <p>{t('tourPage.detail.vouchers.listEmpty')}</p>
            </div>
          ) : (
            <div className={styles.voucherGrid}>
              {vouchers.map((voucher) => {
                const rawDiscountType = voucher.discountType || voucher.meta?.discountType || 'PERCENT';
                const discountType = rawDiscountType === 'FIXED' ? 'AMOUNT' : rawDiscountType === 'AMOUNT' ? 'AMOUNT' : 'PERCENT';
                const voucherCode = voucher.voucherCode || voucher.code || voucher.meta?.code || '';
                const voucherName =
                  voucher?.meta?.name ||
                  voucher.name ||
                  t('tourPage.detail.vouchers.voucherFallbackName');
                const startDate = voucher.startDate || voucher.meta?.startDate || '';
                const endDate = voucher.endDate || voucher.meta?.endDate || '';

                return (
                  <div key={voucher.voucherId || voucher.id || voucherCode} className={styles.voucherCard}>
                    {/* Status Badge */}
                    {getStatusBadge(endDate, t)}

                    {/* LEFT SECTION */}
                    <div className={`${styles.leftSection} ${getVoucherHeaderGradient(discountType)}`}>
                      <div className={styles.leftContent}>
                        {discountType === 'PERCENT' ? (
                          <>
                            <Percent className={styles.iconLarge} />
                            <div className={styles.valueWrapper}>
                              <span className={styles.valueText}>
                                {voucher.discountValue || voucher.meta?.discountValue || 0}
                              </span>
                              <span className={styles.valueSymbol}>%</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <ShoppingBag className={styles.iconLarge} />
                            <div className={styles.valueWrapper}>
                              <span className={styles.valueTextSmall}>
                                {formatCurrency(voucher.discountValue || voucher.meta?.discountValue || 0).replace('₫', '').trim()}
                              </span>
                              <span className={styles.valueSymbol}>₫</span>
                            </div>
                          </>
                        )}
                      </div>

                      <div className={styles.codeContainer}>
                        <span className={styles.codeText}>{voucherCode}</span>
                      </div>
                    </div>

                    {/* RIGHT SECTION */}
                    <div className={styles.rightSection}>
                      <div className={styles.infoTop}>
                        <h3 className={styles.title} title={voucherName}>
                          {voucherName}
                        </h3>
                        <div className={styles.subtitle}>
                          {discountType === 'PERCENT'
                            ? t('tourPage.detail.vouchers.discountPercent', {
                                value: voucher.discountValue || 0,
                              })
                            : t('tourPage.detail.vouchers.discountAmount', {
                                amount: formatCurrency(
                                  voucher.discountValue || 0
                                ),
                              })}
                        </div>
                      </div>

                      <div className={styles.dateBox}>
                        <div className={styles.dateRow}>
                          <Calendar size={14} className={styles.iconSmall} />
                          <span className={styles.dateLabel}>
                            {t('tourPage.detail.vouchers.periodLabel')}
                          </span>
                          {getDaysLeftText(endDate, t) && (
                            <span className={styles.countdownBadge}>
                              {getDaysLeftText(endDate, t)}
                            </span>
                          )}
                        </div>
                        <div className={styles.dateRange}>
                          {t('tourPage.detail.vouchers.fromDate')}{' '}
                          {formatDate(startDate)} <br />
                          {t('tourPage.detail.vouchers.toDate')}{' '}
                          {formatDate(endDate)}
                        </div>
                      </div>

                      <div className={styles.actions}>
                        <button
                          onClick={() => handleCopyCode(voucherCode)}
                          className={`${styles.btnCopy} ${getVoucherButtonGradient(discountType)}`}
                        >
                          <Copy size={14} />{' '}
                          {t('tourPage.detail.vouchers.copyButton')}
                        </button>

                        <button
                          onClick={() => {
                            if (onVoucherClick) {
                              onVoucherClick(voucher.voucherId || voucher.id);
                            }
                          }}
                          className={styles.btnDetail}
                        >
                          <Eye size={14} />{' '}
                          {t('tourPage.detail.vouchers.detailButton')}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoucherListModal;

