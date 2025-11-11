import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import { useToast } from '../../../contexts/ToastContext';
import { getAllVouchers } from '../../../services/voucherAPI';
import { API_ENDPOINTS } from '../../../config/api';

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
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { showSuccess } = useToast();
  const [voucher, setVoucher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toursMap, setToursMap] = useState(new Map()); // Map tourId -> tour name

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
  const getVoucherHeaderGradient = (discountType) => {
    if (discountType === 'PERCENT') {
      return 'bg-gradient-to-r from-sky-300 via-blue-300 to-cyan-300';
    } else {
      return 'bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600';
    }
  };

  const getVoucherButtonGradient = (discountType) => {
    if (discountType === 'PERCENT') {
      return 'bg-gradient-to-r from-sky-300 via-blue-300 to-cyan-300 hover:from-sky-400 hover:via-blue-400 hover:to-cyan-400';
    } else {
      return 'bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 hover:from-blue-600 hover:via-indigo-600 hover:to-blue-700';
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
    <div className="page-gradient min-h-screen">
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
      <div 
        className="px-4 sm:px-6 lg:px-8 py-4 flex items-start justify-center" 
        style={{ 
          paddingTop: '5rem',
          paddingBottom: '2rem'
        }}
      >
        <div className="max-w-2xl w-full">
          {/* Voucher Header Card - Auto height based on content */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col">
            {/* Gradient Header */}
            <div className={`${getVoucherHeaderGradient(voucher.discountType)} p-4 text-white flex-shrink-0`}>
              <div className="flex items-start justify-between">
                  <div className="flex-1">
                  <div className="text-[10px] font-semibold uppercase tracking-wider opacity-90 mb-2">
                    Company ID: {voucher.companyId || 'N/A'}
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
                  <div className="text-xs text-white">
                    HSD: {formatDate(voucher.endDate)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-mono font-bold tracking-wider mb-1">
                    {voucher.code}
                  </div>
                  {voucher.remainingQuantity !== undefined && voucher.remainingQuantity !== null && (
                    <div className="text-[10px] opacity-90">
                      Còn lại: {voucher.remainingQuantity} voucher
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Content Sections */}
            <div className="p-4">
              <div className="space-y-3">
                {/* Thời gian sử dụng mã */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1.5">Thời gian sử dụng mã</h3>
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <div className="text-xs text-gray-700">
                      {formatDateTime(voucher.startDate)} - {formatDateTime(voucher.endDate)}
                    </div>
                  </div>
                </div>

                {/* Đơn tối thiểu - Only show if minOrderValue exists */}
                {voucher.minOrderValue && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-1.5">Đơn tối thiểu</h3>
                    <div className="bg-gray-50 rounded-lg p-2.5">
                      <div className="text-xs text-gray-700">
                        {formatCurrency(voucher.minOrderValue)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Ưu đãi */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1.5">Ưu đãi</h3>
                  <div className="bg-gray-50 rounded-lg p-2.5">
                    <p className="text-xs text-gray-700 mb-1.5">
                      Lượt sử dụng có hạn. Nhanh tay kẻo lỡ bạn nhé!
                    </p>
                    <div className="space-y-0.5 text-xs text-gray-700">
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
              <div className="mt-3">
                <h3 className="text-sm font-semibold text-gray-900 mb-1.5">Áp dụng cho tour</h3>
                <div className="bg-gray-50 rounded-lg p-2.5">
                  {voucher.tourIds && voucher.tourIds.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-700 font-semibold mb-2">
                        Voucher này áp dụng cho các tour sau:
                      </p>
                      <div className="space-y-1.5">
                        {voucher.tourIds.map((tourId, idx) => {
                          const tourName = toursMap.get(tourId) || `Tour #${tourId}`;
                          return (
                            <div key={idx} className="flex items-center text-xs text-gray-700 bg-white px-3 py-2 rounded border border-gray-200">
                              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 flex-shrink-0"></span>
                              <span>{tourName}</span>
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
            <div className="p-3 bg-gray-50 border-t border-gray-200 flex-shrink-0">
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
                className={`w-full ${getVoucherButtonGradient(voucher.discountType)} text-white py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200 hover:shadow-lg`}
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

