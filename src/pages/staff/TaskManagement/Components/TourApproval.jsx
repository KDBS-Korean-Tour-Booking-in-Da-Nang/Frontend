import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../contexts/ToastContext';
import { API_ENDPOINTS, BaseURL, createAuthHeaders } from '../../../../config/api';
import { XMarkIcon } from '@heroicons/react/24/outline';

const pastelCardClasses = 'rounded-[28px] bg-white/95 border border-[#eceff7] shadow-[0_15px_45px_rgba(15,23,42,0.08)]';
const primaryButtonClasses = 'inline-flex items-center justify-center gap-2 rounded-[999px] px-5 py-2 text-sm font-semibold text-white bg-[#4c9dff] hover:bg-[#3f87e0] transition-all duration-200 shadow-[0_10px_25px_rgba(76,157,255,0.35)]';
const neutralButtonClasses = 'inline-flex items-center justify-center gap-2 rounded-[999px] px-5 py-2 text-sm font-semibold text-[#4c4f69] bg-white border border-[#e2e6f3] hover:border-[#c7d2ef] transition-all duration-200';

const TourApproval = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const [loading, setLoading] = useState(false);
  const [pendingTours, setPendingTours] = useState([]);
  const [selectedTour, setSelectedTour] = useState(null);
  const [showTourModal, setShowTourModal] = useState(false);

  const loadPendingTours = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(API_ENDPOINTS.TOURS, {
        headers: createAuthHeaders(token)
      });

      if (!response.ok) throw new Error('Failed to load tours');
      const tours = await response.json();
      const pending = tours.filter(t => t.tourStatus === 'NOT_APPROVED');
      setPendingTours(pending);
    } catch (error) {
      console.error('Error loading pending tours:', error);
      showError('Không thể tải danh sách tour chờ duyệt');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadPendingTours();
  }, [loadPendingTours]);

  const handleTourApproval = async (tourId, approve) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const status = approve ? 'PUBLIC' : 'NOT_APPROVED';
      const response = await fetch(`${BaseURL}/api/tour/change-status/${tourId}?status=${status}`, {
        method: 'PUT',
        headers: createAuthHeaders(token)
      });

      if (!response.ok) throw new Error('Failed to update tour status');
      showSuccess(approve ? 'Phê duyệt tour thành công' : 'Từ chối tour thành công');
      setShowTourModal(false);
      loadPendingTours();
    } catch (error) {
      console.error('Error updating tour status:', error);
      showError('Không thể cập nhật trạng thái tour');
    }
  };

  const renderLoadingState = (message) => (
    <div className="py-16 text-center text-sm text-[#8d94a8]">{message}</div>
  );

  const renderEmptyState = (message) => (
    <div className="py-16 text-center">
      <p className="text-sm text-[#a0a7bb]">{message}</p>
    </div>
  );

  return (
    <>
      <div className={`${pastelCardClasses}`}>
        <div className="flex flex-col gap-2 border-b border-[#eef2ff] px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[#a3acc7]">Tour Approval</p>
            <h3 className="text-xl font-semibold text-[#111827]">Pending Tours</h3>
          </div>
          <button onClick={loadPendingTours} className={neutralButtonClasses}>Refresh</button>
        </div>
        {loading ? renderLoadingState('Đang tải tour chờ duyệt...') : pendingTours.length === 0 ? renderEmptyState('Không có tour nào chờ duyệt') : (
          <div className="grid gap-4 p-6">
            {pendingTours.map((tour) => (
              <div key={tour.tourId} className="rounded-[26px] border border-[#dfe9ff] bg-[#f7f9ff] p-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h4 className="text-lg font-semibold text-[#1f2937]">{tour.tourName}</h4>
                    <p className="text-sm text-[#6b7280]">ID: #{tour.tourId}</p>
                    <p className="text-sm text-[#6b7280]">Giá: {tour.adultPrice?.toLocaleString('vi-VN')} VNĐ</p>
                    <span className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#fff4d8] px-3 py-1 text-xs font-medium text-[#b7791f]">
                      {tour.tourStatus}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedTour(tour);
                      setShowTourModal(true);
                    }}
                    className={primaryButtonClasses}
                  >
                    Xem chi tiết
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tour Detail Modal */}
      {showTourModal && selectedTour && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-2xl rounded-[32px] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#f0f2f8] pb-4">
              <h2 className="text-xl font-semibold text-[#111827]">Tour Details</h2>
              <button onClick={() => setShowTourModal(false)} className="text-[#9ca3af] hover:text-[#4b5563]">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-[#a3acc7]">Tour Name</p>
                <p className="text-sm text-[#111827]">{selectedTour.tourName}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-[#a3acc7]">Price</p>
                <p className="text-sm text-[#111827]">{selectedTour.adultPrice?.toLocaleString('vi-VN')} VNĐ</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-[#a3acc7]">Status</p>
                <span className="mt-2 inline-flex items-center rounded-full bg-[#fff4d8] px-3 py-1 text-xs font-semibold text-[#b7791f]">
                  {selectedTour.tourStatus}
                </span>
              </div>
              <div className="grid gap-3 pt-4 md:grid-cols-2">
                <button onClick={() => handleTourApproval(selectedTour.tourId, true)} className={`${primaryButtonClasses} justify-center`}>
                  Phê duyệt
                </button>
                <button onClick={() => handleTourApproval(selectedTour.tourId, false)} className={`${neutralButtonClasses} justify-center`}>
                  Từ chối
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TourApproval;
