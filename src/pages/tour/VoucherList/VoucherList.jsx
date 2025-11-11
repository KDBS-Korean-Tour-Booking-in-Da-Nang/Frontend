import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import { useToast } from '../../../contexts/ToastContext';
import { getAllVouchers } from '../../../services/voucherAPI';

const PAGE_SIZE = 15; // 3 rows x 5 columns

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
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
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
        const startDate = v.startDate ? new Date(v.startDate) : null;
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
    } catch (err) {
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
    setDisplayCount(PAGE_SIZE);
  }, [filterType, sortBy]);

  const handleLoadMore = () => {
    setDisplayCount(prev => prev + PAGE_SIZE);
  };

  // Get gradient colors based on voucher type
  const getVoucherHeaderGradient = (discountType) => {
    if (discountType === 'PERCENT') {
      // Giảm %: Màu xanh da trời sáng (sky/cyan)
      return 'bg-gradient-to-r from-sky-300 via-blue-300 to-cyan-300';
    } else {
      // Giảm tiền: Màu xanh da trời đậm (blue/indigo)
      return 'bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600';
    }
  };

  const getVoucherButtonGradient = (discountType) => {
    if (discountType === 'PERCENT') {
      // Giảm %: Màu xanh da trời sáng
      return 'bg-gradient-to-r from-sky-300 via-blue-300 to-cyan-300 hover:from-sky-400 hover:via-blue-400 hover:to-cyan-400';
    } else {
      // Giảm tiền: Màu xanh da trời đậm
      return 'bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 hover:from-blue-600 hover:via-indigo-600 hover:to-blue-700';
    }
  };

  const getStatusBadge = (voucher) => {
    const now = new Date();
    const endDate = voucher.endDate ? new Date(voucher.endDate) : null;
    const daysLeft = endDate ? Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)) : null;
    
    if (daysLeft !== null && daysLeft <= 7 && daysLeft > 0) {
      return (
        <span className="absolute top-2 right-2 bg-yellow-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
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
    <div className="page-gradient">
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate('/tour')}
              className="flex items-center text-sky-600 hover:text-sky-800 transition"
            >
              <ChevronLeftIcon className="h-5 w-5 mr-1" />
              <span>Quay lại danh sách tour</span>
            </button>
            <button
              onClick={() => {
                setRefreshing(true);
                fetchVouchers();
              }}
              disabled={refreshing || loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg 
                className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{refreshing ? 'Đang tải...' : 'Làm mới'}</span>
            </button>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {t('tourList.voucherList.title') || 'Danh sách Voucher'}
          </h1>
          <p className="text-gray-600">
            Khám phá các voucher ưu đãi đặc biệt dành cho bạn
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4 items-center">
          {/* Filter by Type */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Loại voucher:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterType('ALL')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterType === 'ALL'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setFilterType('PERCENT')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterType === 'PERCENT'
                    ? 'bg-sky-400 text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Giảm %
              </button>
              <button
                onClick={() => setFilterType('AMOUNT')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterType === 'AMOUNT'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Giảm tiền
              </button>
            </div>
          </div>

          {/* Sort by Newest */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Sắp xếp:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setSortBy('newest')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  sortBy === 'newest'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Mới nhất
              </button>
              <button
                onClick={() => setSortBy('oldest')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  sortBy === 'oldest'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Cũ nhất
              </button>
            </div>
          </div>

          {/* Result count */}
          <div className="ml-auto text-sm text-gray-600">
            Hiển thị {displayedVouchers.length} / {filteredAndSortedVouchers.length} voucher
          </div>
        </div>

        {/* Vouchers Grid */}
        {filteredAndSortedVouchers.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
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
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition mr-2"
              >
                Xem tất cả voucher
              </button>
            )}
            <button
              onClick={() => navigate('/tour')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Quay lại danh sách tour
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
              {displayedVouchers.map((voucher) => (
                <div
                  key={voucher.id}
                  className="relative bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group transform hover:scale-105 flex flex-col"
                >
                  {/* Status Badge */}
                  {getStatusBadge(voucher)}
                  
                  {/* Gradient Header */}
                  <div className={`${getVoucherHeaderGradient(voucher.discountType)} p-4 text-white`}>
                    <div className="flex items-center justify-start mb-1">
                      <span className="text-[10px] font-semibold opacity-90 truncate max-w-full" title={`Company ID: ${voucher.companyId || 'N/A'}`}>
                        Company ID: {voucher.companyId || 'N/A'}
                      </span>
                    </div>
                    {/* Discount Value - Centered */}
                    <div className="mb-2 text-center">
                      {voucher.discountType === 'PERCENT' ? (
                        <div className="flex items-baseline justify-center">
                          <span className="text-3xl font-bold text-white">{voucher.discountValue}</span>
                          <span className="text-xl font-semibold text-white ml-1">%</span>
                        </div>
                      ) : (
                        <div className="flex items-baseline justify-center">
                          <span className="text-2xl font-bold text-white">{formatCurrency(voucher.discountValue)}</span>
                        </div>
                      )}
                    </div>
                    {/* Voucher Code - Centered */}
                    <div className="border-t border-white border-opacity-20 pt-2 text-center">
                      <div className="text-xs font-mono font-bold tracking-wider">
                        {voucher.code}
                      </div>
                    </div>
                  </div>

                  {/* Content - Flex grow để đẩy button xuống */}
                  <div className="p-4 flex flex-col flex-grow">
                    {/* Top section - có thể co giãn */}
                    <div className="flex-grow min-h-0">
                      <h3 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2 min-h-[2.5rem]">
                        {voucher.name}
                      </h3>

                      <div className="space-y-2 mb-3">
                        <div className="flex items-center text-xs text-gray-600">
                          <svg
                            className="h-3 w-3 mr-1.5 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span className="leading-tight">Còn lại: <span className={`font-semibold ${voucher.discountType === 'PERCENT' ? 'text-sky-600' : 'text-blue-700'}`}>{voucher.remainingQuantity !== undefined ? voucher.remainingQuantity : voucher.totalQuantity}</span></span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom section - Fixed position above button */}
                    <div className="mt-auto">
                      {/* Date Range and Tour Information - Side by side */}
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        {/* Date Range */}
                        <div className="bg-gray-50 rounded-lg p-2">
                          <div className="flex items-center text-[10px] text-gray-600 mb-1">
                            <svg
                              className="h-3 w-3 mr-1 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            <span className="font-medium">Thời gian</span>
                          </div>
                          <div className="text-[10px] text-gray-700 space-y-0.5">
                            <div>Từ: <span className="font-semibold">{formatDate(voucher.startDate)}</span></div>
                            <div>Đến: <span className="font-semibold">{formatDate(voucher.endDate)}</span></div>
                          </div>
                        </div>

                        {/* View Details - Clickable */}
                        <div 
                          className="bg-blue-50 rounded-lg p-2 cursor-pointer hover:bg-blue-100 transition-colors flex items-center justify-center min-h-[60px]"
                          onClick={() => navigate(`/tour/voucher/${voucher.id || voucher.voucherId}`)}
                        >
                          <div className="flex items-center text-blue-600 font-semibold text-[10px]">
                            <svg
                              className="h-3 w-3 mr-1 text-blue-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                            <span>Chi tiết</span>
                          </div>
                        </div>
                      </div>

                      {/* Copy Code Button - Fixed at bottom */}
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(voucher.code);
                            showSuccess(`Đã sao chép mã voucher: ${voucher.code}`);
                          } catch (err) {
                            // Fallback for older browsers
                            const textArea = document.createElement('textarea');
                            textArea.value = voucher.code;
                            document.body.appendChild(textArea);
                            textArea.select();
                            document.execCommand('copy');
                            document.body.removeChild(textArea);
                            showSuccess(`Đã sao chép mã voucher: ${voucher.code}`);
                          }
                        }}
                        className={`w-full ${getVoucherButtonGradient(voucher.discountType)} text-white py-1.5 px-3 rounded-lg text-xs font-semibold transition-all duration-200`}
                      >
                        Sao chép mã
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={handleLoadMore}
                  className="bg-white text-black border-2 border-gray-300 px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Xem thêm
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

