import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { useVoucher } from '../../../hooks/useVoucher';
import { getVouchersByCompanyId, getAllVouchers } from '../../../services/voucherAPI';
import { API_ENDPOINTS } from '../../../config/api';
import VoucherCreateModal from './VoucherCreateModal';
import styles from './VoucherManagement.module.css';

const PAGE_SIZE = 15; // 3 rows x 5 columns

const formatCurrency = (value) => {
  try {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value || 0));
  } catch {
    return `${value}`;
  }
};

const VoucherManagement = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showSuccess } = useToast();
  
  // Use Redux hook for state management
  const {
    vouchers,
    loading,
    error,
    pagination,
    tours,
    allToursMap,
    setVouchers,
    setLoading,
    setError,
    setCurrentPage,
    resetPagination,
    setTours,
    setAllToursMap
  } = useVoucher();
  
  // Local state (UI only)
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [companyId, setCompanyId] = useState(null);
  const [hasAttemptedCompanyId, setHasAttemptedCompanyId] = useState(false);
  
  const currentPage = pagination.currentPage;

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
    if (!companyId) {
      return Promise.resolve();
    }
    
    const token = getToken();
    if (!token) {
      return Promise.resolve();
    }

    try {
      const response = await fetch(API_ENDPOINTS.TOURS_BY_COMPANY_ID(companyId), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Handle 401 if token expired
      if (!response.ok && response.status === 401) {
        const { checkAndHandle401 } = await import('../../../utils/apiErrorHandler');
        await checkAndHandle401(response);
        return;
      }
      
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
        
        // Create a map of tourId -> tour name for quick lookup (convert Map to Object for Redux)
        const toursMapObj = {};
        toursList.forEach(tour => {
          const tourId = tour.id || tour.tourId;
          const tourName = tour.tourName || tour.name || `Tour #${tourId}`;
          if (tourId) {
            toursMapObj[tourId] = tourName;
          }
        });
        setAllToursMap(toursMapObj);
      }
    } catch (error) {
      // Silently handle error fetching tours
      // Don't set loading false here - tours are optional for voucher creation
    }
    return Promise.resolve();
  }, [companyId, setTours, setAllToursMap]);

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
      resetPagination(); // Reset to first page when data changes
    } catch (error) {
      // Silently handle error fetching vouchers
      setError(error.message || 'Không thể tải danh sách voucher');
      setVouchers([]);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setVouchers, setError, resetPagination]);

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
      setLoading(false);
      setHasAttemptedCompanyId(true);
      return;
    }

    // Priority 1: Use user.companyId if explicitly provided
    if (user.companyId) {
      setCompanyId(user.companyId);
      setHasAttemptedCompanyId(true);
      return;
    }
    
    // Priority 2: For COMPANY role users, user.id IS the companyId
    if (user.id) {
      const userIdAsCompanyId = typeof user.id === 'number' ? user.id : parseInt(user.id);
      if (!isNaN(userIdAsCompanyId)) {
        setCompanyId(userIdAsCompanyId);
        setHasAttemptedCompanyId(true);
        return;
      }
    }

    // Priority 3: Fallback - Fetch all vouchers and find companyId from vouchers
    // VoucherResponse HAS companyId field, so we can get it from vouchers
    // This is useful when user.id is not available or user hasn't created any vouchers yet
    const token = getToken();
    if (!token) {
      setLoading(false);
      setHasAttemptedCompanyId(true);
      return;
    }

    getAllVouchers()
      .then((allVouchers) => {
        if (!Array.isArray(allVouchers) || allVouchers.length === 0) {
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
              setCompanyId(matchingVoucher.companyId);
              setHasAttemptedCompanyId(true);
              return;
            } else {
              // user.id exists but no matching voucher - use user.id anyway (user may not have created vouchers yet)
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
          setCompanyId(firstVoucher.companyId);
          setHasAttemptedCompanyId(true);
          return;
        }

        // If we get here, something is really wrong
        setLoading(false);
        setHasAttemptedCompanyId(true);
      })
      .catch((error) => {
        // If user.id exists, use it anyway (user may not have vouchers yet)
        if (user.id) {
          const userId = typeof user.id === 'number' ? user.id : parseInt(user.id);
          if (!isNaN(userId)) {
            setCompanyId(userId);
            setHasAttemptedCompanyId(true);
            return;
          }
        }
        setLoading(false);
        setHasAttemptedCompanyId(true);
      });
  }, [user, setLoading]);

  // Fetch vouchers when companyId is available
  useEffect(() => {
    if (companyId) {
      fetchVouchers(companyId);
    } else if (hasAttemptedCompanyId && !companyId) {
      // If we've attempted to get companyId but still don't have it, stop loading
      setLoading(false);
    }
  }, [companyId, fetchVouchers, hasAttemptedCompanyId, setLoading]);

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
    showSuccess(t('voucherCreate.success.created'));
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
    <>
      <div className={styles['voucher-management']}>
        {error && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fef2f2', color: '#e11d48', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}
        <div className={styles['management-header']}>
          <h2 className={styles['header-title']}>{t('voucherManagement.title')}</h2>
          {loading ? (
            <div className={styles['loading-text']}>{t('voucherManagement.loading')}</div>
          ) : (
            <button
              onClick={() => setIsCreateOpen(true)}
              disabled={!companyId}
              className={styles['create-btn']}
            >
              {t('voucherManagement.create')}
            </button>
          )}
        </div>

        {loading && (
          <div className={styles['loading-container']}>
            <div className={styles['loading-message']}>{t('voucherManagement.loadingData')}</div>
          </div>
        )}

        {!loading && (
          <div className={styles['content-wrapper']}>
            {!companyId && (
              <div className={styles['warning-box']}>
                <p className={styles['warning-title']}>{t('voucherManagement.warning.title')}</p>
                <p className={styles['warning-text']}>
                  {t('voucherManagement.warning.message')}
                  {user && (
                    <span className={styles['warning-info']}>
                      {t('voucherManagement.warning.currentInfo')} {user.role}, {t('voucherManagement.warning.userId')} {user.id || 'N/A'}
                    </span>
                  )}
                </p>
              </div>
            )}

            {vouchers.length === 0 ? (
              <div className={styles['empty-state']}>
                <p className={styles['empty-message']}>{t('voucherManagement.empty.message')}</p>
              </div>
            ) : (
              <>
                {/* Grid 3 rows x 5 columns (15 per page) */}
                <div className={styles['voucher-grid']}>
                  {pageData.map((v) => (
                    <div key={v.id || v.voucherId} className={styles['voucher-card']}>
                      <div>
                        <div className={styles['voucher-code-section']}>
                          <span className={styles['voucher-code-label']}>{t('voucherManagement.card.code')}</span>
                          <span className={styles['voucher-code']}>{v.code}</span>
                        </div>
                        <h3 className={styles['voucher-name']}>{v.name}</h3>
                        <div className={styles['voucher-info']}>{t('voucherManagement.card.type')} {v.discountType === 'PERCENT' ? t('voucherManagement.discountTypes.percent') : v.discountType === 'FIXED' ? t('voucherManagement.discountTypes.fixed') : t('voucherManagement.discountTypes.fixed')}</div>
                        <div className={styles['voucher-info']}>{t('voucherManagement.card.value')} {renderDiscount(v)}</div>
                        <div className={styles['voucher-info']}>
                          {t('voucherManagement.card.quantity')}{' '}
                          <span className={styles['quantity-highlight']}>
                            {v.totalQuantity}
                          </span>
                          {v.remainingQuantity !== undefined && (
                            <span className={styles['remaining-highlight']}>
                              {' '}({t('voucherManagement.card.remaining')} {v.remainingQuantity})
                            </span>
                          )}
                        </div>
                        <div className={styles['voucher-status']}>
                          {t('voucherManagement.card.status')}{' '}
                          <span className={
                            v.status === 'ACTIVE' ? styles['status-active'] :
                            v.status === 'EXPIRED' ? styles['status-expired'] :
                            styles['status-inactive']
                          }>
                            {t(`voucherManagement.status.${v.status}`)}
                          </span>
                        </div>
                        
                        {/* Display tours applied to this voucher */}
                        {v.tourIds && v.tourIds.length > 0 ? (
                          <div className={styles['voucher-tours']}>
                            <span className={styles['tours-label']}>{t('voucherManagement.card.appliedTo')}</span>
                            <div className={styles['tours-list']}>
                              {v.tourIds.map((tourId, idx) => {
                                const tourName = allToursMap[tourId] || `Tour #${tourId}`;
                                return (
                                  <div key={idx} className={styles['tour-item']}>
                                    • {tourName}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className={styles['tours-global']}>
                            {t('voucherManagement.card.allTours')}
                          </div>
                        )}
                      </div>
                      <div className={styles['voucher-dates']}>
                        <div>{t('voucherManagement.card.startDate')} {v.startDate ? new Date(v.startDate).toLocaleString('vi-VN') : '-'}</div>
                        <div>{t('voucherManagement.card.endDate')} {v.endDate ? new Date(v.endDate).toLocaleString('vi-VN') : '-'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Pagination - Fixed at bottom */}
            {totalPages > 1 && !loading && vouchers.length > 0 && (
              <div className={styles['pagination']}>
                <div className={styles['pagination-info']}>
                  {t('voucherManagement.pagination.showing')} <strong>{currentPage}</strong> / <strong>{totalPages}</strong> {t('voucherManagement.pagination.of')}{' '}
                  <strong>{vouchers.length}</strong> {t('voucherManagement.pagination.vouchers')}
                </div>
                <nav className={styles['pagination-nav']} aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={styles['pagination-btn']}
                  >
                    <ChevronLeftIcon className={styles['pagination-icon']} />
                  </button>
                  {new Array(totalPages).fill(null).map((_, idx) => {
                    const page = idx + 1;
                    if (totalPages <= 7 || page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`${styles['pagination-page']} ${currentPage === page ? styles['active'] : ''}`}
                        >
                          {page}
                        </button>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return <span key={page} className={styles['pagination-ellipsis']}>...</span>;
                    }
                    return null;
                  })}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={styles['pagination-btn']}
                  >
                    <ChevronRightIcon className={styles['pagination-icon']} />
                  </button>
                </nav>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Modal - Rendered outside voucher management container */}
      <VoucherCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={handleCreateSuccess}
        tours={tours}
        companyId={companyId}
      />
    </>
  );
};

export default VoucherManagement;


