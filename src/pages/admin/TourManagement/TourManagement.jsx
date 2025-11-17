import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MagnifyingGlassIcon,
  EyeIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CalendarIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { API_ENDPOINTS, getTourImageUrl } from '../../../config/api';
import { useToast } from '../../../contexts/ToastContext';
import styles from './TourManagement.module.css';

const TourManagement = () => {
  const [tours, setTours] = useState([]);
  const [allTours, setAllTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTour, setSelectedTour] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8); // 2 rows x 4 columns
  const navigate = useNavigate();
  const { showError } = useToast();

  useEffect(() => {
    fetchTours();
  }, []);

  useEffect(() => {
    filterAndPaginateTours();
  }, [searchQuery, statusFilter, sortBy, currentPage, allTours]);

  const fetchTours = async () => {
    try {
      setLoading(true);
      const remembered = localStorage.getItem('rememberMe') === 'true';
      const storage = remembered ? localStorage : sessionStorage;
      const token = storage.getItem('token');

      const response = await fetch(API_ENDPOINTS.TOURS, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAllTours(Array.isArray(data) ? data : []);
      } else {
        showError('Không thể tải danh sách tours');
      }
    } catch (error) {
      console.error('Error fetching tours:', error);
      showError('Có lỗi xảy ra khi tải danh sách tours');
    } finally {
      setLoading(false);
    }
  };

  const filterAndPaginateTours = () => {
    let filtered = [...allTours];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(tour => {
        const title = (tour.title || tour.tourName || '').toLowerCase();
        const desc = (tour.shortDescription || tour.tourDescription || '').toLowerCase();
        const departure = (tour.departurePoint || '').toLowerCase();
        return title.includes(query) || desc.includes(query) || departure.includes(query);
      });
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      } else if (sortBy === 'oldest') {
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      } else if (sortBy === 'name-asc') {
        const nameA = (a.title || a.tourName || '').toLowerCase();
        const nameB = (b.title || b.tourName || '').toLowerCase();
        return nameA.localeCompare(nameB);
      } else if (sortBy === 'name-desc') {
        const nameA = (a.title || a.tourName || '').toLowerCase();
        const nameB = (b.title || b.tourName || '').toLowerCase();
        return nameB.localeCompare(nameA);
      }
      return 0;
    });

    // Paginate
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginated = filtered.slice(startIndex, endIndex);

    setTours(paginated);
    setTotalPages(totalPages);
    setTotalItems(filtered.length);
  };

  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const handleView = (tour) => {
    setSelectedTour(tour);
    setIsModalOpen(true);
  };

  const handleViewDetails = () => {
    if (selectedTour) {
      navigate(`/tour/detail?id=${selectedTour.tourId || selectedTour.id}`);
    }
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const formatPrice = (price) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN');
    } catch {
      return dateString;
    }
  };

  return (
    <div className={styles.tourManagement}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Tour Management</h1>
          <p className={styles.subtitle}>Quản lý tất cả các tour trong hệ thống</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className={styles.filtersContainer}>
        <div className={styles.searchWrapper}>
          <div className={styles.searchIcon}>
            <MagnifyingGlassIcon className={styles.icon} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Tìm kiếm tour..."
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filtersWrapper}>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className={styles.filterSelect}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="inactive">Tạm khóa</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setCurrentPage(1);
            }}
            className={styles.filterSelect}
          >
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
            <option value="name-asc">Tên A-Z</option>
            <option value="name-desc">Tên Z-A</option>
          </select>
        </div>
      </div>

      {/* Tours Grid */}
      {loading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Đang tải...</p>
        </div>
      ) : tours.length === 0 ? (
        <div className={styles.emptyState}>
          <p>Không có tour nào</p>
        </div>
      ) : (
        <>
          <div className={styles.toursGrid}>
            {tours.map((tour, index) => (
              <div key={tour.tourId || tour.id} className={styles.tourCard}>
                <div className={styles.cardImageContainer}>
                  <img
                    src={getTourImageUrl(tour.thumbnailUrl)}
                    alt={tour.title || tour.tourName}
                    className={styles.cardImage}
                    onError={(e) => {
                      e.target.src = '/default-Tour.jpg';
                    }}
                  />
                </div>
                <div className={styles.cardContent}>
                  <h3 className={styles.cardTitle}>
                    {tour.title || tour.tourName || 'N/A'}
                  </h3>
                  {tour.shortDescription && (
                    <p className={styles.cardDescription}>
                      {tour.shortDescription.substring(0, 60)}...
                    </p>
                  )}
                  <div className={styles.cardDetails}>
                    <div className={styles.detailItem}>
                      <MapPinIcon className={styles.detailIcon} />
                      <span className={styles.detailText}>
                        {tour.departurePoint || 'N/A'}
                      </span>
                    </div>
                    <div className={styles.detailItem}>
                      <CurrencyDollarIcon className={styles.detailIcon} />
                      <span className={styles.detailPrice}>
                        {formatPrice(tour.price || tour.adultPrice)}
                      </span>
                    </div>
                    <div className={styles.detailItem}>
                      <ClockIcon className={styles.detailIcon} />
                      <span className={styles.detailText}>
                        {tour.duration || tour.tourDuration || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className={styles.cardFooter}>
                    <div className={styles.cardDate}>
                      <CalendarIcon className={styles.dateIcon} />
                      <span>{formatDate(tour.createdAt)}</span>
                    </div>
                    <button
                      onClick={() => handleView(tour)}
                      className={styles.viewButton}
                      title="Xem chi tiết"
                    >
                      <EyeIcon className={styles.viewIcon} />
                      <span>Xem</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <div className={styles.paginationInfo}>
                <span>
                  Trang <strong>{currentPage}</strong> / <strong>{totalPages}</strong> ({totalItems} tour)
                </span>
              </div>
              <div className={styles.paginationControls}>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={styles.paginationButton}
                >
                  <ChevronLeftIcon className={styles.paginationIcon} />
                </button>
                {[...Array(totalPages)].map((_, idx) => {
                  const page = idx + 1;
                  if (totalPages <= 7 || page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`${styles.paginationButton} ${currentPage === page ? styles.active : ''}`}
                      >
                        {page}
                      </button>
                    );
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return <span key={page} className={styles.paginationDots}>...</span>;
                  }
                  return null;
                })}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={styles.paginationButton}
                >
                  <ChevronRightIcon className={styles.paginationIcon} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {isModalOpen && selectedTour && (
        <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderLeft}>
                <div className={styles.modalIcon}>
                  <InformationCircleIcon className={styles.icon} />
                </div>
                <h3 className={styles.modalTitle}>Chi tiết Tour</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className={styles.modalCloseButton}
              >
                <XMarkIcon className={styles.icon} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.modalImageContainer}>
                <img
                  src={getTourImageUrl(selectedTour.thumbnailUrl)}
                  alt={selectedTour.title || selectedTour.tourName}
                  className={styles.modalImage}
                  onError={(e) => {
                    e.target.src = '/default-Tour.jpg';
                  }}
                />
              </div>

              <div className={styles.modalInfo}>
                <h4 className={styles.modalTourName}>
                  {selectedTour.title || selectedTour.tourName || 'N/A'}
                </h4>
                {selectedTour.shortDescription && (
                  <p className={styles.modalDescription}>{selectedTour.shortDescription}</p>
                )}
              </div>

              <div className={styles.modalDetailsGrid}>
                {selectedTour.departurePoint && (
                  <div className={styles.modalDetailCard}>
                    <div className={styles.detailCardIcon}>
                      <MapPinIcon className={styles.icon} />
                    </div>
                    <div>
                      <p className={styles.detailCardLabel}>Điểm khởi hành</p>
                      <p className={styles.detailCardValue}>{selectedTour.departurePoint}</p>
                    </div>
                  </div>
                )}
                {(selectedTour.price || selectedTour.adultPrice) && (
                  <div className={styles.modalDetailCard}>
                    <div className={styles.detailCardIcon}>
                      <CurrencyDollarIcon className={styles.icon} />
                    </div>
                    <div>
                      <p className={styles.detailCardLabel}>Giá tour</p>
                      <p className={styles.detailCardPrice}>
                        {formatPrice(selectedTour.price || selectedTour.adultPrice)}
                      </p>
                    </div>
                  </div>
                )}
                {selectedTour.duration && (
                  <div className={styles.modalDetailCard}>
                    <div className={styles.detailCardIcon}>
                      <ClockIcon className={styles.icon} />
                    </div>
                    <div>
                      <p className={styles.detailCardLabel}>Thời gian</p>
                      <p className={styles.detailCardValue}>{selectedTour.duration}</p>
                    </div>
                  </div>
                )}
                {selectedTour.createdAt && (
                  <div className={styles.modalDetailCard}>
                    <div className={styles.detailCardIcon}>
                      <CalendarIcon className={styles.icon} />
                    </div>
                    <div>
                      <p className={styles.detailCardLabel}>Ngày tạo</p>
                      <p className={styles.detailCardValue}>{formatDate(selectedTour.createdAt)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                onClick={() => setIsModalOpen(false)}
                className={styles.modalButtonCancel}
              >
                Đóng
              </button>
              <button
                onClick={handleViewDetails}
                className={styles.modalButtonPrimary}
              >
                Xem chi tiết
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TourManagement;
