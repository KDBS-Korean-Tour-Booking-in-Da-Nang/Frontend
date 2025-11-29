import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../contexts/ToastContext';
import { API_ENDPOINTS, BaseURL, createAuthHeaders } from '../../../../config/api';
import { XMarkIcon } from '@heroicons/react/24/outline';

const pastelCardClasses = 'rounded-[28px] bg-white/95 border border-[#eceff7] shadow-[0_15px_45px_rgba(15,23,42,0.08)]';
const primaryButtonClasses = 'inline-flex items-center justify-center gap-2 rounded-[999px] px-5 py-2 text-sm font-semibold text-white bg-[#4c9dff] hover:bg-[#3f87e0] transition-all duration-200 shadow-[0_10px_25px_rgba(76,157,255,0.35)]';
const neutralButtonClasses = 'inline-flex items-center justify-center gap-2 rounded-[999px] px-5 py-2 text-sm font-semibold text-[#4c4f69] bg-white border border-[#e2e6f3] hover:border-[#c7d2ef] transition-all duration-200';

const CompanyManagement = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const [loading, setLoading] = useState(false);
  const [companyRequests, setCompanyRequests] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showCompanyModal, setShowCompanyModal] = useState(false);

  const loadCompanyRequests = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await fetch(API_ENDPOINTS.USERS, {
        headers: createAuthHeaders(token)
      });

      if (!response.ok) throw new Error('Failed to load users');
      const data = await response.json();
      const users = Array.isArray(data) ? data : (data.result || []);
      const pending = users.filter(u =>
        u.status === 'COMPANY_PENDING' &&
        (u.role === 'COMPANY' || u.role === 'BUSINESS')
      );
      setCompanyRequests(pending);
    } catch (error) {
      console.error('Error loading company requests:', error);
      showError('Không thể tải danh sách yêu cầu công ty');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadCompanyRequests();
  }, [loadCompanyRequests]);

  const handleCompanyApproval = async (userId) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const roleResponse = await fetch(`${BaseURL}/api/staff/update-role/${userId}?role=COMPANY`, {
        method: 'PUT',
        headers: createAuthHeaders(token)
      });
      if (!roleResponse.ok) throw new Error('Failed to update role');

      const statusResponse = await fetch(`${BaseURL}/api/staff/ban-user/${userId}?ban=false`, {
        method: 'PUT',
        headers: createAuthHeaders(token)
      });
      if (!statusResponse.ok) throw new Error('Failed to update status');

      showSuccess('Phê duyệt công ty thành công');
      setShowCompanyModal(false);
      loadCompanyRequests();
    } catch (error) {
      console.error('Error approving company:', error);
      showError('Không thể phê duyệt công ty');
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
            <p className="text-xs uppercase tracking-[0.35em] text-[#a3acc7]">Company Workflow</p>
            <h3 className="text-xl font-semibold text-[#111827]">Company Request Management</h3>
          </div>
          <button onClick={loadCompanyRequests} className={neutralButtonClasses}>Refresh</button>
        </div>
        {loading ? renderLoadingState('Đang tải yêu cầu doanh nghiệp...') : companyRequests.length === 0 ? renderEmptyState('Chưa có yêu cầu công ty nào chờ duyệt') : (
          <div className="grid gap-4 p-6">
            {companyRequests.map((company) => (
              <div key={company.userId} className="rounded-[26px] border border-[#edf0fb] bg-[#fbfcff] p-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h4 className="text-lg font-semibold text-[#1f2937]">{company.username || company.name || 'N/A'}</h4>
                    <p className="text-sm text-[#6b7280]">Email: {company.email}</p>
                    <p className="text-sm text-[#6b7280]">Phone: {company.phone || 'N/A'}</p>
                    <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#fff4d8] px-3 py-1 text-xs font-medium text-[#b7791f]">
                      {company.status}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedCompany(company);
                      setShowCompanyModal(true);
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

      {/* Company Detail Modal */}
      {showCompanyModal && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-2xl rounded-[32px] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#f0f2f8] pb-4">
              <h2 className="text-xl font-semibold text-[#111827]">Company Details</h2>
              <button onClick={() => setShowCompanyModal(false)} className="text-[#9ca3af] hover:text-[#4b5563]">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-[#a3acc7]">Username</p>
                <p className="text-sm text-[#111827]">{selectedCompany.username || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-[#a3acc7]">Email</p>
                <p className="text-sm text-[#111827]">{selectedCompany.email}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-[#a3acc7]">Phone</p>
                <p className="text-sm text-[#111827]">{selectedCompany.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-[#a3acc7]">Status</p>
                <span className="mt-2 inline-flex items-center rounded-full bg-[#fff4d8] px-3 py-1 text-xs font-semibold text-[#b7791f]">
                  {selectedCompany.status}
                </span>
              </div>
              <div className="grid gap-3 pt-4 md:grid-cols-2">
                <button onClick={() => handleCompanyApproval(selectedCompany.userId)} className={`${primaryButtonClasses} justify-center`}>
                  Phê duyệt
                </button>
                <button onClick={() => setShowCompanyModal(false)} className={`${neutralButtonClasses} justify-center`}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CompanyManagement;
