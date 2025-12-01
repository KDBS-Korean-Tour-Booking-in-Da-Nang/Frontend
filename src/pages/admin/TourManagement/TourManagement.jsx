import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { API_ENDPOINTS, createAuthHeaders, getTourImageUrl } from '../../../config/api';
import { checkAndHandle401 } from '../../../utils/apiErrorHandler';
import TourDetailModal from './TourDetailModal';
import { Package, CheckCircle2, FileText, Eye, CheckCircle, XCircle, Check, Clock, X } from 'lucide-react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

const TourManagement = () => {
  const { getToken } = useAuth();
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedTour, setSelectedTour] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Fetch tours from API
  useEffect(() => {
    const fetchTours = async () => {
      try {
        setLoading(true);
        const token = getToken();
        const response = await fetch(API_ENDPOINTS.TOURS, {
          headers: createAuthHeaders(token)
        });

        if (!response.ok && response.status === 401) {
          await checkAndHandle401(response);
          return;
        }

        if (response.ok) {
          const data = await response.json();
          setTours(Array.isArray(data) ? data : []);
        } else {
          console.error('Failed to fetch tours:', response.statusText);
        }
      } catch (error) {
        console.error('Error fetching tours:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTours();
  }, [getToken]);

  // Filter and sort tours
  const filteredAndSortedTours = useMemo(() => {
    let filtered = [...tours];

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

    // Status filter (if needed in future)
    // Currently keeping all tours

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

    return filtered;
  }, [tours, searchQuery, statusFilter, sortBy]);

  // Paginate
  const paginatedTours = useMemo(() => {
    const total = Math.ceil(filteredAndSortedTours.length / pageSize);
    setTotalPages(total);
    const startIndex = currentPage * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredAndSortedTours.slice(startIndex, endIndex);
  }, [filteredAndSortedTours, currentPage, pageSize]);

  // Handle view details
  const handleViewDetails = async (tourId) => {
    try {
      setLoadingDetail(true);
      const token = getToken();
      const response = await fetch(API_ENDPOINTS.TOUR_BY_ID(tourId), {
        headers: createAuthHeaders(token)
      });

      if (!response.ok && response.status === 401) {
        await checkAndHandle401(response);
        return;
      }

      if (response.ok) {
        const tourDetail = await response.json();
        setSelectedTour(tourDetail);
        setIsDetailModalOpen(true);
      } else {
        const errorText = await response.text();
        alert(`Lỗi khi tải chi tiết tour: ${errorText}`);
      }
    } catch (error) {
      console.error('Error fetching tour details:', error);
      alert('Đã xảy ra lỗi khi tải chi tiết tour');
    } finally {
      setLoadingDetail(false);
    }
  };

  // Handle approve tour
  const handleApproveTour = async (tourId) => {
    if (!window.confirm('Bạn có chắc chắn muốn phê duyệt tour này?')) {
      return;
    }

    try {
      const token = getToken();
      const response = await fetch(`${API_ENDPOINTS.TOURS}/change-status/${tourId}?status=PUBLIC`, {
        method: 'PUT',
        headers: createAuthHeaders(token)
      });

      if (!response.ok && response.status === 401) {
        await checkAndHandle401(response);
        return;
      }

      if (response.ok) {
        // Refresh tours list
        const refreshResponse = await fetch(API_ENDPOINTS.TOURS, {
          headers: createAuthHeaders(token)
        });
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          setTours(Array.isArray(data) ? data : []);
        }
        alert('Phê duyệt tour thành công!');
      } else {
        const errorText = await response.text();
        alert(`Lỗi khi phê duyệt tour: ${errorText}`);
      }
    } catch (error) {
      console.error('Error approving tour:', error);
      alert('Đã xảy ra lỗi khi phê duyệt tour');
    }
  };

  // Handle reject tour
  const handleRejectTour = async (tourId) => {
    if (!window.confirm('Bạn có chắc chắn muốn từ chối tour này?')) {
      return;
    }

    try {
      const token = getToken();
      // Set status to DISABLED when rejecting (NOT_APPROVED means pending, DISABLED means rejected)
      const response = await fetch(`${API_ENDPOINTS.TOURS}/change-status/${tourId}?status=DISABLED`, {
        method: 'PUT',
        headers: createAuthHeaders(token)
      });

      if (!response.ok && response.status === 401) {
        await checkAndHandle401(response);
        return;
      }

      if (response.ok) {
        // Refresh tours list
        const refreshResponse = await fetch(API_ENDPOINTS.TOURS, {
          headers: createAuthHeaders(token)
        });
        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          setTours(Array.isArray(data) ? data : []);
        }
        alert('Từ chối tour thành công!');
      } else {
        const errorText = await response.text();
        alert(`Lỗi khi từ chối tour: ${errorText}`);
      }
    } catch (error) {
      console.error('Error rejecting tour:', error);
      alert('Đã xảy ra lỗi khi từ chối tour');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải danh sách tour...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#4c9dff] font-semibold mb-2">Tour Management</p>
          <h1 className="text-3xl font-bold text-gray-900">Quản lý Tour</h1>
          <p className="text-sm text-gray-500 mt-1">
            Xem và quản lý tất cả các tour trong hệ thống.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:border-gray-300">
            <FunnelIcon className="h-5 w-5" />
            Bộ lọc nâng cao
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-[#4c9dff] text-white rounded-lg text-sm font-semibold shadow-[0_12px_30px_rgba(76,157,255,0.35)] hover:bg-[#3f85d6] transition-all duration-200">
            <ArrowDownTrayIcon className="h-5 w-5" />
            Xuất báo cáo
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Tổng số tour</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{tours.length}</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-[#e9f2ff] flex items-center justify-center">
              <Package className="w-6 h-6 text-[#4c9dff]" strokeWidth={1.5} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Tour hiển thị</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{filteredAndSortedTours.length}</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" strokeWidth={1.5} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Trang hiện tại</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {currentPage + 1} / {totalPages || 1}
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-purple-50 flex items-center justify-center">
              <FileText className="w-6 h-6 text-purple-600" strokeWidth={1.5} />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col gap-3 p-5 border-b border-gray-100 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-xs">
            <MagnifyingGlassIcon className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(0);
              }}
              placeholder="Tìm kiếm tour theo tên, mô tả, điểm khởi hành..."
              className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(0);
              }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="newest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
              <option value="name-asc">Tên A-Z</option>
              <option value="name-desc">Tên Z-A</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50/70">
              <tr>
                {['STT', 'Tên tour', 'Trạng thái', 'Giá', 'Thời gian', 'Ngày tạo', 'Thao tác'].map((header) => (
                  <th key={header} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {paginatedTours.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    {loading ? 'Đang tải...' : 'Không tìm thấy tour phù hợp với bộ lọc hiện tại.'}
                  </td>
                </tr>
              ) : (
                paginatedTours.map((tour, index) => (
                  <tr key={tour.tourId || tour.id} className="hover:bg-[#e9f2ff]/40 transition">
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {currentPage * pageSize + index + 1}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {tour.tourImgPath || tour.thumbnailUrl ? (
                          <img
                            src={getTourImageUrl(tour.tourImgPath || tour.thumbnailUrl)}
                            alt={tour.title || tour.tourName}
                            className="w-12 h-12 rounded-lg object-cover"
                            onError={(e) => {
                              e.target.src = '/default-Tour.jpg';
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                            <span className="text-gray-400 text-xs">📦</span>
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-gray-900">
                            {tour.title || tour.tourName || 'N/A'}
                          </p>
                          {tour.shortDescription && (
                            <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                              {tour.shortDescription}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <TourStatusBadge status={tour.tourStatus || tour.status} />
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {formatPrice(tour.price || tour.adultPrice)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {tour.duration || tour.tourDuration || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(tour.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewDetails(tour.tourId || tour.id)}
                          disabled={loadingDetail}
                          className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-[#4c9dff] hover:border-[#9fc2ff] transition disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Xem chi tiết"
                        >
                          <Eye className="h-4 w-4" strokeWidth={1.5} />
                        </button>
                        <button
                          onClick={() => handleApproveTour(tour.tourId || tour.id)}
                          className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-green-600 hover:border-green-200 transition"
                          title="Phê duyệt tour"
                        >
                          <CheckCircle className="h-4 w-4" strokeWidth={1.5} />
                        </button>
                        <button
                          onClick={() => handleRejectTour(tour.tourId || tour.id)}
                          className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 transition"
                          title="Từ chối tour"
                        >
                          <XCircle className="h-4 w-4" strokeWidth={1.5} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredAndSortedTours.length >= 10 && totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <div className="text-sm text-gray-600">
              Trang {currentPage + 1} / {totalPages} ({filteredAndSortedTours.length} tour)
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Trước
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                disabled={currentPage >= totalPages - 1}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tour Detail Modal */}
      <TourDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedTour(null);
        }}
        tour={selectedTour}
      />
    </div>
  );
};

// Tour Status Badge Component
const TourStatusBadge = ({ status }) => {
  if (!status) {
    return (
      <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-500">
        N/A
      </span>
    );
  }

  const statusUpper = status.toUpperCase();
  const statusMap = {
    'PUBLIC': { 
      color: 'bg-green-100 text-green-700', 
      label: 'Đã duyệt', 
      icon: Check 
    },
    'NOT_APPROVED': { 
      color: 'bg-amber-100 text-amber-700', 
      label: 'Chờ duyệt', 
      icon: Clock 
    },
    'DISABLED': { 
      color: 'bg-red-100 text-red-700', 
      label: 'Đã vô hiệu', 
      icon: X 
    }
  };
  
  const map = statusMap[statusUpper] || { 
    color: 'bg-gray-100 text-gray-500', 
    label: status, 
    icon: FileText 
  };
  
  const IconComponent = map.icon;
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full ${map.color}`}>
      <IconComponent className="w-3.5 h-3.5" strokeWidth={1.5} />
      {map.label}
    </span>
  );
};

export default TourManagement;
