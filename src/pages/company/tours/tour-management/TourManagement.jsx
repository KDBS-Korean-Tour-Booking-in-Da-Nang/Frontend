import { useState, useEffect, useCallback, useRef } from 'react';
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
  UserGroupIcon
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
  const { showError, showSuccess } = useToast();
  const showErrorRef = useRef(showError);
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
  
  // Update ref when showError changes
  useEffect(() => {
    showErrorRef.current = showError;
  }, [showError]);

  // Check if user has business role
  const isBusinessUser = user && user.role === 'COMPANY';
  
  const fetchTours = useCallback(async () => {
    if (!user?.email) return;
    
    // Get token for authentication
    const remembered = localStorage.getItem('rememberMe') === 'true';
    const storage = remembered ? localStorage : sessionStorage;
    const token = storage.getItem('token');
    
    if (!token) {
      showErrorRef.current('toast.login_required');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch(API_ENDPOINTS.TOURS, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Filter out DISABLED tours - these are soft-deleted tours (tours with bookings)
        const activeTours = Array.isArray(data) 
          ? data.filter(tour => tour.tourStatus !== 'DISABLED')
          : [];
        setAllTours(activeTours);
      } else {
        showErrorRef.current('toast.tour.load_failed');
      }
    } catch (error) {
      console.error('Error fetching tours:', error);
      showErrorRef.current('toast.tour.load_error');
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    if (isBusinessUser) {
      fetchTours();
    }
  }, [isBusinessUser, fetchTours]);

  // Pagination logic
  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedTours = allTours.slice(startIndex, endIndex);
    setTours(paginatedTours);
  }, [allTours, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(allTours.length / itemsPerPage);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCreateTour = () => {
    navigate('/company/tours/wizard');
  };

  const handleEditTour = (tourId) => {
    const tour = tours.find(t => t.id === tourId);
    if (tour) {
      setSelectedTour(tour);
      setEditModalOpen(true);
    }
  };

  const openTourDetail = (tourId) => {
    navigate(`/tour/detail?id=${tourId}`, { state: { fromManagement: true } });
  };

  const handleToggleStatus = (tourId, e) => {
    e.stopPropagation(); // Prevent card click
    
    setTours(prevTours => 
      prevTours.map(tour => {
        if (tour.id === tourId) {
          // Toggle between PUBLIC and PRIVATE
          // NOT_APPROVED tours cannot be toggled
          if (tour.tourStatus === 'NOT_APPROVED') {
            showError('toast.tour.status_not_approved');
            return tour;
          }
          
          const newStatus = tour.tourStatus === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC';
          showSuccess(`toast.tour.status_changed_${newStatus.toLowerCase()}`);
          
          return {
            ...tour,
            tourStatus: newStatus
          };
        }
        return tour;
      })
    );
  };

  const handleDeleteTour = (tourId) => {
    const tour = tours.find(t => t.id === tourId);
    if (tour) {
      setSelectedTour(tour);
      setDeleteModalOpen(true);
    }
  };

  const confirmDeleteTour = async () => {
    if (!selectedTour) return;

    // Get token for authentication
    const remembered = localStorage.getItem('rememberMe') === 'true';
    const storage = remembered ? localStorage : sessionStorage;
    const token = storage.getItem('token');

    if (!token) {
      showError('toast.login_required');
      setDeleteModalOpen(false);
      setSelectedTour(null);
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.TOUR_DELETE_BY_ID(selectedTour.id, user?.email || ''), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Backend logic:
        // - If tour has bookings: soft delete (sets status to DISABLED) - still in DB
        // - If tour has no bookings: hard delete (removes from DB)
        // In both cases, we remove it from the UI as it won't be displayed
        showSuccess('toast.tour.delete_success');
        // Remove tour from local state (works for both soft and hard delete)
        const updatedTours = allTours.filter(tour => tour.id !== selectedTour.id);
        setAllTours(updatedTours);
        
        // Adjust page if current page becomes empty
        const newTotalPages = Math.ceil(updatedTours.length / itemsPerPage);
        if (currentPage > newTotalPages && newTotalPages > 0) {
          setCurrentPage(newTotalPages);
        }
      } else {
        showError('toast.tour.delete_error');
      }
    } catch (error) {
      console.error('Error deleting tour:', error);
      showError('toast.tour.delete_error');
    } finally {
      setDeleteModalOpen(false);
      setSelectedTour(null);
    }
  };

  const handleEditSave = () => {
    // Refresh tours list after edit
    fetchTours();
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN').format(price);
  };

  const formatDuration = (duration) => {
    if (!duration) return t('tourManagement.card.durationZero');
    // Extract number from duration string like "5 ngày 4 đêm"
    const match = duration.match(/(\d+)/);
    return match ? t('tourManagement.card.durationDays', { days: match[1] }) : duration;
  };

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

  const getImageSrc = (tourImgPath) => {
    if (!tourImgPath) return '';
    if (tourImgPath.startsWith('http')) return tourImgPath;
    // Normalize inconsistent stored values: sometimes full "/uploads/...", sometimes only filename
    const normalized = tourImgPath.startsWith('/uploads')
      ? tourImgPath
      : `/uploads/tours/thumbnails/${tourImgPath}`;
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
            <p className={styles['header-subtitle']}>Quản lý tất cả các tour của bạn</p>
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
                <div className={styles['tour-image-container']} style={{height: '250px'}}>
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
                    {t(`tourManagement.statusBadge.${tour.tourStatus || 'UNKNOWN'}`)}
                  </div>
                  
                  {/* Status Toggle Switch */}
                  <div className={styles['status-toggle-wrapper']}>
                    <label 
                      className={styles['toggle-switch']} 
                      onClick={(e) => {
                        if (tour.tourStatus !== 'NOT_APPROVED') {
                          handleToggleStatus(tour.id, e);
                        }
                      }}
                      style={{ cursor: tour.tourStatus === 'NOT_APPROVED' ? 'not-allowed' : 'pointer' }}
                    >
                      <input
                        type="checkbox"
                        checked={tour.tourStatus === 'PUBLIC'}
                        onChange={() => {}} // Handled by onClick on label
                        disabled={tour.tourStatus === 'NOT_APPROVED'}
                        onClick={(e) => e.stopPropagation()}
                        readOnly
                      />
                      <span 
                        className={`${styles['toggle-slider']} ${tour.tourStatus === 'NOT_APPROVED' ? styles['disabled'] : ''}`}
                      ></span>
                    </label>
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
                    <div className={styles['detail-item']}>
                      <ClockIcon className={styles['detail-icon']} />
                      <span className={styles['detail-value']}>{formatDuration(tour.tourDuration)}</span>
                    </div>
                    <div className={styles['detail-item']}>
                      <UserGroupIcon className={styles['detail-icon']} />
                      <span className={styles['detail-value']}>{tour.amount || '30'} {t('tourManagement.card.capacityUnit')}</span>
                    </div>
                    <div className={styles['detail-item']}>
                      <MapPinIcon className={styles['detail-icon']} />
                      <span className={styles['detail-value']}>{localizeDeparturePoint(tour.tourDeparturePoint)}</span>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className={styles['tour-controls']}>
                    <div className={styles['action-buttons']}>
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
                      
                      <button
                        onClick={(e) => { e.stopPropagation(); setShareTourId(tour.id); setShareOpen(true); }}
                        className={styles['share-btn']}
                        title={t('tourCard.share') || 'Chia sẻ'}
                      >
                        <LinkIcon className={styles['action-icon']} />
                        <span>{t('tourCard.share') || 'Chia sẻ'}</span>
                      </button>
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
                    Trang <strong>{currentPage}</strong> / <strong>{totalPages}</strong> ({allTours.length} tour)
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

      {/* Delete Confirm Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSelectedTour(null);
        }}
        onConfirm={confirmDeleteTour}
        title={t('tourManagement.modals.delete.title')}
        message={t('tourManagement.modals.delete.message', { name: selectedTour?.tourName || '' })}
        itemName={t('tourManagement.modals.delete.itemName')}
      />

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
