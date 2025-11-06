import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import LoginRequiredModal from '../../../components/modals/LoginRequiredModal/LoginRequiredModal';
import { useToast } from '../../../contexts/ToastContext';

const CompanyInfo = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { showError, showSuccess } = useToast();
  const [userEmail, setUserEmail] = useState('');

  const [files, setFiles] = useState({
    businessLicense: null,
    idCardFront: null,
    idCardBack: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState({
    businessLicenseName: '',
    idCardFrontName: '',
    idCardBackName: ''
  });
  const [initialized, setInitialized] = useState(false);

  // Mark onboarding pending so next logins can return here easily
  useEffect(() => {
    try {
      localStorage.setItem('company_onboarding_pending', 'true');
    } catch {}
  }, []);

  useEffect(() => {
    if (authLoading) {
      return; // Đợi auth khởi tạo xong để tránh redirect sớm khi login qua OAuth
    }
    // Ưu tiên email của người dùng đang đăng nhập; nếu không có thì dùng email lưu tạm sau bước đăng ký
    let email = user?.email || null;
    if (!email) {
      email = localStorage.getItem('userEmail');
    }
    
    if (email) {
      setUserEmail(email);
      // Kiểm tra trạng thái đã nộp hồ sơ trên thiết bị này
      const statusKey = `businessUploadStatus:${email}`;
      const status = localStorage.getItem(statusKey);
      // Ưu tiên hỏi backend xem đã từng upload chưa
      const fetchStatus = async () => {
        try {
          const headers = {};
          const token = sessionStorage.getItem('token') || localStorage.getItem('token');
          if (token) headers['Authorization'] = `Bearer ${token}`;
          const res = await fetch(`/api/users/business-upload-status?email=${encodeURIComponent(email)}`, { headers });
          const data = await res.json();
          if ((data.code === 1000 || data.code === 0) && data.result) {
            // Chỉ coi là đã upload khi vai trò hiện tại là business hoặc backend có dữ liệu
            if (data.result.uploaded) {
              setAlreadySubmitted(true);
              setSubmittedData({
                businessLicenseName: data.result.businessLicenseFileName || '',
                idCardFrontName: data.result.idCardFrontFileName || '',
                idCardBackName: data.result.idCardBackFileName || ''
              });
              // Ghi xuống localStorage để tăng tốc lần sau (fallback)
              localStorage.setItem(`businessUploadStatus:${email}`, 'submitted');
              localStorage.setItem(
                `businessUploadData:${email}`,
                JSON.stringify({
                  businessLicenseName: data.result.businessLicenseFileName || '',
                  idCardFrontName: data.result.idCardFrontFileName || '',
                  idCardBackName: data.result.idCardBackFileName || ''
                })
              );
            }
          }
        } catch (e) {
          // Fallback sang dữ liệu cục bộ nếu có
          if (status === 'submitted') {
            setAlreadySubmitted(true);
            const dataKey = `businessUploadData:${email}`;
            const raw = localStorage.getItem(dataKey);
            if (raw) {
              try {
                const parsed = JSON.parse(raw);
                setSubmittedData({
                  businessLicenseName: parsed.businessLicenseName || '',
                  idCardFrontName: parsed.idCardFrontName || '',
                  idCardBackName: parsed.idCardBackName || ''
                });
              } catch {}
            }
          }
        }
      };
      fetchStatus().finally(() => setInitialized(true));
    } else {
      // Không điều hướng ngay; chờ auth hoàn tất và hiển thị UI phù hợp
      setInitialized(true);
    }
  }, [navigate, user, authLoading]);

  const handleFileChange = (e, fileType) => {
    const file = e.target.files[0];
    if (file) {
      setFiles(prev => ({
        ...prev,
        [fileType]: file
      }));
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (alreadySubmitted) {
      return; // Đã nộp rồi thì không cho nộp nữa
    }
    setLoading(true);
    setError('');
    setSuccess('');

    // Collect all validation errors
    const errors = [];

    // Validate files
    if (!files.businessLicense) {
      errors.push('Vui lòng upload giấy phép kinh doanh');
    }
    if (!files.idCardFront) {
      errors.push('Vui lòng upload mặt trước CCCD');
    }
    if (!files.idCardBack) {
      errors.push('Vui lòng upload mặt sau CCCD');
    }

    // Validate file types
    const allowedTypes = {
      businessLicense: ['application/pdf'],
      idCardFront: ['image/jpeg', 'image/jpg', 'image/png'],
      idCardBack: ['image/jpeg', 'image/jpg', 'image/png']
    };

    if (files.businessLicense && !allowedTypes.businessLicense.includes(files.businessLicense.type)) {
      errors.push('File giấy phép kinh doanh phải là định dạng PDF');
    }

    if (files.idCardFront && !allowedTypes.idCardFront.includes(files.idCardFront.type)) {
      errors.push('File mặt trước CCCD phải là định dạng JPG, JPEG hoặc PNG');
    }

    if (files.idCardBack && !allowedTypes.idCardBack.includes(files.idCardBack.type)) {
      errors.push('File mặt sau CCCD phải là định dạng JPG, JPEG hoặc PNG');
    }

    // Validate file sizes (max 25MB each)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (files.businessLicense && files.businessLicense.size > maxSize) {
      errors.push('File giấy phép kinh doanh không được vượt quá 25MB');
    }
    if (files.idCardFront && files.idCardFront.size > maxSize) {
      errors.push('File mặt trước CCCD không được vượt quá 25MB');
    }
    if (files.idCardBack && files.idCardBack.size > maxSize) {
      errors.push('File mặt sau CCCD không được vượt quá 25MB');
    }

    // Show all errors if any
    if (errors.length > 0) {
      // Show all errors at the same time
      errors.forEach((error) => {
        showError(error);
      });
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', files.businessLicense);
      formData.append('idCardFront', files.idCardFront);
      formData.append('idCardBack', files.idCardBack);
      formData.append('email', userEmail);

      // Chuẩn bị headers
      const headers = {};
      
      // Kiểm tra xem có user đã đăng nhập không
      const savedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      
      if (savedUser && token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('Sending request with authentication token');
      } else {
        console.log('Sending request without authentication (public endpoint)');
      }

      console.log('Request URL:', '/api/users/update-business-license');
      console.log('Request method:', 'PUT');
      console.log('Request headers:', headers);

      const response = await fetch('/api/users/update-business-license', {
        method: 'PUT',
        headers: headers,
        body: formData,
      });

      console.log('Response status:', response.status);
      console.log('Response status text:', response.statusText);

      if (response.ok) {
        showSuccess('toast.company.info_submit_success');
        // Ghi nhận đã nộp hồ sơ (theo email) trên thiết bị này để chặn nộp lại
        const statusKey = `businessUploadStatus:${userEmail}`;
        localStorage.setItem(statusKey, 'submitted');
        setAlreadySubmitted(true);
        // Lưu metadata để hiển thị lại tên file đã gửi
        const dataKey = `businessUploadData:${userEmail}`;
        localStorage.setItem(
          dataKey,
          JSON.stringify({
            businessLicenseName: files.businessLicense?.name || '',
            idCardFrontName: files.idCardFront?.name || '',
            idCardBackName: files.idCardBack?.name || ''
          })
        );
        setSubmittedData({
          businessLicenseName: files.businessLicense?.name || '',
          idCardFrontName: files.idCardFront?.name || '',
          idCardBackName: files.idCardBack?.name || ''
        });
        // Chuyển đến trang pending sau 2 giây
        setTimeout(() => {
          navigate('/pending-page');
        }, 2000);
      } else {
        let errorMessage = 'Có lỗi xảy ra khi gửi thông tin. Vui lòng thử lại.';
        
        try {
          const data = await response.json();
          errorMessage = data.message || errorMessage;
          console.log('Error response data:', data);
          
          // Xử lý lỗi FPT API
          if (errorMessage.includes('Unable to find ID card') || errorMessage.includes('ID card')) {
            errorMessage = 'Không thể nhận diện CCCD. Vui lòng đảm bảo: 1) Ảnh CCCD rõ ràng, 2) Không bị mờ hoặc che khuất, 3) Là ảnh thật không phải ảnh màn hình';
          }
        } catch (e) {
          console.log('Could not parse error response as JSON');
          const text = await response.text();
          console.log('Error response text:', text);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        
        showError(errorMessage);
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      showError('toast.company.info_submit_failed');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !initialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-600">{t('company.loading')}</div>
      </div>
    );
  }

  // Require login for accessing company info upload page
  if (!user) {
    return (
      <LoginRequiredModal 
        isOpen={true}
        onClose={() => {}}
        title={t('auth.loginRequired.title')}
        message={t('auth.loginRequired.message')}
        redirectTo="/login"
        returnTo={location?.pathname || '/company-info'}
      />
    );
  }

  if (!userEmail) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('company.notFoundTitle')}</h2>
          <button
            onClick={() => navigate('/register')}
            className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-hover"
          >
            {t('company.backToRegister')}
          </button>
        </div>
      </div>
    );
  }

  // Trạng thái cho tài khoản doanh nghiệp
  const isCompanyApproved = user && user.role === 'COMPANY' && user.status === 'UNBANNED';
  const isCompanyPending = user && user.role === 'COMPANY' && user.status === 'COMPANY_PENDING';
  if (isCompanyPending) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-white shadow rounded-lg p-8">
            <div className="mb-6">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-4">
                <svg className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Hồ sơ đang được xét duyệt</h2>
              <p className="text-gray-600">
                Cảm ơn bạn đã cung cấp thông tin. Hồ sơ doanh nghiệp đang ở trạng thái chờ duyệt. Thời gian xử lý thường từ 1-3 ngày làm việc.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (isCompanyApproved) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-white shadow rounded-lg p-8">
            <div className="mb-6">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Tài khoản doanh nghiệp</h2>
              <p className="text-gray-600 mb-6">
                Tài khoản của bạn đã được xác nhận là doanh nghiệp. Bạn có thể truy cập vào các tính năng dành cho doanh nghiệp.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate('/company/dashboard')}
                className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                Vào trang quản lý
              </button>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                Về trang chủ
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Nếu người dùng không phải role COMPANY: chỉ cho phép nếu có ý định đăng ký business
  if (user && user.role !== 'COMPANY') {
    const intent = (typeof window !== 'undefined') ? localStorage.getItem('registration_intent') : null;
    if (intent === 'business') {
      // Cho phép vào trang upload để hoàn tất KYC
      // (tiếp tục xuống phần render form phía dưới)
    } else {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-white shadow rounded-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('auth.loginRequired.title')}</h2>
            <p className="text-gray-600 mb-6">Vui lòng đăng ký/đăng nhập bằng tài khoản Company để tiếp tục.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate('/register')}
                className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                Đăng ký tài khoản Company
              </button>
              <button
                onClick={() => navigate('/login')}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                Đăng nhập
              </button>
            </div>
          </div>
        </div>
      </div>
    );
    }
  }

  // Nếu đã nộp hồ sơ trước đó, hiển thị lại các mục với dấu tick và tên file
  if (alreadySubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 py-6 sm:py-12">
        <div className="max-w-2xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="bg-white shadow rounded-lg">
            <div className="px-3 py-4 sm:px-4 sm:py-5 lg:p-6">
              <div className="mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{t('company.submittedTitle')}</h2>
                <p className="text-sm sm:text-base text-gray-600">{t('company.submittedSubtitle')}</p>
              </div>

              <div className="space-y-4 sm:space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('company.form.businessLicense')}</label>
                  <div className="mt-2 flex items-center text-sm">
                    <span className="inline-flex items-center text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
                      <svg className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414l2.293 2.293 6.543-6.543a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                      {submittedData.businessLicenseName || t('company.submit')}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text.sm font-medium text-gray-700">{t('company.form.idFront')}</label>
                  <div className="mt-2 flex items-center text-sm">
                    <span className="inline-flex items-center text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
                      <svg className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414l2.293 2.293 6.543-6.543a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                      {submittedData.idCardFrontName || t('company.submit')}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('company.form.idBack')}</label>
                  <div className="mt-2 flex items-center text-sm">
                    <span className="inline-flex items-center text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
                      <svg className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414l2.293 2.293 6.543-6.543a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                      {submittedData.idCardBackName || t('company.submit')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-secondary border border-primary rounded-lg p-3 sm:p-4 my-4 sm:my-6">
                <p className="text-primary text-xs sm:text-sm">{t('company.submittedSubtitle')}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={() => navigate('/pending-page')}
                  className="w-full sm:w-auto px-3 sm:px-4 py-2 border border-transparent rounded-md shadow-sm text-xs sm:text-sm font-medium text-white bg-primary hover:bg-primary-hover"
                >
                  {t('company.submittedViewPending')}
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="w-full sm:w-auto px-3 sm:px-4 py-2 border border-gray-300 rounded-md text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {t('pending.btnHome')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-12">
      <div className="max-w-2xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-3 py-4 sm:px-4 sm:py-5 lg:p-6">
            <div className="mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{t('company.heading')}</h2>
              <p className="text-sm sm:text-base text-gray-600">{t('company.subtitle')}</p>
            </div>

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md text-sm mb-4">
                {success}
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div>
                <label htmlFor="businessLicense" className="block text-sm font-medium text-gray-700">{t('company.form.businessLicense')}</label>
                <div className="mt-1">
                  <input
                    type="file"
                    id="businessLicense"
                    accept=".pdf"
                    onChange={(e) => handleFileChange(e, 'businessLicense')}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-secondary file:text-primary hover:file:bg-primary"
                  />
                </div>
                {files.businessLicense && (
                  <p className="mt-2 text-sm text-green-600">{t('company.selectedPrefix')} {files.businessLicense.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="idCardFront" className="block text-sm font-medium text-gray-700">{t('company.form.idFront')}</label>
                <div className="mt-1">
                  <input
                    type="file"
                    id="idCardFront"
                    accept=".jpg,.jpeg,.png"
                    onChange={(e) => handleFileChange(e, 'idCardFront')}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-secondary file:text-primary hover:file:bg-primary"
                  />
                </div>
                {files.idCardFront && (
                  <p className="mt-2 text-sm text-green-600">{t('company.selectedPrefix')} {files.idCardFront.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="idCardBack" className="block text-sm font-medium text-gray-700">{t('company.form.idBack')}</label>
                <div className="mt-1">
                  <input
                    type="file"
                    id="idCardBack"
                    accept=".jpg,.jpeg,.png"
                    onChange={(e) => handleFileChange(e, 'idCardBack')}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-secondary file:text-primary hover:file:bg-primary"
                  />
                </div>
                {files.idCardBack && (
                  <p className="mt-2 text-sm text-green-600">{t('company.selectedPrefix')} {files.idCardBack.name}</p>
                )}
              </div>

              <div className="bg-secondary border border-primary rounded-lg p-3 sm:p-4">
                <h3 className="text-xs sm:text-sm font-medium text-primary mb-2">{t('company.important.title')}</h3>
                <ul className="text-xs sm:text-sm text-primary space-y-1">
                  <li>{t('company.important.i1')}</li>
                  <li>{t('company.important.i2')}</li>
                  <li>{t('company.important.i3')}</li>
                  <li>{t('company.important.i4')}</li>
                  <li>{t('company.important.i5')}</li>
                  <li>{t('company.important.i6')}</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 sm:space-x-0">
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="w-full sm:w-auto px-3 sm:px-4 py-2 border border-gray-300 rounded-md text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  {t('company.back')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-3 sm:px-4 py-2 border border-transparent rounded-md shadow-sm text-xs sm:text-sm font-medium text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                >
                  {loading ? t('company.submitting') : t('company.submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyInfo; 