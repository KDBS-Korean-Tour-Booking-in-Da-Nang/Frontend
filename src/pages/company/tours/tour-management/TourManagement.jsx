import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  LinkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MapPinIcon,
  ClockIcon,
  UserGroupIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../contexts/ToastContext';
import EditTourModal from '../wizard/modals/EditTourModal';
import DeleteConfirmModal from '../../../../components/modals/DeleteConfirmModal/DeleteConfirmModal';
import ShareTourModal from '../../../../components/modals/ShareTourModal/ShareTourModal';
import styles from './TourManagement.module.css';
import { API_ENDPOINTS, getImageUrl } from '../../../../config/api';

const TourManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess } = useToast();
  const { t } = useTranslation();

  const [tours, setTours] = useState([]);
  const [allTours, setAllTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedTour, setSelectedTour] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareTourId, setShareTourId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8); // 2 rows x 4 columns
  const [error, setError] = useState('');
  const [companyId, setCompanyId] = useState(null);
  const [deleteNote, setDeleteNote] = useState('');

  // Check if user has COMPANY role
  const isBusinessUser = user && user.role === 'COMPANY';

  // Extract companyId từ user object: thử nhiều field names có thể (companyId, companyID, company.companyId, company.id, id), chỉ extract nếu user.role === 'COMPANY' hoặc 'BUSINESS'
  useEffect(() => {
    if (!user) {
      setCompanyId(null);
      return;
    }

    const isCompanyUser = user.role === 'COMPANY' || user.role === 'BUSINESS';
    if (!isCompanyUser) {
      setCompanyId(null);
      return;
    }

    const derivedCompanyId =
      user.companyId ??
      user.companyID ??
      user.company?.companyId ??
      user.company?.id ??
      user.id ??
      null;

    setCompanyId(derivedCompanyId ?? null);
  }, [user]);

  // Fetch tất cả tours cho company: filter out DISABLED tours (soft-deleted tours có bookings), gọi TOURS_BY_COMPANY_ID endpoint, handle 401 với checkAndHandle401
  const fetchTours = useCallback(async () => {
    if (!companyId) {
      setAllTours([]);
      setLoading(false);
      return;
    }

    // Get token for authentication
    const remembered = localStorage.getItem('rememberMe') === 'true';
    const storage = remembered ? localStorage : sessionStorage;
    const token = storage.getItem('token');

    if (!token) {
      setError(t('toast.login_required') || 'Vui lòng đăng nhập');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(API_ENDPOINTS.TOURS_BY_COMPANY_ID(companyId), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok && response.status === 401) {
        const { checkAndHandle401 } = await import('../../../../utils/apiErrorHandler');
        await checkAndHandle401(response);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        const activeTours = Array.isArray(data)
          ? data.filter(tour => tour.tourStatus !== 'DISABLED')
          : [];
        setAllTours(activeTours);
      } else {
        setError(t('toast.tour.load_failed') || 'Không thể tải danh sách tour');
      }
    } catch (error) {
      setError(t('toast.tour.load_error') || 'Lỗi khi tải tour');
    } finally {
      setLoading(false);
    }
  }, [companyId, t]);

  // Fetch tours khi user là COMPANY và companyId có sẵn: gọi fetchTours nếu isBusinessUser và companyId có giá trị
  useEffect(() => {
    if (isBusinessUser && companyId) {
      fetchTours();
    }
  }, [isBusinessUser, companyId, fetchTours]);

  // Calculate paginated tours for current page
  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedTours = allTours.slice(startIndex, endIndex);
    setTours(paginatedTours);
  }, [allTours, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(allTours.length / itemsPerPage);

  // Xử lý pagination page change và scroll to top: validate page trong range, set currentPage, scroll window to top với smooth behavior
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Navigate to tour creation wizard
  const handleCreateTour = () => {
    navigate('/company/tours/wizard');
  };

  // Mở edit modal cho tour được chọn: fetch fresh tour data từ API để get latest updates, set selectedTour và mở edit modal, handle 401
  const handleEditTour = async (tourId) => {
    const remembered = localStorage.getItem('rememberMe') === 'true';
    const storage = remembered ? localStorage : sessionStorage;
    const token = storage.getItem('token');

    if (!token) {
      setError(t('toast.login_required') || 'Vui lòng đăng nhập');
      return;
    }

    try {
      // Fetch fresh tour data from API to get latest updates
      const response = await fetch(API_ENDPOINTS.TOUR_BY_ID(tourId), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok && response.status === 401) {
        const { checkAndHandle401 } = await import('../../../../utils/apiErrorHandler');
        await checkAndHandle401(response);
        return;
      }

      if (response.ok) {
        const freshTourData = await response.json();
        setSelectedTour(freshTourData);
        setEditModalOpen(true);
      } else {
        const tour = tours.find(t => t.id === tourId);
        if (tour) {
          setSelectedTour(tour);
          setEditModalOpen(true);
        }
      }
    } catch (error) {
      const tour = tours.find(t => t.id === tourId);
      if (tour) {
        setSelectedTour(tour);
        setEditModalOpen(true);
      }
    }
  };

  // Navigate đến tour detail page: navigate đến /tour/detail với tourId và state fromManagement = true
  const openTourDetail = (tourId) => {
    navigate(`/tour/detail?id=${tourId}`, { state: { fromManagement: true } });
  };

  // Mở delete confirmation modal cho tour được chọn: tìm tour trong tours list, set selectedTour và deleteNote, mở delete modal
  const handleDeleteTour = (tourId) => {
    const tour = tours.find(t => t.id === tourId);
    if (tour) {
      setSelectedTour(tour);
      setDeleteNote('');
      setDeleteModalOpen(true);
    }
  };

  // Delete tour: gửi delete request đến admin để approval, gọi TOUR_DELETE_REQUEST endpoint với deleteNote, refresh tours list sau khi thành công, handle 401
  const confirmDeleteTour = async () => {
    if (!selectedTour) return;

    // Get token for authentication
    const remembered = localStorage.getItem('rememberMe') === 'true';
    const storage = remembered ? localStorage : sessionStorage;
    const token = storage.getItem('token');

    if (!token) {
      setError(t('toast.login_required') || 'Vui lòng đăng nhập');
      setDeleteModalOpen(false);
      setSelectedTour(null);
      setDeleteNote('');
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.TOUR_DELETE_REQUEST(selectedTour.id), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ note: deleteNote || null })
      });

      if (!response.ok && response.status === 401) {
        const { checkAndHandle401 } = await import('../../../../utils/apiErrorHandler');
        await checkAndHandle401(response);
        return;
      }

      if (response.ok) {
        // Delete request submitted successfully - pending admin approval
        showSuccess({ i18nKey: 'toast.tour.delete_request_submitted' });
      } else {
        setError(t('toast.tour.delete_error') || 'Không thể gửi yêu cầu xóa');
      }
    } catch (error) {
      setError(t('toast.tour.delete_error') || 'Không thể gửi yêu cầu xóa');
    } finally {
      setDeleteModalOpen(false);
      setSelectedTour(null);
      setDeleteNote('');
    }
  };

  // Refresh tours list after successful edit
  const handleEditSave = () => {
    fetchTours();
  };

  // Format price as Vietnamese number format
  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN').format(price);
  };

  // Extract number of days from duration string and format
  const formatDuration = (duration) => {
    if (!duration) return t('tourManagement.card.durationZero');
    // Extract number from duration string (e.g., "5 ngày 4 đêm")
    const match = duration.match(/(\d+)/);
    return match ? t('tourManagement.card.durationDays', { days: match[1] }) : duration;
  };

  const formatAdvanceDays = (tour) => {
    const val = tour.minAdvancedDays ?? tour.tourDeadline;
    if (val === null || val === undefined) return null;
    return `${val} ${t('tourWizard.step1.summary.days')}`;
  };

  const formatDeposit = (tour) => {
    if (tour.depositPercentage === null || tour.depositPercentage === undefined) return null;
    return `${tour.depositPercentage}%`;
  };

  // Get translated status label with fallback to status value
  const getStatusLabel = (status) => {
    if (!status) return t('tourManagement.statusBadge.UNKNOWN');
    const statusUpper = status.toUpperCase();
    const translationKey = `tourManagement.statusBadge.${statusUpper}`;
    return t(translationKey, { defaultValue: status });
  };

  // Normalize departure point value to localized Da Nang label
  const localizeDeparturePoint = (value) => {
    if (!value) return t('common.departurePoints.daNang');
    const variants = [
      'Đà Nẵng',
      'Da Nang',
      '다낭',
      t('common.departurePoints.daNang')
    ];
    return variants.includes(String(value).trim()) ? t('common.departurePoints.daNang') : value;
  };

  // Normalize tour image path: handle full URLs, relative paths, and Azure storage URLs
  const getImageSrc = (tourImgPath) => {
    if (!tourImgPath) return '';
    const trimmed = tourImgPath.trim();

    // Check if path contains full URL (handles cases where backend stores full Azure URL)
    if (trimmed.includes('https://') || trimmed.includes('http://')) {
      // Extract the full URL from the path
      const httpsIndex = trimmed.indexOf('https://');
      const httpIndex = trimmed.indexOf('http://');
      const urlStartIndex = httpsIndex >= 0 ? httpsIndex : httpIndex;
      if (urlStartIndex >= 0) {
        return trimmed.substring(urlStartIndex);
      }
    }

    if (trimmed.startsWith('/https://') || trimmed.startsWith('/http://')) {
      return trimmed.substring(1); // Loại bỏ dấu / ở đầu
    }
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    // Normalize relative paths: handle both "/uploads/..." and filename-only formats
    const normalized = trimmed.startsWith('/uploads')
      ? trimmed
      : `/uploads/tours/thumbnails/${trimmed.split('/').pop()}`;
    return getImageUrl(normalized);
  };

  // Show loading if user is not loaded yet
  if (!user) {
    return (
      <div className={styles['tour-management']}>
        <div className={styles['loading-container']}>
          <div className={styles['loading-spinner']}></div>
          <p>{t('tourManagement.loading.user')}</p>
        </div>
      </div>
    );
  }

  if (!isBusinessUser) {
    return (
      <div className={styles['tour-management']}>
        <div className={styles['access-denied']}>
          <h1>{t('tourManagement.accessDenied.title')}</h1>
          <p>{t('tourManagement.accessDenied.message')}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles['tour-management']}>
        <div className={styles['loading-container']}>
          <div className={styles['loading-spinner']}></div>
          <p>{t('tourManagement.loading.tours')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles['tour-management']}>
      {/* Header */}
      <div className={styles['management-header']}>
        <div className={styles['header-content']}>
          <div className={styles['header-title']}>
            <h1>{t('tourManagement.header.title')}</h1>
            <p className={styles['header-subtitle']}>{t('tourManagement.header.subtitle', { defaultValue: 'Quản lý tất cả các tour của bạn' })}</p>
          </div>
          <button
            onClick={handleCreateTour}
            className={styles['add-tour-btn']}
          >
            <PlusIcon className={styles['btn-icon']} />
            <span>{t('tourManagement.header.addNew')}</span>
          </button>
        </div>
      </div>

      {/* Tour Cards */}
      <div className={styles['tours-container']}>
        {allTours.length === 0 ? (
          <div className={styles['empty-state']}>
            <h3>{t('tourManagement.empty.title')}</h3>
            <p>{t('tourManagement.empty.description')}</p>
            <button
              onClick={handleCreateTour}
              className={styles['create-first-tour-btn']}
            >
              {t('tourManagement.empty.createFirst')}
            </button>
          </div>
        ) : (
          <>
            <div className={styles['tours-grid']}>
              {tours.map((tour) => (
                <div
                  key={tour.id}
                  className={styles['tour-card']}
                  onClick={() => openTourDetail(tour.id)}
                  style={{ cursor: 'pointer' }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') openTourDetail(tour.id); }}
                >
                  {/* Tour Image */}
                  <div className={styles['tour-image-container']} style={{ height: '250px' }}>
                    {tour.tourImgPath ? (
                      <img
                        src={getImageSrc(tour.tourImgPath)}
                        alt={tour.tourName}
                        className={styles['tour-image']}
                        onError={(e) => {
                          e.target.src = '/default-Tour.jpg';
                        }}
                      />
                    ) : (
                      <div className={styles['tour-image-placeholder']}>
                        <div className={styles['placeholder-icon']}>🏞️</div>
                      </div>
                    )}

                    {/* Status Badge */}
                    <div className={`${styles['status-badge']} ${styles[tour.tourStatus?.toLowerCase() || 'active']}`}>
                      {getStatusLabel(tour.tourStatus)}
                    </div>
                  </div>

                  {/* Tour Info */}
                  <div className={styles['tour-info']}>
                    <h3 className={styles['tour-name']}>{tour.tourName}</h3>

                    <div className={styles['tour-price']}>
                      <span className={styles['price-label']}>{t('tourManagement.card.priceLabel')}</span>
                      <span className={styles['price-value']}>{formatPrice(tour.adultPrice)}₫</span>
                    </div>

                    <div className={styles['tour-details']}>
                      <div className={styles['detail-column']}>
                        <div className={styles['detail-item']}>
                          <ClockIcon className={styles['detail-icon']} />
                          <span className={styles['detail-value']}>{formatDuration(tour.tourDuration)}</span>
                        </div>
                        {formatAdvanceDays(tour) && (
                          <div className={styles['detail-item']}>
                            <ClockIcon className={styles['detail-icon']} />
                            <span className={styles['detail-value']}>{formatAdvanceDays(tour)}</span>
                          </div>
                        )}
                        {formatDeposit(tour) && (
                          <div className={styles['detail-item']}>
                            <ClockIcon className={styles['detail-icon']} />
                            <span className={styles['detail-value']}>{t('tourWizard.step4.preview.fields.depositPercentage', 'Deposit')}: {formatDeposit(tour)}</span>
                          </div>
                        )}
                      </div>
                      <div className={styles['detail-column']}>
                        <div className={styles['detail-item']}>
                          <UserGroupIcon className={styles['detail-icon']} />
                          <span className={styles['detail-value']}>
                            {(tour.amount !== null && tour.amount !== undefined && tour.amount <= 5 && tour.amount > 0) ? (
                              <>
                                <span className={styles['detail-value-warning']}>{tour.amount}</span>
                                {' '}
                                {t('tourManagement.card.packagesUnit')}
                                <ExclamationTriangleIcon className={`${styles['detail-icon']} ${styles['warning-icon']}`} />
                              </>
                            ) : (
                              <>
                                {tour.amount || '0'} {t('tourManagement.card.packagesUnit')}
                              </>
                            )}
                          </span>
                        </div>
                        <div className={styles['detail-item']}>
                          <MapPinIcon className={styles['detail-icon']} />
                          <span className={styles['detail-value']}>{localizeDeparturePoint(tour.tourDeparturePoint)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className={styles['tour-controls']}>
                      <div className={styles['action-buttons']}>
                        {tour.tourStatus?.toUpperCase() !== 'NOT_APPROVED' && tour.tourStatus?.toUpperCase() !== 'PENDING' && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEditTour(tour.id); }}
                              className={styles['edit-btn']}
                              title={t('tourManagement.actions.edit')}
                            >
                              <PencilIcon className={styles['action-icon']} />
                              <span>{t('tourManagement.actions.edit')}</span>
                            </button>

                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteTour(tour.id); }}
                              className={styles['delete-btn']}
                              title={t('tourManagement.actions.delete')}
                            >
                              <TrashIcon className={styles['action-icon']} />
                              <span>{t('tourManagement.actions.delete')}</span>
                            </button>
                          </>
                        )}

                        {tour.tourStatus?.toUpperCase() !== 'NOT_APPROVED' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setShareTourId(tour.id); setShareOpen(true); }}
                            className={styles['share-btn']}
                            title={t('tourCard.share') || 'Chia sẻ'}
                          >
                            <LinkIcon className={styles['action-icon']} />
                            <span>{t('tourCard.share') || 'Chia sẻ'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={styles['pagination']}>
                <div className={styles['pagination-info']}>
                  <span>
                    {t('bookingManagement.tourSelector.pagination.showing')} <strong>{currentPage}</strong> / <strong>{totalPages}</strong> ({allTours.length} {t('bookingManagement.tourSelector.pagination.tours')})
                  </span>
                </div>
                <div className={styles['pagination-controls']}>
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={styles['pagination-button']}
                  >
                    <ChevronLeftIcon className={styles['pagination-icon']} />
                  </button>
                  {[...Array(totalPages)].map((_, idx) => {
                    const page = idx + 1;
                    if (totalPages <= 7 || page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`${styles['pagination-button']} ${currentPage === page ? styles['active'] : ''}`}
                        >
                          {page}
                        </button>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return <span key={page} className={styles['pagination-dots']}>...</span>;
                    }
                    return null;
                  })}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={styles['pagination-button']}
                  >
                    <ChevronRightIcon className={styles['pagination-icon']} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Tour Modal */}
      <EditTourModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedTour(null);
        }}
        tour={selectedTour}
        onSave={handleEditSave}
      />

      {/* Delete Request Modal with Note Input - Minimal Soft Korean Style */}
      {deleteModalOpen && createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center z-[9999] p-4"
          style={{
            background: 'rgba(0, 0, 0, 0.25)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)'
          }}
        >
          <div
            className="w-full max-w-md overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, #ffffff 0%, #fafbfc 100%)',
              borderRadius: '28px',
              boxShadow: '0 25px 80px rgba(0, 0, 0, 0.08), 0 10px 30px rgba(0, 0, 0, 0.04)',
              border: '1px solid rgba(0, 0, 0, 0.04)',
              animation: 'modalFadeIn 0.3s ease-out'
            }}
          >
            {/* Modal Content */}
            <div style={{ padding: '32px 28px 28px' }}>
              {/* Icon Container - Soft pastel background */}
              <div
                className="mx-auto mb-5 flex items-center justify-center"
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '24px',
                  background: 'linear-gradient(145deg, #fff5f5 0%, #ffe8e8 100%)',
                  border: '1px solid rgba(239, 68, 68, 0.1)'
                }}
              >
                <TrashIcon
                  style={{
                    width: '28px',
                    height: '28px',
                    color: '#ef4444',
                    strokeWidth: '1.5'
                  }}
                />
              </div>

              {/* Title */}
              <h3
                className="text-center mb-2"
                style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#1a1a2e',
                  letterSpacing: '-0.02em'
                }}
              >
                {t('tourManagement.modals.delete.title')}
              </h3>

              {/* Description */}
              <p
                className="text-center mb-5"
                style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  lineHeight: '1.6'
                }}
              >
                {t('tourManagement.modals.delete.message', { name: selectedTour?.tourName || '' })}
              </p>

              {/* Note Input Section */}
              <div style={{ marginBottom: '24px' }}>
                <label
                  className="block mb-2"
                  style={{
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#4b5563',
                    letterSpacing: '-0.01em'
                  }}
                >
                  {t('tourManagement.modals.delete.noteLabel')}
                </label>
                <textarea
                  value={deleteNote}
                  onChange={(e) => setDeleteNote(e.target.value)}
                  placeholder={t('tourManagement.modals.delete.notePlaceholder')}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '20px',
                    border: '1px solid #e5e7eb',
                    background: '#fafbfc',
                    fontSize: '14px',
                    color: '#374151',
                    resize: 'none',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    lineHeight: '1.5'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#fca5a5';
                    e.target.style.boxShadow = '0 0 0 4px rgba(252, 165, 165, 0.15)';
                    e.target.style.background = '#ffffff';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                    e.target.style.background = '#fafbfc';
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setSelectedTour(null);
                    setDeleteNote('');
                  }}
                  style={{
                    flex: 1,
                    padding: '14px 20px',
                    borderRadius: '20px',
                    border: '1px solid #e5e7eb',
                    background: '#ffffff',
                    color: '#4b5563',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#f9fafb';
                    e.target.style.borderColor = '#d1d5db';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#ffffff';
                    e.target.style.borderColor = '#e5e7eb';
                  }}
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={confirmDeleteTour}
                  style={{
                    flex: 1,
                    padding: '14px 20px',
                    borderRadius: '20px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 14px rgba(239, 68, 68, 0.25)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.35)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 14px rgba(239, 68, 68, 0.25)';
                  }}
                >
                  {t('tourManagement.modals.delete.confirm')}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Share Tour Modal */}
      <ShareTourModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        tourId={shareTourId}
        onShared={() => {
          setShareOpen(false);
        }}
      />
    </div>
  );
};

export default TourManagement;
