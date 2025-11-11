import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { getVouchersByCompanyId, getAllVouchers } from '../../../services/voucherAPI';
import { API_ENDPOINTS } from '../../../config/api';
import VoucherCreateModal from './VoucherCreateModal';

const PAGE_SIZE = 15; // 3 rows x 5 columns

const formatCurrency = (value) => {
  try {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value || 0));
  } catch {
    return `${value}`;
  }
};

const VoucherManagement = () => {
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
  const [vouchers, setVouchers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [tours, setTours] = useState([]); // Tours for dropdown in modal
  const [allToursMap, setAllToursMap] = useState(new Map()); // Map tourId -> tour name for display
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState(null);
  const [hasAttemptedCompanyId, setHasAttemptedCompanyId] = useState(false);

  // Get token for authentication
  const getToken = () => {
    const remembered = localStorage.getItem('rememberMe') === 'true';
    const storage = remembered ? localStorage : sessionStorage;
    return storage.getItem('token');
  };

  // Fetch tours for dropdown (only for selecting tours in voucher creation modal)
  // Also create a map of tourId -> tour name for displaying tour names in voucher list
  // NOTE: TourResponse does NOT include companyId, so we cannot get companyId from tours
  // We get companyId from user.id (for COMPANY role users)
  const fetchTours = useCallback(async () => {
    const token = getToken();
    if (!token) {
      return Promise.resolve();
    }

    try {
      const response = await fetch(API_ENDPOINTS.TOURS, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const toursList = Array.isArray(data) ? data : [];
        // Map tours for dropdown selection in modal
        // TourResponse does NOT have companyId, so we can't use it to get companyId
        const toursForDropdown = toursList.map(tour => ({ 
          id: tour.id || tour.tourId, 
          name: tour.tourName || tour.name || `Tour #${tour.id || tour.tourId}` 
        }));
        setTours(toursForDropdown);
        
        // Create a map of tourId -> tour name for quick lookup
        const toursMap = new Map();
        toursList.forEach(tour => {
          const tourId = tour.id || tour.tourId;
          const tourName = tour.tourName || tour.name || `Tour #${tourId}`;
          if (tourId) {
            toursMap.set(tourId, tourName);
          }
        });
        setAllToursMap(toursMap);
      }
    } catch (error) {
      console.error('Error fetching tours:', error);
      // Don't set loading false here - tours are optional for voucher creation
    }
    return Promise.resolve();
  }, []);

  // Fetch tours when companyId is available (for dropdown in modal)
  useEffect(() => {
    if (companyId) {
      fetchTours();
    }
  }, [companyId, fetchTours]);

  // Fetch vouchers
  const fetchVouchers = useCallback(async (cid) => {
    if (!cid) return;

    const token = getToken();
    if (!token) {
      showError('Vui lòng đăng nhập để xem vouchers');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await getVouchersByCompanyId(cid);
      // Map backend response to frontend format
      // Include tourIds from VoucherResponse
      const mappedVouchers = Array.isArray(data) ? data.map(v => ({
        id: v.voucherId || v.id,
        companyId: v.companyId,
        code: v.code,
        name: v.name,
        discountType: v.discountType,
        discountValue: v.discountValue,
        minOrderValue: v.minOrderValue,
        totalQuantity: v.totalQuantity,
        remainingQuantity: v.remainingQuantity,
        startDate: v.startDate,
        endDate: v.endDate,
        status: v.status,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
        tourIds: v.tourIds || [] // Include tourIds from backend response
      })) : [];
      setVouchers(mappedVouchers);
      setCurrentPage(1); // Reset to first page when data changes
    } catch (error) {
      console.error('Error fetching vouchers:', error);
      showError(error.message || 'Không thể tải danh sách voucher');
      setVouchers([]);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  // Get companyId from user or vouchers
  // Priority: user.companyId > user.id (for COMPANY role) > fetch from vouchers
  useEffect(() => {
    if (!user) {
      setLoading(false);
      setHasAttemptedCompanyId(true);
      return;
    }

    // Check if user has COMPANY role
    const isCompanyUser = user.role === 'COMPANY' || user.role === 'BUSINESS';
    
    if (!isCompanyUser) {
      console.warn('User does not have COMPANY role:', user.role);
      setLoading(false);
      setHasAttemptedCompanyId(true);
      return;
    }

    // Priority 1: Use user.companyId if explicitly provided
    if (user.companyId) {
      console.log('✅ Using user.companyId:', user.companyId);
      setCompanyId(user.companyId);
      setHasAttemptedCompanyId(true);
      return;
    }
    
    // Priority 2: For COMPANY role users, user.id IS the companyId
    if (user.id) {
      const userIdAsCompanyId = typeof user.id === 'number' ? user.id : parseInt(user.id);
      if (!isNaN(userIdAsCompanyId)) {
        console.log('✅ Using user.id as companyId for COMPANY user:', userIdAsCompanyId);
        setCompanyId(userIdAsCompanyId);
        setHasAttemptedCompanyId(true);
        return;
      }
    }

    // Priority 3: Fallback - Fetch all vouchers and find companyId from vouchers
    // VoucherResponse HAS companyId field, so we can get it from vouchers
    // This is useful when user.id is not available or user hasn't created any vouchers yet
    console.log('⚠️ Cannot get companyId from user object, trying fallback: fetch from vouchers...');
    const token = getToken();
    if (!token) {
      console.error('❌ No token available for fallback');
      setLoading(false);
      setHasAttemptedCompanyId(true);
      return;
    }

    getAllVouchers()
      .then((allVouchers) => {
        if (!Array.isArray(allVouchers) || allVouchers.length === 0) {
          console.warn('⚠️ No vouchers found - user may need to create their first voucher');
          // Still allow creating voucher - companyId will be set when creating first voucher
          setLoading(false);
          setHasAttemptedCompanyId(true);
          return;
        }

        // Strategy 1: If user.id exists, try to find voucher with matching companyId
        // This confirms that user.id is indeed the companyId
        if (user.id) {
          const userId = typeof user.id === 'number' ? user.id : parseInt(user.id);
          if (!isNaN(userId)) {
            const matchingVoucher = allVouchers.find(v => v.companyId === userId);
            if (matchingVoucher) {
              console.log('✅ Found companyId from vouchers (confirms user.id = companyId):', matchingVoucher.companyId);
              setCompanyId(matchingVoucher.companyId);
              setHasAttemptedCompanyId(true);
              return;
            } else {
              // user.id exists but no matching voucher - use user.id anyway (user may not have created vouchers yet)
              console.log('⚠️ No voucher found matching user.id, but using user.id as companyId:', userId);
              setCompanyId(userId);
              setHasAttemptedCompanyId(true);
              return;
            }
          }
        }

        // Strategy 2: Get companyId from first voucher (last resort)
        // Only use this if user.id is completely unavailable
        const firstVoucher = allVouchers[0];
        if (firstVoucher && firstVoucher.companyId) {
          console.log('⚠️ Using companyId from first voucher (last resort fallback):', firstVoucher.companyId);
          setCompanyId(firstVoucher.companyId);
          setHasAttemptedCompanyId(true);
          return;
        }

        // If we get here, something is really wrong
        console.error('❌ Cannot determine companyId from vouchers either');
        setLoading(false);
        setHasAttemptedCompanyId(true);
      })
      .catch((error) => {
        console.error('❌ Error fetching vouchers for fallback:', error);
        // If user.id exists, use it anyway (user may not have vouchers yet)
        if (user.id) {
          const userId = typeof user.id === 'number' ? user.id : parseInt(user.id);
          if (!isNaN(userId)) {
            console.log('⚠️ Fallback failed, but using user.id as companyId:', userId);
            setCompanyId(userId);
            setHasAttemptedCompanyId(true);
            return;
          }
        }
        setLoading(false);
        setHasAttemptedCompanyId(true);
      });
  }, [user]);

  // Fetch vouchers when companyId is available
  useEffect(() => {
    if (companyId) {
      fetchVouchers(companyId);
    } else if (hasAttemptedCompanyId && !companyId) {
      // If we've attempted to get companyId but still don't have it, stop loading
      setLoading(false);
    }
  }, [companyId, fetchVouchers, hasAttemptedCompanyId]);

  // Debug: Log user info for troubleshooting
  useEffect(() => {
    if (user) {
      console.log('User info:', {
        id: user.id,
        role: user.role,
        companyId: user.companyId,
        email: user.email
      });
    }
  }, [user]);

  const totalPages = Math.max(1, Math.ceil((vouchers?.length || 0) / PAGE_SIZE));
  const pageData = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return vouchers.slice(start, start + PAGE_SIZE);
  }, [vouchers, currentPage]);

  const handleCreateSuccess = () => {
    setIsCreateOpen(false);
    // Refetch vouchers after creation
    if (companyId) {
      fetchVouchers(companyId);
    }
    showSuccess('Tạo voucher thành công');
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const renderDiscount = (v) => {
    if (v.discountType === 'PERCENT') {
      return `${v.discountValue}%`;
    }
    return formatCurrency(v.discountValue);
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Quản lý Voucher</h2>
        {loading ? (
          <div className="px-4 py-2 text-gray-500">Đang tải...</div>
        ) : (
          <button
            onClick={() => setIsCreateOpen(true)}
            disabled={!companyId}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Tạo voucher
          </button>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Đang tải dữ liệu...</div>
        </div>
      )}

      {!loading && (
        <>

          {!companyId && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
              <p className="text-yellow-800 font-semibold mb-2">Không tìm thấy thông tin công ty.</p>
              <p className="text-yellow-700 text-sm">
                Vui lòng đảm bảo bạn đã đăng nhập với tài khoản có vai trò COMPANY và thông tin user đã được cập nhật đúng.
                {user && (
                  <span className="block mt-2 text-xs">
                    Thông tin hiện tại: Role = {user.role}, User ID = {user.id || 'N/A'}
                  </span>
                )}
              </p>
            </div>
          )}

          {vouchers.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">Chưa có voucher nào. Hãy tạo voucher đầu tiên!</p>
            </div>
          ) : (
            <>
              {/* Grid 3 rows x 5 columns (15 per page) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {pageData.map((v) => (
                  <div key={v.id || v.voucherId} className="bg-white rounded-lg shadow p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500">Mã</span>
                        <span className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">{v.code}</span>
                      </div>
                      <h3 className="text-lg font-semibold mb-1">{v.name}</h3>
                      <div className="text-sm text-gray-700 mb-1">Loại: {v.discountType === 'PERCENT' ? 'Giảm theo %' : v.discountType === 'FIXED' ? 'Giảm theo tiền' : 'Giảm theo tiền'}</div>
                      <div className="text-sm text-gray-700 mb-1">Giá trị: {renderDiscount(v)}</div>
                      <div className="text-sm text-gray-700 mb-1">Số lượng: {v.totalQuantity} ({v.remainingQuantity !== undefined ? `Còn lại: ${v.remainingQuantity}` : ''})</div>
                      <div className="text-sm text-gray-700 mb-1">Trạng thái: <span className={`font-semibold ${v.status === 'ACTIVE' ? 'text-green-600' : v.status === 'EXPIRED' ? 'text-red-600' : 'text-gray-600'}`}>{v.status}</span></div>
                      
                      {/* Display tours applied to this voucher */}
                      {v.tourIds && v.tourIds.length > 0 ? (
                        <div className="text-sm text-gray-700 mb-1 mt-2">
                          <div className="font-semibold mb-1">Áp dụng cho tour:</div>
                          <div className="text-xs space-y-1 max-h-20 overflow-y-auto">
                            {v.tourIds.map((tourId, idx) => {
                              const tourName = allToursMap.get(tourId) || `Tour #${tourId}`;
                              return (
                                <div key={idx} className="bg-blue-50 px-2 py-0.5 rounded text-blue-700">
                                  • {tourName}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 mb-1 mt-2 italic">
                          Áp dụng cho tất cả tour
                        </div>
                      )}
                    </div>
                    <div className="mt-3 text-xs text-gray-500">
                      <div>Bắt đầu: {v.startDate ? new Date(v.startDate).toLocaleString('vi-VN') : '-'}</div>
                      <div>Hết hạn: {v.endDate ? new Date(v.endDate).toLocaleString('vi-VN') : '-'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Pagination */}
          {totalPages > 0 && !loading && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Trước
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sau
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Hiển thị trang <span className="font-medium">{currentPage}</span> / <span className="font-medium">{totalPages}</span> của{' '}
                <span className="font-medium">{vouchers.length}</span> voucher
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Trước</span>
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
                {new Array(totalPages).fill(null).map((_, idx) => {
                  const page = idx + 1;
                  if (totalPages <= 7 || page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === page
                            ? 'z-10 bg-red-600 border-red-600 text-white'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return <span key={page} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">...</span>;
                  }
                  return null;
                })}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Sau</span>
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
              </nav>
            </div>
            </div>
          </div>
        )}
        </>
      )}

      {/* Create Modal */}
      {isCreateOpen && (
        <VoucherCreateModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={handleCreateSuccess}
          tours={tours}
          companyId={companyId}
        />
      )}
    </div>
  );
};

export default VoucherManagement;


