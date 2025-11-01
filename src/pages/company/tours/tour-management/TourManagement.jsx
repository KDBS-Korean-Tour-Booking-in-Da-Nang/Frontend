import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedTour, setSelectedTour] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareTourId, setShareTourId] = useState(null);
  
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
        // Show all tours for now (backend response lacks companyEmail/companyId)
        setTours(Array.isArray(data) ? data : []);
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
    navigate(`/tour/${tourId}`, { state: { fromManagement: true } });
  };

  // Removed toggle status UI per request

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
        showSuccess('toast.tour.delete_success');
        // Remove tour from local state
        setTours(tours.filter(tour => tour.id !== selectedTour.id));
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
            <div className={styles['title-icon']}>🏔️</div>
            <h1>{t('tourManagement.header.title')}</h1>
          </div>
          <button 
            onClick={handleCreateTour}
            className={styles['add-tour-btn']}
          >
            <span className={styles['btn-icon']}>+</span>
            {t('tourManagement.header.addNew')}
          </button>
        </div>
      </div>

      {/* Tour Cards */}
      <div className={styles['tours-container']}>
        {tours.length === 0 ? (
          <div className={styles['empty-state']}>
            <div className={styles['empty-icon']}>🏔️</div>
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
                    />
                  ) : (
                    <div className={styles['tour-image-placeholder']}>
                      <div className={styles['placeholder-icon']}>🏞️</div>
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  <div className={`status-badge ${tour.tourStatus?.toLowerCase()}`}>
                    {t(`tourManagement.statusBadge.${tour.tourStatus || 'UNKNOWN'}`)}
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
                      <span className={styles['detail-label']}>{t('tourManagement.card.durationLabel')}</span>
                      <span className={styles['detail-value']}>{formatDuration(tour.tourDuration)}</span>
                    </div>
                    <div className={styles['detail-item']}>
                      <span className={styles['detail-label']}>{t('tourManagement.card.capacityLabel')}</span>
                      <span className={styles['detail-value']}>{tour.amount || '30'} {t('tourManagement.card.capacityUnit')}</span>
                    </div>
                    <div className={styles['detail-item']}>
                      <span className={styles['detail-label']}>{t('tourManagement.card.departureLabel')}</span>
                      <span className={styles['detail-value']}>{localizeDeparturePoint(tour.tourDeparturePoint)}</span>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className={styles['tour-controls']}>
                    <div className={styles['action-buttons']}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleEditTour(tour.id); }}
                        className={styles['edit-btn']}
                      >
                        <span className={styles['edit-icon']}>✏️</span>
                        {t('tourManagement.actions.edit')}
                      </button>
                      
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteTour(tour.id); }}
                        className={styles['delete-btn']}
                      >
                        <span className={styles['delete-icon']}>🗑️</span>
                        {t('tourManagement.actions.delete')}
                      </button>
                      
                      <button
                        onClick={(e) => { e.stopPropagation(); setShareTourId(tour.id); setShareOpen(true); }}
                        className={styles['share-btn']}
                      >
                        <span className={styles['share-icon']}>🔗</span>
                        {t('tourCard.share') || 'Chia sẻ'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
