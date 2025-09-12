import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import './businessInfo.css';

const BusinessInfo = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
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

    // Validate files
    if (!files.businessLicense || !files.idCardFront || !files.idCardBack) {
      setError('Vui lòng upload đầy đủ 3 file: Giấy phép kinh doanh, Mặt trước CCCD, Mặt sau CCCD');
      setLoading(false);
      return;
    }

    // Validate file types
    const allowedTypes = {
      businessLicense: ['application/pdf'],
      idCardFront: ['image/jpeg', 'image/jpg', 'image/png'],
      idCardBack: ['image/jpeg', 'image/jpg', 'image/png']
    };

    if (!allowedTypes.businessLicense.includes(files.businessLicense.type)) {
      setError('File giấy phép kinh doanh phải là định dạng PDF');
      setLoading(false);
      return;
    }

    if (!allowedTypes.idCardFront.includes(files.idCardFront.type) || 
        !allowedTypes.idCardBack.includes(files.idCardBack.type)) {
      setError('File CCCD phải là định dạng JPG, JPEG hoặc PNG');
      setLoading(false);
      return;
    }

    // Validate file sizes (max 25MB each)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (files.businessLicense.size > maxSize || 
        files.idCardFront.size > maxSize || 
        files.idCardBack.size > maxSize) {
      setError('Mỗi file không được vượt quá 25MB');
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
        setSuccess('Thông tin doanh nghiệp đã được gửi thành công!');
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
        
        setError(errorMessage);
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      setError('Có lỗi xảy ra khi gửi thông tin. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !initialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-600">{t('business.loading')}</div>
      </div>
    );
  }

  if (!userEmail) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('business.notFoundTitle')}</h2>
          <button
            onClick={() => navigate('/register')}
            className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-hover"
          >
            {t('business.backToRegister')}
          </button>
        </div>
      </div>
    );
  }

  // Nếu người dùng đăng nhập là role user (chưa được nâng cấp business), vẫn cho phép upload
  // nhưng chỉ hiển thị "đã upload" khi backend xác nhận uploaded=true. local fallback sẽ không kích hoạt
  // đối với user thường để tránh false-positive từ email tạm trong localStorage.

  // Nếu đã nộp hồ sơ trước đó, hiển thị lại các mục với dấu tick và tên file
  if (alreadySubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('business.submittedTitle')}</h2>
                <p className="text-gray-600">{t('business.submittedSubtitle')}</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('business.form.businessLicense')}</label>
                  <div className="mt-2 flex items-center text-sm">
                    <span className="inline-flex items-center text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
                      <svg className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414l2.293 2.293 6.543-6.543a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                      {submittedData.businessLicenseName || t('business.submit')}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text.sm font-medium text-gray-700">{t('business.form.idFront')}</label>
                  <div className="mt-2 flex items-center text-sm">
                    <span className="inline-flex items-center text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
                      <svg className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414l2.293 2.293 6.543-6.543a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                      {submittedData.idCardFrontName || t('business.submit')}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('business.form.idBack')}</label>
                  <div className="mt-2 flex items-center text-sm">
                    <span className="inline-flex items-center text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1">
                      <svg className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414l2.293 2.293 6.543-6.543a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                      {submittedData.idCardBackName || t('business.submit')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-secondary border border-primary rounded-lg p-4 my-6">
                <p className="text-primary text-sm">{t('business.submittedSubtitle')}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/pending-page')}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover"
                >
                  {t('business.submittedViewPending')}
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
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
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('business.heading')}</h2>
              <p className="text-gray-600">{t('business.subtitle')}</p>
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

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="businessLicense" className="block text-sm font-medium text-gray-700">{t('business.form.businessLicense')}</label>
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
                  <p className="mt-2 text-sm text-green-600">{t('business.selectedPrefix')} {files.businessLicense.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="idCardFront" className="block text-sm font-medium text-gray-700">{t('business.form.idFront')}</label>
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
                  <p className="mt-2 text-sm text-green-600">{t('business.selectedPrefix')} {files.idCardFront.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="idCardBack" className="block text-sm font-medium text-gray-700">{t('business.form.idBack')}</label>
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
                  <p className="mt-2 text-sm text-green-600">{t('business.selectedPrefix')} {files.idCardBack.name}</p>
                )}
              </div>

              <div className="bg-secondary border border-primary rounded-lg p-4">
                <h3 className="text-sm font-medium text-primary mb-2">{t('business.important.title')}</h3>
                <ul className="text-sm text-primary space-y-1">
                  <li>{t('business.important.i1')}</li>
                  <li>{t('business.important.i2')}</li>
                  <li>{t('business.important.i3')}</li>
                  <li>{t('business.important.i4')}</li>
                  <li>{t('business.important.i5')}</li>
                  <li>{t('business.important.i6')}</li>
                </ul>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  {t('business.back')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                >
                  {loading ? t('business.submitting') : t('business.submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessInfo; 