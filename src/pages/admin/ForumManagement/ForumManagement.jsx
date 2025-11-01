import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  EyeIcon,
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  UserIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  HeartIcon,
  PhotoIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { API_ENDPOINTS, getImageUrl, getAvatarUrl } from '../../../config/api';
import { useToast } from '../../../contexts/ToastContext';

const ForumManagement = () => {
  const [posts, setPosts] = useState([]);
  const [allPosts, setAllPosts] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [reportFilter, setReportFilter] = useState('all'); // 'all', 'POST', 'COMMENT'
  const [selectedPost, setSelectedPost] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Pagination and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const navigate = useNavigate();
  const { showError } = useToast();

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    if (showReports) {
      fetchReports();
    }
  }, [showReports, reportFilter]);

  useEffect(() => {
    if (!showReports) {
      filterAndPaginatePosts();
    }
  }, [searchQuery, statusFilter, sortBy, currentPage, allPosts, showReports]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const remembered = localStorage.getItem('rememberMe') === 'true';
      const storage = remembered ? localStorage : sessionStorage;
      const token = storage.getItem('token');

      const response = await fetch(API_ENDPOINTS.POSTS, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAllPosts(Array.isArray(data) ? data : []);
      } else {
        showError('Không thể tải danh sách bài viết');
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      showError('Có lỗi xảy ra khi tải danh sách bài viết');
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    try {
      setReportsLoading(true);
      const remembered = localStorage.getItem('rememberMe') === 'true';
      const storage = remembered ? localStorage : sessionStorage;
      const token = storage.getItem('token');

      const params = new URLSearchParams({ page: '0', size: '100' });
      const response = await fetch(`${API_ENDPOINTS.REPORTS_ADMIN_ALL}?${params}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      if (response.ok) {
        const data = await response.json();
        const reportsList = data.content || data || [];
        setReports(reportsList);
      } else {
        showError('Không thể tải danh sách báo cáo');
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      showError('Có lỗi xảy ra khi tải danh sách báo cáo');
    } finally {
      setReportsLoading(false);
    }
  };

  const filterAndPaginatePosts = () => {
    let filtered = [...allPosts];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(post => {
        const content = (post.content || '').toLowerCase();
        const author = (post.username || '').toLowerCase();
        const userId = post.userId ? String(post.userId).toLowerCase() : '';
        return content.includes(query) || author.includes(query) || userId.includes(query);
      });
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      } else if (sortBy === 'oldest') {
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      }
      return 0;
    });

    // Paginate
    const totalPagesCount = Math.ceil(filtered.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginated = filtered.slice(startIndex, endIndex);

    setPosts(paginated);
    setTotalPages(totalPagesCount);
    setTotalItems(filtered.length);
  };

  const handleView = (post) => {
    setSelectedPost(post);
    setIsModalOpen(true);
  };

  const handleViewDetails = (postId) => {
    navigate(`/forum?postId=${postId}`);
    setIsModalOpen(false);
  };

  const handleViewReportDetails = (report) => {
    if (report.targetType === 'POST') {
      navigate(`/forum?postId=${report.targetId}`);
    } else if (report.targetType === 'COMMENT') {
      navigate(`/forum?commentId=${report.targetId}`);
    }
  };

  const filteredReports = reports.filter(report => {
    if (reportFilter === 'all') return true;
    return report.targetType === reportFilter;
  });

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      INVESTIGATING: 'bg-blue-100 text-blue-800',
      RESOLVED: 'bg-green-100 text-green-800',
      DISMISSED: 'bg-gray-100 text-gray-800',
      CLOSED: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Forum Management</h1>
          <p className="mt-1 text-sm text-gray-500">Quản lý các bài viết và bình luận trong forum</p>
        </div>
        <button
          onClick={() => setShowReports(!showReports)}
          className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
            showReports 
              ? 'bg-red-600 hover:bg-red-700' 
              : 'bg-gray-600 hover:bg-gray-700'
          } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500`}
        >
          <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
          {showReports ? 'Ẩn Báo cáo' : 'Báo cáo'}
        </button>
      </div>

      {showReports ? (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">Lọc theo:</span>
              <button
                onClick={() => setReportFilter('all')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  reportFilter === 'all'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setReportFilter('POST')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  reportFilter === 'POST'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Bài viết
              </button>
              <button
                onClick={() => setReportFilter('COMMENT')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  reportFilter === 'COMMENT'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Bình luận
              </button>
            </div>
          </div>

          {reportsLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Không có báo cáo nào</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredReports.map((report) => (
                <div key={report.reportId} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(report.status)}`}>
                          {report.status}
                        </span>
                        <span className="text-sm font-medium text-gray-700">
                          {report.targetType === 'POST' ? 'Bài viết' : 'Bình luận'}
                        </span>
                        <span className="text-xs text-gray-500">
                          Báo cáo bởi: {report.reporterUsername || 'N/A'}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {report.targetTitle || 'Không có tiêu đề'}
                      </h3>
                      {report.description && (
                        <p className="text-sm text-gray-600 mb-2">{report.description}</p>
                      )}
                      {report.reasons && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {typeof report.reasons === 'string' 
                            ? report.reasons.split(',').map((reason, idx) => (
                                <span key={idx} className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                                  {reason.trim()}
                                </span>
                              ))
                            : Array.isArray(report.reasons)
                            ? report.reasons.map((reason, idx) => (
                                <span key={idx} className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                                  {reason}
                                </span>
                              ))
                            : null
                          }
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="h-4 w-4" />
                          <span>{formatDate(report.reportedAt)}</span>
                        </div>
                        {report.targetAuthor && (
                          <div className="flex items-center gap-1">
                            <UserIcon className="h-4 w-4" />
                            <span>Tác giả: {report.targetAuthor}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      <button
                        onClick={() => handleViewReportDetails(report)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Xem chi tiết"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Search and Filters */}
          <div className="bg-white shadow-sm rounded-lg p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              {/* Search */}
              <div className="relative flex-1 w-full sm:max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Tìm kiếm bài viết..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-red-500 focus:border-red-500 sm:text-sm"
                />
              </div>

              {/* Filters */}
              <div className="flex gap-3 w-full sm:w-auto">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="block w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
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
                  className="block w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                >
                  <option value="newest">Sắp xếp theo: Mới nhất</option>
                  <option value="oldest">Sắp xếp theo: Cũ nhất</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            </div>
          ) : (
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                        <input type="checkbox" className="rounded border-gray-300 text-red-600 focus:ring-red-500" />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bài viết
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tác giả
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Lượt thích
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bình luận
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ngày đăng
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {posts.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="px-6 py-4 text-center text-sm text-gray-500">
                          Không có bài viết nào
                        </td>
                      </tr>
                    ) : (
                      posts.map((post) => (
                        <tr key={post.forumPostId || post.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input type="checkbox" className="rounded border-gray-300 text-red-600 focus:ring-red-500" />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            POST-{post.forumPostId || post.id || 'N/A'}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              {post.images && post.images.length > 0 && (
                                <img
                                  src={getImageUrl(typeof post.images[0] === 'string' ? post.images[0] : post.images[0]?.imgPath)}
                                  alt="Post"
                                  className="h-12 w-12 rounded-lg object-cover mr-3"
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                              )}
                              <div className="max-w-xs">
                                <div className="text-sm font-medium text-gray-900 line-clamp-2">
                                  {post.content ? (post.content.substring(0, 80) + (post.content.length > 80 ? '...' : '')) : 'N/A'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {post.username || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {post.reactions?.likeCount || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {post.reactions?.commentCount || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(post.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleView(post)}
                              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                              title="Xem chi tiết"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
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
                      <span className="font-medium">{totalItems}</span> bài viết
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
                      {[...Array(totalPages)].map((_, idx) => {
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
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {isModalOpen && selectedPost && !showReports && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-900 bg-opacity-50 transition-opacity" onClick={() => setIsModalOpen(false)}></div>

            <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              {/* Header */}
              <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                      <DocumentTextIcon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white">Chi tiết Bài viết</h3>
                  </div>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-white hover:text-gray-200 transition-colors p-1 hover:bg-white hover:bg-opacity-20 rounded-lg"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="bg-white px-6 py-6">
                <div className="space-y-6">
                  {/* Author Info */}
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    {selectedPost.userAvatar && (
                      <img
                        src={getAvatarUrl(selectedPost.userAvatar)}
                        alt={selectedPost.username}
                        className="w-14 h-14 rounded-full border-2 border-white shadow-md"
                        onError={(e) => { e.target.src = '/default-avatar.png'; }}
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-lg font-bold text-gray-900">{selectedPost.username || 'N/A'}</p>
                        {selectedPost.userId && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-700 rounded">
                            ID: {selectedPost.userId}
                          </span>
                        )}
                      </div>
                      {selectedPost.createdAt && (
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <CalendarIcon className="h-4 w-4" />
                          <span>{formatDate(selectedPost.createdAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Images */}
                  {selectedPost.images && selectedPost.images.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <PhotoIcon className="h-5 w-5" />
                        <span>Hình ảnh ({selectedPost.images.length})</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {selectedPost.images.map((img, idx) => (
                          <div key={idx} className="relative overflow-hidden rounded-lg border border-gray-200 group">
                            <img
                              src={getImageUrl(typeof img === 'string' ? img : img?.imgPath)}
                              alt={`Post image ${idx + 1}`}
                              className="w-full h-40 object-cover group-hover:scale-105 transition-transform"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Content */}
                  <div className="space-y-3 pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <DocumentTextIcon className="h-5 w-5" />
                      <span>Nội dung</span>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {selectedPost.content || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Stats */}
                  {selectedPost.reactions && (
                    <div className="flex items-center gap-6 p-4 bg-gradient-to-r from-red-50 to-pink-50 rounded-lg border border-red-100">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-red-100 rounded-lg">
                          <HeartIcon className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Lượt thích</p>
                          <p className="text-lg font-bold text-red-600">{selectedPost.reactions.likeCount || 0}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <ChatBubbleLeftRightIcon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Bình luận</p>
                          <p className="text-lg font-bold text-blue-600">{selectedPost.reactions.commentCount || 0}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:w-auto inline-flex justify-center items-center rounded-lg border border-gray-300 shadow-sm px-5 py-2.5 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                >
                  Đóng
                </button>
                <button
                  onClick={() => handleViewDetails(selectedPost.forumPostId || selectedPost.id)}
                  className="w-full sm:w-auto inline-flex justify-center items-center rounded-lg border border-transparent shadow-sm px-5 py-2.5 bg-red-600 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                >
                  Xem chi tiết
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForumManagement;
