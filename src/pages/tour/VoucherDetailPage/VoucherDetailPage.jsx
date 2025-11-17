import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import { useToast } from '../../../contexts/ToastContext';
import { getAllVouchers } from '../../../services/voucherAPI';
import { API_ENDPOINTS } from '../../../config/api';
import { getCompanyName } from '../../../utils/companyUtils';

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
    return `${day} Th${month} ${year} ${hours}:${minutes}`;
  } catch {
    return '-';
  }
};

const VoucherDetailPage = () => {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const navigate = useNavigate();
  const { t } = useTranslation();
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

  // Get gradient colors based on voucher type
  const getVoucherHeaderGradient = (discountType) =>
    discountType === 'PERCENT' ? 'bg-[#2979FF]' : 'bg-[#36C2A8]';

  const getVoucherButtonGradient = (discountType) =>
    discountType === 'PERCENT'
      ? 'bg-[#2979FF] hover:bg-[#1f62d6]'
      : 'bg-[#36C2A8] hover:bg-[#2b9f89]';

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
      <div className="page-gradient">
        <div className="min-h-screen py-4 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !voucher) {
    return (
      <div className="page-gradient">
        <div className="min-h-screen py-4 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-6 text-center">
              <div className="text-red-500 text-base mb-4">{error || 'Voucher không tồn tại'}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        .tour-list-scrollable::-webkit-scrollbar {
          width: 8px;
        }
        .tour-list-scrollable::-webkit-scrollbar-track {
          background: #f7fafc;
          border-radius: 4px;
        }
        .tour-list-scrollable::-webkit-scrollbar-thumb {
          background: #cbd5e0;
          border-radius: 4px;
        }
        .tour-list-scrollable::-webkit-scrollbar-thumb:hover {
          background: #a0aec0;
        }
      `}</style>
      <div className="px-4 sm:px-6 lg:px-8 py-10 flex items-start justify-center">
        <div className="max-w-2xl w-full space-y-4">
          <button
            onClick={() => navigate('/tour/voucher-list')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#dfe5ff] text-[#1f2e55] bg-[#f8faff] hover:bg-white hover:shadow-sm transition font-semibold text-sm"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#e6eeff] text-[#2a55c5]">
              <ChevronLeftIcon className="h-4 w-4" />
            </span>
            <span>Quay lại danh sách voucher</span>
          </button>
          {/* Voucher Header Card - Auto height based on content */}
          <div className="bg-white rounded-[28px] shadow-lg overflow-hidden flex flex-col border border-[#e0e9ff]">
            {/* Gradient Header */}
            <div className={`${getVoucherHeaderGradient(voucher.discountType)} p-5 text-white flex-shrink-0`}>
              <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.08em] opacity-90 mb-2">
                    {companyName !== 'N/A' ? companyName : `Company ID: ${voucher.companyId || 'N/A'}`}
                  </div>
                  <div className="mb-3">
                    {voucher.discountType === 'PERCENT' ? (
                      <div className="flex items-baseline flex-wrap gap-2">
                        <span className="text-3xl font-bold text-white">Giảm {voucher.discountValue}%</span>
                      </div>
                    ) : (
                      <div className="text-3xl font-bold text-white">
                        {formatCurrency(voucher.discountValue)}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-white opacity-90">
                    HSD: {formatDate(voucher.endDate)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-mono font-bold tracking-[0.12em] mb-1">
                    {voucher.code}
                  </div>
                  {voucher.remainingQuantity !== undefined && voucher.remainingQuantity !== null && (
                    <div className="text-[11px] opacity-90">
                      Còn lại: {voucher.remainingQuantity} voucher
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Content Sections */}
            <div className="p-6 bg-white">
              <div className="space-y-4">
                {/* Thời gian sử dụng mã */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-900">Thời gian sử dụng mã</h3>
                    {getDaysLeftLabel(voucher.endDate) && (
                      <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-[#e5edff] text-[#1d2d50]">
                        {getDaysLeftLabel(voucher.endDate)}
                      </span>
                    )}
                  </div>
                        <div className="bg-[#f6f8ff] rounded-2xl p-3 border border-[#e0e9ff] space-y-2">
                          <div className="text-sm text-gray-700 font-medium">
                            Bắt đầu:
                            <span className="font-semibold ml-1">
                              {formatReadableDateTime(voucher.startDate)}
                            </span>
                          </div>
                          <div className="text-sm text-gray-700 font-medium">
                            Kết thúc:
                            <span className="font-semibold ml-1">
                              {formatReadableDateTime(voucher.endDate)}
                            </span>
                          </div>
                        </div>
                </div>

                {/* Đơn tối thiểu - Only show if minOrderValue exists */}
                {voucher.minOrderValue && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Đơn tối thiểu</h3>
                    <div className="bg-[#f6f8ff] rounded-2xl p-3 border border-[#e0e9ff]">
                      <div className="text-sm text-gray-700 font-medium">
                        {formatCurrency(voucher.minOrderValue)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Ưu đãi */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1.5">Ưu đãi</h3>
                  <div className="bg-[#fefefe] rounded-2xl p-3 border border-[#f0f0f0]">
                    <p className="text-sm text-gray-600 mb-2">
                      Lượt sử dụng có hạn. Nhanh tay kẻo lỡ bạn nhé!
                    </p>
                    <div className="space-y-1 text-sm text-gray-700">
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
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Áp dụng cho tour</h3>
                <div className="bg-[#fefefe] rounded-2xl p-3 border border-[#f0f0f0]">
                  {voucher.tourIds && voucher.tourIds.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-700 font-semibold">
                        Voucher này áp dụng cho các tour sau:
                      </p>
                      <div className="space-y-2 tour-list-scrollable max-h-48 pr-1">
                        {voucher.tourIds.map((tourId, idx) => {
                          const tourName = toursMap.get(tourId) || `Tour #${tourId}`;
                          return (
                            <div key={idx} className="flex items-center text-sm text-gray-700 bg-[#f6f8ff] px-3 py-2 rounded-2xl border border-[#e4ebff]">
                              <span className="w-2 h-2 bg-[#2979FF] rounded-full mr-2 flex-shrink-0"></span>
                              <span className="truncate">{tourName}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-700">
                      Voucher này áp dụng cho tất cả các tour của công ty.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Action Button - Fixed at bottom */}
            <div className="p-4 bg-[#f6f8ff] border-t border-[#e0e9ff] flex-shrink-0">
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(voucher.code);
                    showSuccess(`Đã sao chép mã voucher: ${voucher.code}`);
                  } catch (err) {
                    const textArea = document.createElement('textarea');
                    textArea.value = voucher.code;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    showSuccess(`Đã sao chép mã voucher: ${voucher.code}`);
                  }
                }}
                className={`w-full ${getVoucherButtonGradient(voucher.discountType)} text-white py-3 px-4 rounded-full text-sm font-semibold transition-all duration-200 shadow-sm`}
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

