import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useToast } from '../../../contexts/ToastContext';
import { getAllVouchers } from '../../../services/voucherAPI';
import { API_ENDPOINTS } from '../../../config/api';
import { getCompanyName } from '../../../utils/companyUtils';
import styles from './VoucherDetailPage.module.css';

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


const VoucherDetailPage = () => {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const navigate = useNavigate();
  const { showSuccess } = useToast();
  const [voucher, setVoucher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toursMap, setToursMap] = useState(new Map()); // Map tourId -> tour name
  const [companyName, setCompanyName] = useState('N/A');

  // Fetch tour details from tourIds
  const fetchTourDetails = async (tourIds) => {
    if (!tourIds || tourIds.length === 0) return;

    try {
      // Get token
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) return;

      // Fetch all tours and create a map
      const response = await fetch(API_ENDPOINTS.TOURS, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const allTours = await response.json();
        const toursMap = new Map();
        
        // Filter tours that match tourIds and create map
        if (Array.isArray(allTours)) {
          allTours.forEach(tour => {
            const tourId = tour.id || tour.tourId;
            if (tourId && tourIds.includes(tourId)) {
              const tourName = tour.tourName || tour.name || `Tour #${tourId}`;
              toursMap.set(tourId, tourName);
            }
          });
        }
        
        setToursMap(toursMap);
      }
    } catch (error) {
      console.error('Error fetching tour details:', error);
      // Don't show error to user - tours are optional information
    }
  };

  useEffect(() => {
    const fetchVoucher = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch all vouchers from API and find by ID
        const allVouchers = await getAllVouchers();
        
        if (!Array.isArray(allVouchers)) {
          setError('Không tìm thấy voucher');
          setLoading(false);
          return;
        }

        // Find voucher by ID (voucherId or id)
        const voucherId = parseInt(id);
        const foundVoucher = allVouchers.find(v => 
          (v.voucherId && v.voucherId === voucherId) || 
          (v.id && v.id === voucherId)
        );

        if (!foundVoucher) {
          setError('Voucher không tồn tại');
          setLoading(false);
          return;
        }

        // Map backend response to frontend format
        // Map FIXED -> AMOUNT for display
        // Include tourIds from VoucherResponse
        const mappedVoucher = {
          id: foundVoucher.voucherId || foundVoucher.id,
          voucherId: foundVoucher.voucherId || foundVoucher.id,
          companyId: foundVoucher.companyId,
          code: foundVoucher.code,
          name: foundVoucher.name,
          discountType: foundVoucher.discountType === 'FIXED' ? 'AMOUNT' : foundVoucher.discountType,
          discountValue: foundVoucher.discountValue,
          minOrderValue: foundVoucher.minOrderValue,
          totalQuantity: foundVoucher.totalQuantity,
          remainingQuantity: foundVoucher.remainingQuantity,
          startDate: foundVoucher.startDate,
          endDate: foundVoucher.endDate,
          status: foundVoucher.status,
          createdAt: foundVoucher.createdAt,
          tourIds: foundVoucher.tourIds || [] // Include tourIds from backend response
        };

        setVoucher(mappedVoucher);
        
        // Fetch company name
        if (mappedVoucher.companyId) {
          const name = await getCompanyName(mappedVoucher.companyId);
          setCompanyName(name);
        }
        
        // Fetch tour details if tourIds exist
        if (foundVoucher.tourIds && foundVoucher.tourIds.length > 0) {
          fetchTourDetails(foundVoucher.tourIds);
        }
      } catch (err) {
        console.error('Error fetching voucher:', err);
        setError('Không thể tải thông tin voucher');
      } finally {
        setLoading(false);
      }
    };

    fetchVoucher();
  }, [id]);

  const getDaysLeftLabel = (endDate) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    if (Number.isNaN(end.getTime())) return null;
    const diff = Math.ceil((end - new Date()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 'Đã hết hạn';
    if (diff === 0) return 'Hết hạn hôm nay';
    return `Còn ${diff} ngày`;
  };

  const formatReadableDateTime = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '-';
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.loadingSpinner}></div>
        </div>
      </div>
    );
  }

  if (error || !voucher) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorContent}>
          <div className={styles.errorBox}>
            <div className={styles.errorText}>{error || 'Voucher không tồn tại'}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.voucherContainer}>
      <div className={styles.contentWrapper}>
        <div className={styles.maxWidth}>
          <button
            onClick={() => navigate('/tour/voucher-list')}
            className={styles.backButton}
          >
            <span className={styles.backButtonIcon}>
              <ChevronLeft />
            </span>
            <span>Quay lại danh sách voucher</span>
          </button>
          {/* Voucher Header Card - Auto height based on content */}
          <div className={styles.voucherCard}>
            {/* Gradient Header with Serrated Bottom Edge */}
            <div className={`${styles.gradientHeader} ${
              voucher.discountType === 'PERCENT' 
                ? styles.gradientHeaderPercent 
                : styles.gradientHeaderAmount
            }`}>
              <div className={styles.headerContent}>
                <div className={styles.headerLeft}>
                  <div className={styles.companyName}>
                    {companyName !== 'N/A' ? companyName : `Company ID: ${voucher.companyId || 'N/A'}`}
                  </div>
                  <div className={styles.discountValue}>
                    {voucher.discountType === 'PERCENT' ? (
                      <div className={styles.discountText}>
                        Giảm {voucher.discountValue}%
                      </div>
                    ) : (
                      <div className={styles.discountText}>
                        {formatCurrency(voucher.discountValue)}
                      </div>
                    )}
                  </div>
                  <div className={styles.expiryDate}>
                    HSD: {formatDate(voucher.endDate)}
                  </div>
                </div>
                <div className={styles.headerRight}>
                  <div className={styles.voucherCode}>
                    {voucher.code}
                  </div>
                  {voucher.remainingQuantity !== undefined && voucher.remainingQuantity !== null && (
                    <div className={styles.remainingQuantity}>
                      Còn lại: {voucher.remainingQuantity} voucher
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Content Sections */}
            <div className={styles.contentSections}>
              <div className={styles.sectionGroup}>
                {/* Thời gian sử dụng mã */}
                <div className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <h3 className={styles.sectionTitle}>Thời gian sử dụng mã</h3>
                    {getDaysLeftLabel(voucher.endDate) && (
                      <span className={styles.daysLeftBadge}>
                        {getDaysLeftLabel(voucher.endDate)}
                      </span>
                    )}
                  </div>
                  <div className={styles.timeBox}>
                    <div className={styles.timeItem}>
                      Bắt đầu:
                      <span className={styles.timeValue}>
                        {formatReadableDateTime(voucher.startDate)}
                      </span>
                    </div>
                    <div className={styles.timeItem}>
                      Kết thúc:
                      <span className={styles.timeValue}>
                        {formatReadableDateTime(voucher.endDate)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Đơn tối thiểu - Only show if minOrderValue exists */}
                {voucher.minOrderValue && (
                  <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Đơn tối thiểu</h3>
                    <div className={styles.minOrderBox}>
                      <div className={styles.minOrderValue}>
                        {formatCurrency(voucher.minOrderValue)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Ưu đãi */}
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>Ưu đãi</h3>
                  <div className={styles.benefitBox}>
                    <p className={styles.benefitText}>
                      Lượt sử dụng có hạn. Nhanh tay kẻo lỡ bạn nhé!
                    </p>
                    <div className={styles.benefitList}>
                      {voucher.discountType === 'PERCENT' ? (
                        <>
                          <div>• Giảm {voucher.discountValue}%</div>
                          {voucher.minOrderValue && (
                            <div>• Giảm tối đa {formatCurrency(Math.min(voucher.minOrderValue, 100000))}</div>
                          )}
                        </>
                      ) : (
                        <div>• Giảm {formatCurrency(voucher.discountValue)}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Áp dụng cho tour */}
              <div className={styles.tourSection}>
                <h3 className={styles.sectionTitle}>Áp dụng cho tour</h3>
                <div className={styles.tourBox}>
                  {voucher.tourIds && voucher.tourIds.length > 0 ? (
                    <div className={styles.sectionGroup}>
                      <p className={styles.tourListTitle}>
                        Voucher này áp dụng cho các tour sau:
                      </p>
                      <div className={styles.tourListScrollable}>
                        {voucher.tourIds.map((tourId, idx) => {
                          const tourName = toursMap.get(tourId) || `Tour #${tourId}`;
                          return (
                            <div key={idx} className={styles.tourItem}>
                              <span className={styles.tourDot}></span>
                              <span className={styles.tourName}>{tourName}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className={styles.tourGlobalText}>
                      Voucher này áp dụng cho tất cả các tour của công ty.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Action Button - Fixed at bottom */}
            <div className={styles.actionSection}>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(voucher.code);
                    showSuccess(`Đã sao chép mã voucher: ${voucher.code}`);
                  } catch {
                    const textArea = document.createElement('textarea');
                    textArea.value = voucher.code;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    showSuccess(`Đã sao chép mã voucher: ${voucher.code}`);
                  }
                }}
                className={`${styles.copyButton} ${
                  voucher.discountType === 'PERCENT'
                    ? styles.copyButtonPercent
                    : styles.copyButtonAmount
                }`}
              >
                Sao chép mã
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoucherDetailPage;

