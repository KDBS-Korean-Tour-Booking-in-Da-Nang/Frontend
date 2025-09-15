import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../contexts/ToastContext';
import EditTourModal from '../wizard/modals/EditTourModal';
import DeleteConfirmModal from '../../../../components/modals/DeleteConfirmModal/DeleteConfirmModal';
import './TourManagement.css';

const TourManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
  const showErrorRef = useRef(showError);
  
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedTour, setSelectedTour] = useState(null);
  
  // Update ref when showError changes
  useEffect(() => {
    showErrorRef.current = showError;
  }, [showError]);

  // Check if user has business role
  const isBusinessUser = user && (user.role === 'COMPANY' || user.role === 'company');
  
  const fetchTours = useCallback(async () => {
    if (!user?.email) return;
    
    try {
      setLoading(true);
      const response = await fetch('/api/tour');
      
      if (response.ok) {
        const data = await response.json();
        // Filter tours by current user's company
        const userTours = data.filter(tour => 
          tour.companyEmail === user.email
        );
        setTours(userTours);
      } else {
        showErrorRef.current('Không thể tải danh sách tour');
      }
    } catch (error) {
      console.error('Error fetching tours:', error);
      showErrorRef.current('Có lỗi xảy ra khi tải danh sách tour');
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
    navigate('/business/tours/wizard');
  };

  const handleEditTour = (tourId) => {
    const tour = tours.find(t => t.tourId === tourId);
    if (tour) {
      setSelectedTour(tour);
      setEditModalOpen(true);
    }
  };

  const handleToggleStatus = (tourId, currentStatus) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    
    // Update local state only (for demo purposes)
    setTours(tours.map(tour => 
      tour.tourId === tourId 
        ? { ...tour, tourStatus: newStatus }
        : tour
    ));
    
    showSuccess(`Đã ${newStatus === 'ACTIVE' ? 'kích hoạt' : 'tạm dừng'} tour`);
  };

  const handleDeleteTour = (tourId) => {
    const tour = tours.find(t => t.tourId === tourId);
    if (tour) {
      setSelectedTour(tour);
      setDeleteModalOpen(true);
    }
  };

  const confirmDeleteTour = async () => {
    if (!selectedTour) return;

    try {
      const response = await fetch(`/api/tour/${selectedTour.tourId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showSuccess('Đã xóa tour thành công');
        // Remove tour from local state
        setTours(tours.filter(tour => tour.tourId !== selectedTour.tourId));
      } else {
        showError('Có lỗi xảy ra khi xóa tour');
      }
    } catch (error) {
      console.error('Error deleting tour:', error);
      showError('Có lỗi xảy ra khi xóa tour');
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
    if (!duration) return '0 ngày';
    // Extract number from duration string like "5 ngày 4 đêm"
    const match = duration.match(/(\d+)/);
    return match ? `${match[1]} ngày` : duration;
  };

  const getImageSrc = (tourImgPath) => {
    if (!tourImgPath) return '';
    
    // Extract filename from path like "/uploads/tours/thumbnails/filename.jpg"
    const filename = tourImgPath.split('/').pop();
    return `/api/tour/image/${filename}`;
  };

  // Show loading if user is not loaded yet
  if (!user) {
    return (
      <div className="tour-management">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Đang tải thông tin người dùng...</p>
        </div>
      </div>
    );
  }

  if (!isBusinessUser) {
    return (
      <div className="tour-management">
        <div className="access-denied">
          <h1>Truy cập bị từ chối</h1>
          <p>Bạn cần có quyền business để truy cập trang này.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="tour-management">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Đang tải danh sách tour...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tour-management">
      {/* Header */}
      <div className="management-header">
        <div className="header-content">
          <div className="header-title">
            <div className="title-icon">🏔️</div>
            <h1>Danh Sách Tour</h1>
          </div>
          <button 
            onClick={handleCreateTour}
            className="add-tour-btn"
          >
            <span className="btn-icon">+</span>
            Thêm Tour Mới
          </button>
        </div>
      </div>

      {/* Tour Cards */}
      <div className="tours-container">
        {tours.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏔️</div>
            <h3>Chưa có tour nào</h3>
            <p>Hãy tạo tour đầu tiên của bạn</p>
            <button 
              onClick={handleCreateTour}
              className="create-first-tour-btn"
            >
              Tạo tour đầu tiên
            </button>
          </div>
        ) : (
          <div className="tours-grid">
            {tours.map((tour) => (
              <div key={tour.tourId} className="tour-card">
                {/* Tour Image */}
                <div className="tour-image-container" style={{height: '250px'}}>
                  {tour.tourImgPath ? (
                    <img 
                      src={getImageSrc(tour.tourImgPath)} 
                      alt={tour.tourName}
                      className="tour-image"
                    />
                  ) : (
                    <div className="tour-image-placeholder">
                      <div className="placeholder-icon">🏞️</div>
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  <div className={`status-badge ${tour.tourStatus?.toLowerCase()}`}>
                    {tour.tourStatus === 'ACTIVE' ? 'HOẠT ĐỘNG' :
                     tour.tourStatus === 'INACTIVE' ? 'TẠM DỪNG' :
                     tour.tourStatus === 'NOT_APPROVED' ? 'CHỜ DUYỆT' :
                     tour.tourStatus === 'DRAFT' ? 'BẢN NHÁP' : tour.tourStatus}
                  </div>
                </div>

                {/* Tour Info */}
                <div className="tour-info">
                  <h3 className="tour-name">{tour.tourName}</h3>
                  
                  <div className="tour-price">
                    <span className="price-label">GIÁ/NGƯỜI</span>
                    <span className="price-value">{formatPrice(tour.adultPrice)}₫</span>
                  </div>

                  <div className="tour-details">
                    <div className="detail-item">
                      <span className="detail-label">THỜI GIAN:</span>
                      <span className="detail-value">{formatDuration(tour.tourDuration)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">SỨC CHỨA:</span>
                      <span className="detail-value">{tour.amount || '30'} khách</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">ĐIỂM KHỞI HÀNH:</span>
                      <span className="detail-value">{tour.tourDeparturePoint || 'Đà Nẵng'}</span>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="tour-controls">
                    <div className="toggle-container">
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={tour.tourStatus === 'ACTIVE'}
                          onChange={() => handleToggleStatus(tour.tourId, tour.tourStatus)}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>
                    
                    <div className="action-buttons">
                      <button 
                        onClick={() => handleEditTour(tour.tourId)}
                        className="edit-btn"
                      >
                        <span className="edit-icon">✏️</span>
                        Chỉnh sửa
                      </button>
                      
                      <button 
                        onClick={() => handleDeleteTour(tour.tourId)}
                        className="delete-btn"
                      >
                        <span className="delete-icon">🗑️</span>
                        Xóa
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
        title="Xác nhận xóa tour"
        message={`Bạn có chắc chắn muốn xóa tour "${selectedTour?.tourName}"?`}
        itemName="tour này"
      />
    </div>
  );
};

export default TourManagement;
