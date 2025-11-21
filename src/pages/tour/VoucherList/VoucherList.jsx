import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  RotateCw,
  Filter,
  Eye,
  Banknote,
  Percent,
  Clock,
  Calendar,
  ChevronDown,
} from 'lucide-react';
import { useToast } from '../../../contexts/ToastContext';
import { getAllVouchers } from '../../../services/voucherAPI';
import { getCompanyNames } from '../../../utils/companyUtils';
import styles from './VoucherList.module.css';

const INITIAL_DISPLAY = 6; // 3 rows x 2 columns
const LOAD_MORE_INCREMENT = 6; // Load 6 more items each time

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

const VoucherList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showSuccess } = useToast();
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [displayCount, setDisplayCount] = useState(INITIAL_DISPLAY);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [_companyNamesMap, setCompanyNamesMap] = useState(new Map());
  // Filter states
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'PERCENT' | 'AMOUNT'
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest'
  
  // Refetch function that can be called manually
  const fetchVouchers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all vouchers from API
      const allVouchers = await getAllVouchers();
      
      if (!Array.isArray(allVouchers)) {
        setVouchers([]);
        setLoading(false);
        return;
      }
      
      // Map backend response to frontend format
      // Map FIXED -> AMOUNT for display (backend uses FIXED, frontend displays as AMOUNT)
      const mappedVouchers = allVouchers.map(v => ({
        id: v.voucherId || v.id,
        voucherId: v.voucherId || v.id,
        companyId: v.companyId,
        code: v.code,
        name: v.name,
        discountType: v.discountType === 'FIXED' ? 'AMOUNT' : v.discountType, // Map FIXED to AMOUNT for display
        discountValue: v.discountValue,
        minOrderValue: v.minOrderValue,
        totalQuantity: v.totalQuantity,
        remainingQuantity: v.remainingQuantity,
        startDate: v.startDate,
        endDate: v.endDate,
        status: v.status,
        createdAt: v.createdAt || v.startDate || new Date().toISOString(),
        // Note: tourIds is not in VoucherResponse, so we set it to empty array
        // If voucher has tour mappings, it will be handled in detail page
        tourIds: []
      }));
      
      // Filter only ACTIVE vouchers for users
      const now = new Date();
      
      const activeVouchers = mappedVouchers.filter(v => {
        // Check status - allow ACTIVE status (case-insensitive)
        const status = v.status ? v.status.toUpperCase() : '';
        if (status !== 'ACTIVE') {
          return false;
        }
        
        // Check if voucher is currently valid (between startDate and endDate)
        const endDate = v.endDate ? new Date(v.endDate) : null;
        
        // Allow vouchers that haven't started yet (startDate in future) - they're still valid
        // Only filter out if endDate is in the past
        if (endDate && now > endDate) {
          return false;
        }
        
        // Check remaining quantity
        if (v.remainingQuantity !== null && v.remainingQuantity !== undefined && v.remainingQuantity <= 0) {
          return false;
        }
        
        return true;
      });
      
      setVouchers(activeVouchers);
      
      // Fetch company names for all unique companyIds
      const uniqueCompanyIds = [...new Set(activeVouchers.map(v => v.companyId).filter(Boolean))];
      if (uniqueCompanyIds.length > 0) {
        const namesMap = await getCompanyNames(uniqueCompanyIds);
        setCompanyNamesMap(namesMap);
      }
    } catch {
      setError('Không thể tải danh sách voucher');
      setVouchers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  // Filter and sort vouchers
  const filteredAndSortedVouchers = useMemo(() => {
    let filtered = [...vouchers];
    
    // Filter by type (PERCENT, AMOUNT, or ALL)
    if (filterType !== 'ALL') {
      filtered = filtered.filter(v => v.discountType === filterType);
    }
    
    // Sort by newest/oldest
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.startDate || 0);
      const dateB = new Date(b.createdAt || b.startDate || 0);
      
      if (sortBy === 'newest') {
        return dateB - dateA; // Newest first
      } else {
        return dateA - dateB; // Oldest first
      }
    });
    
    return filtered;
  }, [vouchers, filterType, sortBy]);

  const displayedVouchers = useMemo(() => {
    return filteredAndSortedVouchers.slice(0, displayCount);
  }, [filteredAndSortedVouchers, displayCount]);

  const hasMore = filteredAndSortedVouchers.length > displayCount;
  
  // Reset display count when filter changes
  useEffect(() => {
    setDisplayCount(INITIAL_DISPLAY);
  }, [filterType, sortBy]);

  const handleLoadMore = () => {
    setDisplayCount(prev => prev + LOAD_MORE_INCREMENT);
  };

  const getDaysLeftText = (voucher) => {
    if (!voucher?.endDate) return null;
    const now = new Date();
    const endDate = new Date(voucher.endDate);
    if (Number.isNaN(endDate.getTime())) return null;
    const diff = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 'Đã hết hạn';
    if (diff === 0) return 'Hết hạn hôm nay';
    return `Còn ${diff} ngày`;
  };

  const getStatusBadge = (voucher) => {
    const now = new Date();
    const endDate = voucher.endDate ? new Date(voucher.endDate) : null;
    const daysLeft = endDate ? Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)) : null;
    
    if (daysLeft !== null && daysLeft <= 7 && daysLeft > 0) {
      return (
        <span className={styles.statusBadge}>
          Còn {daysLeft} ngày
        </span>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="page-gradient">
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-gradient">
        <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <div className="text-red-500 text-xl mb-4">{error}</div>
              <button
                onClick={() => navigate('/tour')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Quay lại danh sách tour
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1450px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-transparent">
        {/* Header */}
        <div className="mb-8 px-1">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <button
              onClick={() => navigate('/tour')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#dfe5ff] text-[#1f2e55] bg-[#f8faff] hover:bg-white hover:shadow-sm transition-all"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#e6eeff] text-[#2a55c5]">
                <ChevronLeft className="h-4 w-4" />
              </span>
              <span className="font-semibold text-sm whitespace-nowrap">
                Quay lại danh sách tour
              </span>
            </button>
            <button
              onClick={() => {
                setRefreshing(true);
                fetchVouchers();
              }}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#dfe5ff] text-[#1f2e55] bg-[#f8faff] hover:bg-white hover:shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCw
                className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`}
              />
              <span className="font-semibold text-sm">
                {refreshing ? 'Đang tải…' : 'Làm mới'}
              </span>
            </button>
          </div>
          <div className="mt-4">
            <h1 className="text-3xl font-bold text-[#0f172a] tracking-tight">
              {t('tourList.voucherList.title') || 'Danh sách Voucher'}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Khám phá các voucher ưu đãi đặc biệt dành cho bạn
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-10 flex flex-wrap gap-4 items-center bg-white/90 rounded-[30px] shadow-sm px-6 py-4 border border-[#e5edff]">
          {/* Filter by Type */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600 inline-flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              Loại voucher:
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterType('ALL')}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  filterType === 'ALL'
                    ? 'bg-[#2979FF] text-white shadow-md'
                    : 'bg-[#f6f8ff] text-gray-700 border border-gray-200 hover:bg-white'
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setFilterType('PERCENT')}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  filterType === 'PERCENT'
                    ? 'bg-[#9ecbff] text-white shadow-md'
                    : 'bg-[#f6f8ff] text-gray-700 border border-gray-200 hover:bg-white'
                }`}
              >
                Giảm %
              </button>
              <button
                onClick={() => setFilterType('AMOUNT')}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  filterType === 'AMOUNT'
                    ? 'bg-[#36C2A8] text-white shadow-md'
                    : 'bg-[#f6f8ff] text-gray-700 border border-gray-200 hover:bg-white'
                }`}
              >
                Giảm tiền
              </button>
            </div>
          </div>

          {/* Sort by Newest */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-sm font-medium text-gray-700">Sắp xếp:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setSortBy('newest')}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  sortBy === 'newest'
                    ? 'bg-[#2979FF] text-white shadow-md'
                    : 'bg-[#f6f8ff] text-gray-700 border border-gray-200 hover:bg-white'
                }`}
              >
                Mới nhất
              </button>
              <button
                onClick={() => setSortBy('oldest')}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  sortBy === 'oldest'
                    ? 'bg-[#2979FF] text-white shadow-md'
                    : 'bg-[#f6f8ff] text-gray-700 border border-gray-200 hover:bg-white'
                }`}
              >
                Cũ nhất
              </button>
            </div>
          </div>

        </div>

        {/* Vouchers Grid */}
        {filteredAndSortedVouchers.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-md p-12 text-center border border-[#e4e9fb]">
            <svg
              className="mx-auto h-24 w-24 text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
              />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Không tìm thấy voucher
            </h3>
            <p className="text-gray-600 mb-6">
              {filterType !== 'ALL' 
                ? `Không có voucher loại "${filterType === 'PERCENT' ? 'Giảm %' : 'Giảm tiền'}" nào đang hoạt động`
                : 'Hiện tại không có voucher nào đang hoạt động'}
            </p>
            {filterType !== 'ALL' && (
              <button
                onClick={() => setFilterType('ALL')}
                className="px-5 py-2 bg-[#2979FF] text-white rounded-full hover:bg-[#1f62d6] transition mr-2"
              >
                Xem tất cả voucher
              </button>
            )}
            <button
              onClick={() => navigate('/tour')}
              className="px-6 py-2 bg-[#2979FF] text-white rounded-full hover:bg-[#1f62d6] transition"
            >
              Quay lại danh sách tour
            </button>
          </div>
        ) : (
          <>
            <div
              className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10 max-w-5xl mx-auto"
              style={{ gridAutoRows: '1fr' }}
            >
              {displayedVouchers.map((voucher) => (
                <div
                  key={voucher.id}
                  className={styles.voucherCard}
                >
                  {/* Status Badge */}
                  {getStatusBadge(voucher)}
                  
                  {/* LEFT SECTION - 30% with serrated edge */}
                  <div 
                    className={`${styles.leftSection} ${
                      voucher.discountType === 'PERCENT' 
                        ? styles.leftSectionPercent 
                        : styles.leftSectionAmount
                    }`}
                  >
                    {/* Discount Icon/Percentage */}
                    <div className={styles.leftContent}>
                      {voucher.discountType === 'PERCENT' ? (
                        <>
                          <div className="mb-2">
                            <Percent className={styles.discountIcon} />
                          </div>
                          <div className={styles.discountValue}>
                            <span className={styles.discountNumber}>{voucher.discountValue}</span>
                            <span className={styles.discountPercent}>%</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="mb-2">
                            <Banknote className={styles.discountIcon} />
                          </div>
                          <div className={styles.discountValue}>
                            <span className={styles.discountAmount}>
                              {formatCurrency(voucher.discountValue)}
                            </span>
                          </div>
                        </>
                      )}
                      
                      {/* Voucher Code */}
                      <div className={styles.voucherCodeContainer}>
                        <div className={styles.voucherCode}>
                          {voucher.code}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT SECTION - 70% with light background */}
                  <div className={styles.rightSection}>
                    {/* Voucher Name */}
                    <h3 className={styles.voucherName}>
                      {voucher.name}
                    </h3>

                    {/* Discount Info & Remaining */}
                    <div className={styles.discountInfoRow}>
                      <div className="flex items-center">
                        <span
                          className={`${styles.discountText} ${
                            voucher.discountType === 'PERCENT'
                              ? styles.discountTextPercent
                              : styles.discountTextAmount
                          }`}
                        >
                          {voucher.discountType === 'PERCENT' 
                            ? `Giảm ${voucher.discountValue}%`
                            : `Giảm ${formatCurrency(voucher.discountValue)}`
                          }
                        </span>
                      </div>
                      <div className={styles.remainingInfo}>
                        <Clock className={styles.remainingIcon} />
                        <span>
                          Còn {voucher.remainingQuantity !== undefined ? voucher.remainingQuantity : voucher.totalQuantity}
                        </span>
                      </div>
                    </div>

                    {/* Date Range */}
                    <div className={styles.dateRangeContainer}>
                      <div className={styles.dateRangeBox}>
                        <div className={styles.dateRangeHeader}>
                          <div className={styles.dateRangeLabel}>
                            <Calendar className={styles.dateRangeIcon} />
                            <span className={styles.dateRangeText}>Thời gian</span>
                          </div>
                          {getDaysLeftText(voucher) && (
                            <span
                              className={`${styles.daysLeftBadge} ${
                                voucher.discountType === 'PERCENT'
                                  ? styles.daysLeftBadgePercent
                                  : styles.daysLeftBadgeAmount
                              }`}
                            >
                              {getDaysLeftText(voucher)}
                            </span>
                          )}
                        </div>
                        <div className={styles.dateRangeContent}>
                          <div>
                            <span className={styles.dateRangeItem}>Từ:</span>{' '}
                            <span className={styles.dateRangeValue}>
                              {formatDate(voucher.startDate)}
                            </span>
                          </div>
                          <div>
                            <span className={styles.dateRangeItem}>Đến:</span>{' '}
                            <span className={styles.dateRangeValue}>
                              {formatDate(voucher.endDate)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className={styles.actionButtons}>
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
                      <button
                        onClick={() =>
                          navigate(`/tour/voucher?id=${voucher.id || voucher.voucherId}`)
                        }
                        className={styles.detailsButton}
                      >
                        <Eye className={styles.detailsButtonIcon} />
                        Chi tiết
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More Button - Minimal Soft Korean */}
            {hasMore && (
              <div className="flex justify-center mt-10 mb-6">
                <button
                  onClick={handleLoadMore}
                  className={styles.loadMoreButton}
                >
                  <span className={styles.loadMoreText}>Xem thêm</span>
                  <ChevronDown className={styles.loadMoreIcon} size={18} strokeWidth={1.5} />
                </button>
              </div>
            )}
          </>
        )}
        </div>
      </div>
    </div>
  );
};

export default VoucherList;

