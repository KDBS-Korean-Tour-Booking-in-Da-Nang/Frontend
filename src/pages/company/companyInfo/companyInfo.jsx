import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import LoginRequiredModal from '../../../components/modals/LoginRequiredModal/LoginRequiredModal';
import { useToast } from '../../../contexts/ToastContext';
import { getApiPath } from '../../../config/api';
import { 
  Upload, 
  FileText, 
  Image, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  FileCheck, 
  Shield, 
  Info,
  Home,
  CheckCircle,
  AlertTriangle,
  FileUp,
  Clock
} from 'lucide-react';
import styles from './companyInfo.module.css';

const CompanyInfo = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, refreshUser } = useAuth();
  const { showSuccess } = useToast();
  const [userEmail, setUserEmail] = useState('');

  const [files, setFiles] = useState({
    businessLicense: null,
    idCardFront: null,
    idCardBack: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fileErrors, setFileErrors] = useState({
    businessLicense: '',
    idCardFront: '',
    idCardBack: ''
  });
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [submittedData, setSubmittedData] = useState({
    businessLicenseName: '',
    idCardFrontName: '',
    idCardBackName: ''
  });
  const [initialized, setInitialized] = useState(false);

  // Đánh dấu company onboarding là pending trong localStorage để dễ quay lại khi login lần sau: set 'company_onboarding_pending' = 'true'
  useEffect(() => {
    try {
      localStorage.setItem('company_onboarding_pending', 'true');
    } catch (error) {
      // Silently handle error
    }
  }, []);

  // Khởi tạo component: lấy user email (từ logged-in user hoặc localStorage fallback), check backend trước cho upload status (fallback localStorage), mark as submitted nếu backend confirm files đã upload, lưu metadata vào localStorage để cache
  useEffect(() => {
    if (authLoading) {
      return;
    }
    let email = user?.email || null;
    if (!email) {
      email = localStorage.getItem('userEmail');
    }
    
    if (email) {
      setUserEmail(email);
      const statusKey = `businessUploadStatus:${email}`;
      const status = localStorage.getItem(statusKey);
      const fetchStatus = async () => {
        try {
          const headers = {};
          const token = sessionStorage.getItem('token') || localStorage.getItem('token');
          if (token) headers['Authorization'] = `Bearer ${token}`;
          const res = await fetch(getApiPath(`/api/users/business-upload-status?email=${encodeURIComponent(email)}`), { headers });
          const data = await res.json();
          if ((data.code === 1000 || data.code === 0) && data.result) {
            if (data.result.uploaded) {
              setAlreadySubmitted(true);
              setSubmittedData({
                businessLicenseName: data.result.businessLicenseFileName || '',
                idCardFrontName: data.result.idCardFrontFileName || '',
                idCardBackName: data.result.idCardBackFileName || ''
              });
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
              } catch {
                // Silently handle error
              }
            }
          }
        }
      };
      fetchStatus().finally(() => setInitialized(true));
    } else {
      setInitialized(true);
    }
  }, [navigate, user, authLoading]);

  // Xử lý file selection: validate và store file, clear errors cho file type đó khi user chọn file mới
  const handleFileChange = (e, fileType) => {
    const file = e.target.files[0];
    if (file) {
      setFiles(prev => ({
        ...prev,
        [fileType]: file
      }));
      setFileErrors(prev => ({
        ...prev,
        [fileType]: ''
      }));
      setError('');
    }
  };

  // Xử lý form submit: validate files (required files, file types, file sizes max 25MB), upload lên backend với FormData, handle 401, handle ID card recognition errors, refresh user data để get updated status, navigate đến pending-page nếu thành công
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (alreadySubmitted) {
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    setFileErrors({
      businessLicense: '',
      idCardFront: '',
      idCardBack: ''
    });

    const errors = [];

    if (!files.businessLicense) {
      errors.push('Vui lòng upload giấy phép kinh doanh');
    }
    if (!files.idCardFront) {
      errors.push('Vui lòng upload mặt trước CCCD');
    }
    if (!files.idCardBack) {
      errors.push('Vui lòng upload mặt sau CCCD');
    }

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

    const maxSize = 25 * 1024 * 1024;
    if (files.businessLicense && files.businessLicense.size > maxSize) {
      errors.push('File giấy phép kinh doanh không được vượt quá 25MB');
    }
    if (files.idCardFront && files.idCardFront.size > maxSize) {
      errors.push('File mặt trước CCCD không được vượt quá 25MB');
    }
    if (files.idCardBack && files.idCardBack.size > maxSize) {
      errors.push('File mặt sau CCCD không được vượt quá 25MB');
    }

    if (errors.length > 0) {
      const newFileErrors = { businessLicense: '', idCardFront: '', idCardBack: '' };
      errors.forEach((errorMsg) => {
        if (errorMsg.includes('Giấy phép kinh doanh')) {
          newFileErrors.businessLicense = errorMsg;
        } else if (errorMsg.includes('mặt trước')) {
          newFileErrors.idCardFront = errorMsg;
        } else if (errorMsg.includes('mặt sau')) {
          newFileErrors.idCardBack = errorMsg;
        }
      });
      setFileErrors(newFileErrors);
      setError(errors[0]); // Show first error as general error
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', files.businessLicense);
      formData.append('idCardFront', files.idCardFront);
      formData.append('idCardBack', files.idCardBack);
      formData.append('email', userEmail);

      const headers = {};
      
      const savedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      
      if (savedUser && token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(getApiPath('/api/users/update-business-license'), {
        method: 'PUT',
        headers: headers,
        body: formData,
      });

      if (!response.ok && response.status === 401) {
        const { handleApiError } = await import('../../../utils/apiErrorHandler');
        await handleApiError(response);
        return;
      }
      
      if (response.ok) {
        showSuccess(t('toast.company.info_submit_success'));
        const statusKey = `businessUploadStatus:${userEmail}`;
        localStorage.setItem(statusKey, 'submitted');
        setAlreadySubmitted(true);
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
        
        try {
          const updatedUser = await refreshUser();
          if (updatedUser) {
            // User context updated
          }
        } catch (refreshError) {
          // Silently handle error
        }
        
        navigate('/pending-page', { replace: true });
      } else {
        const resetIdCards = {
          businessLicense: files.businessLicense,
          idCardFront: null,
          idCardBack: null
        };
        
        let errorMessage = 'Có lỗi xảy ra khi gửi thông tin. Vui lòng thử lại.';
        let idCardError = '';
        
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            errorMessage = data.message || errorMessage;
            
            const lowerMessage = (errorMessage || '').toLowerCase();
            
            if (lowerMessage.includes('unable to find id card') || 
                lowerMessage.includes('id card') ||
                lowerMessage.includes('không thể nhận diện') ||
                lowerMessage.includes('runtime exception')) {
              idCardError = 'Không thể nhận diện CCCD trong ảnh. Vui lòng đảm bảo:\n1) Ảnh CCCD rõ ràng, không bị mờ\n2) Không bị che khuất hoặc cắt xén\n3) Là ảnh thật (không phải ảnh chụp màn hình)\n4) Đủ ánh sáng, không bị phản quang\n5) CCCD phải còn nguyên vẹn, không bị rách';
              
              setFileErrors({
                businessLicense: '',
                idCardFront: idCardError,
                idCardBack: ''
              });
              
              setFiles(resetIdCards);
              
              setError('Không thể xử lý ảnh CCCD. Vui lòng kiểm tra và upload lại ảnh CCCD hợp lệ.');
            } else {
              setError(errorMessage);
            }
          } else {
            const text = await response.text();
            
            if (text.includes('Unable to find ID card') || text.toLowerCase().includes('id card')) {
              idCardError = 'Không thể nhận diện CCCD trong ảnh. Vui lòng upload lại ảnh CCCD hợp lệ.';
              setFileErrors({
                businessLicense: '',
                idCardFront: idCardError,
                idCardBack: ''
              });
              setFiles(resetIdCards);
              setError(idCardError);
            } else {
              errorMessage = `HTTP ${response.status}: ${response.statusText || 'Lỗi không xác định'}`;
              setError(errorMessage);
            }
          }
        } catch (parseError) {
          if (response.status === 500) {
            errorMessage = 'Lỗi xử lý trên máy chủ. Vui lòng kiểm tra lại ảnh CCCD và thử lại.';
            idCardError = 'Có vấn đề với ảnh CCCD. Vui lòng upload lại ảnh CCCD hợp lệ.';
            setFileErrors({
              businessLicense: '',
              idCardFront: idCardError,
              idCardBack: ''
            });
            setFiles(resetIdCards);
          } else {
            errorMessage = `HTTP ${response.status}: ${response.statusText || 'Lỗi không xác định'}`;
          }
          setError(errorMessage);
        }
      }
    } catch (error) {
      setError(t('toast.company.info_submit_failed') || 'Gửi thông tin thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Require login để truy cập company info upload page: hiển thị LoginRequiredModal nếu không có user
  if (authLoading || !initialized) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 style={{ width: '2rem', height: '2rem', color: '#718096', animation: 'spin 1s linear infinite' }} />
        <div className={styles.loadingText}>{t('company.loading')}</div>
      </div>
    );
  }

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
      <div className={styles.emptyContainer}>
        <div className={styles.backgroundBlobs}>
          <div className={styles.blob1} />
          <div className={styles.blob2} />
          <div className={styles.blob3} />
        </div>
        <div className={styles.emptyCard}>
          <div className={styles.emptyCardContent}>
            <div className={styles.emptyIconWrapper}>
              <AlertCircle className={styles.emptyIcon} />
            </div>
            <h2 className={styles.emptyTitle}>{t('company.notFoundTitle')}</h2>
            <button
              onClick={() => navigate('/register')}
              className={styles.primaryButton}
            >
              {t('company.backToRegister')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isCompanyApproved = user && user.role === 'COMPANY' && user.status === 'UNBANNED';
  const isCompanyPending = user && user.role === 'COMPANY' && user.status === 'COMPANY_PENDING';
  
  // Nếu company đã approved: hiển thị success message với nút vào trang quản lý và về trang chủ
  if (isCompanyApproved) {
    return (
      <div className={styles.emptyContainer}>
        <div className={styles.backgroundBlobs}>
          <div className={styles.blob1} />
          <div className={styles.blob2} />
          <div className={styles.blob3} />
        </div>
        <div className={styles.emptyCard}>
          <div className={styles.emptyCardContent}>
            <div className={styles.emptyIconWrapper} style={{ background: 'linear-gradient(to bottom right, #e9fff7, #f0f5ff)' }}>
              <CheckCircle className={styles.emptyIcon} style={{ color: '#048a59' }} />
            </div>
            <h2 className={styles.emptyTitle}>Tài khoản doanh nghiệp</h2>
            <p className={styles.emptyText}>
              Tài khoản của bạn đã được xác nhận là doanh nghiệp. Bạn có thể truy cập vào các tính năng dành cho doanh nghiệp.
            </p>
            <div className={styles.buttonGroup} style={{ marginTop: '1.5rem' }}>
              <button
                onClick={() => navigate('/company/dashboard')}
                className={styles.primaryButton}
                aria-label="Vào trang quản lý"
              >
                <span>Vào trang quản lý</span>
              </button>
              <button
                onClick={() => navigate('/')}
                className={styles.secondaryButton}
                aria-label="Về trang chủ"
              >
                <Home size={16} strokeWidth={2} />
                <span>Về trang chủ</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Nếu user không phải role COMPANY: chỉ cho phép nếu có registration_intent = 'business' (cho phép vào trang upload để hoàn tất KYC), nếu không hiển thị message yêu cầu đăng ký/đăng nhập bằng tài khoản Company
  if (user && user.role !== 'COMPANY') {
    const intent = (typeof window !== 'undefined') ? localStorage.getItem('registration_intent') : null;
    if (intent === 'business') {
      // Continue to render form
    } else {
    return (
      <div className={styles.emptyContainer}>
        <div className={styles.backgroundBlobs}>
          <div className={styles.blob1} />
          <div className={styles.blob2} />
          <div className={styles.blob3} />
        </div>
        <div className={styles.emptyCard}>
          <div className={styles.emptyCardContent}>
            <div className={styles.emptyIconWrapper} style={{ background: 'linear-gradient(to bottom right, #fff4ec, #f0f5ff)' }}>
              <Shield className={styles.emptyIcon} />
            </div>
            <h2 className={styles.emptyTitle}>{t('auth.loginRequired.title')}</h2>
            <p className={styles.emptyText}>Vui lòng đăng ký/đăng nhập bằng tài khoản Company để tiếp tục.</p>
            <div className={styles.buttonGroup} style={{ marginTop: '1.5rem' }}>
              <button
                onClick={() => navigate('/register')}
                className={styles.primaryButton}
                aria-label="Đăng ký tài khoản Company"
              >
                <span>Đăng ký tài khoản Company</span>
              </button>
              <button
                onClick={() => navigate('/login')}
                className={styles.secondaryButton}
                aria-label="Đăng nhập"
              >
                <span>Đăng nhập</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
    }
  }

  // Nếu đã nộp hồ sơ trước đó: hiển thị lại các mục với dấu tick và tên file đã submit, hiển thị nút điều hướng đến pending-page
  if (alreadySubmitted) {
    return (
      <div className={styles.container}>
        <div className={styles.backgroundBlobs}>
          <div className={styles.blob1} />
          <div className={styles.blob2} />
          <div className={styles.blob3} />
        </div>
        <div className={styles.contentWrapper}>
          <div className={styles.submittedCard}>
            <div className={styles.cardContent}>
              <div className={styles.header}>
                <h2 className={styles.title}>{t('company.submittedTitle')}</h2>
                <p className={styles.subtitle}>{t('company.submittedSubtitle')}</p>
              </div>

              <div className={styles.form} style={{ gap: '1rem' }}>
                <div className={styles.submittedItem}>
                  <label className={styles.formLabel}>
                    <FileText className={styles.labelIcon} />
                    {t('company.form.businessLicense')}
                  </label>
                  <span className={styles.submittedBadge}>
                    <CheckCircle2 className={styles.submittedBadgeIcon} />
                    {submittedData.businessLicenseName || t('company.submit')}
                  </span>
                </div>

                <div className={styles.submittedItem}>
                  <label className={styles.formLabel}>
                    <Image className={styles.labelIcon} />
                    {t('company.form.idFront')}
                  </label>
                  <span className={styles.submittedBadge}>
                    <CheckCircle2 className={styles.submittedBadgeIcon} />
                    {submittedData.idCardFrontName || t('company.submit')}
                  </span>
                </div>

                <div className={styles.submittedItem}>
                  <label className={styles.formLabel}>
                    <Image className={styles.labelIcon} />
                    {t('company.form.idBack')}
                  </label>
                  <span className={styles.submittedBadge}>
                    <CheckCircle2 className={styles.submittedBadgeIcon} />
                    {submittedData.idCardBackName || t('company.submit')}
                  </span>
                </div>
              </div>

              <div className={styles.submittedInfoBox}>
                <p className={styles.submittedInfoText}>{t('company.submittedSubtitle')}</p>
              </div>
              <div className={styles.buttonGroup}>
                <button
                  onClick={() => navigate('/pending-page')}
                  className={styles.primaryButton}
                  aria-label={t('company.submittedViewPending')}
                >
                  <Clock size={16} strokeWidth={2} />
                  <span>{t('company.submittedViewPending')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.backgroundBlobs}>
        <div className={styles.blob1} />
        <div className={styles.blob2} />
        <div className={styles.blob3} />
      </div>
      <div className={styles.contentWrapper}>
        <div className={styles.card}>
          <div className={styles.cardContent}>
            <div className={styles.header}>
              <h2 className={styles.title}>{t('company.heading')}</h2>
              <p className={styles.subtitle}>{t('company.subtitle')}</p>
            </div>

            {success && (
              <div className={`${styles.alert} ${styles.alertSuccess}`}>
                <CheckCircle2 className={styles.icon} style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
                {success}
              </div>
            )}

            {error && (
              <div className={`${styles.alert} ${styles.alertError}`}>
                <AlertTriangle className={styles.icon} style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGroup}>
                <label htmlFor="businessLicense" className={styles.formLabel}>
                  <FileText className={styles.labelIcon} />
                  {t('company.form.businessLicense')}
                </label>
                <input
                  type="file"
                  id="businessLicense"
                  accept=".pdf"
                  onChange={(e) => handleFileChange(e, 'businessLicense')}
                  className={styles.fileInput}
                />
                {files.businessLicense && !fileErrors.businessLicense && (
                  <p className={styles.fileSelected}>
                    <CheckCircle2 className={styles.fileSelectedIcon} />
                    {t('company.selectedPrefix')} {files.businessLicense.name}
                  </p>
                )}
                {fileErrors.businessLicense && (
                  <p className={styles.fileError}>
                    <AlertTriangle className={styles.fileErrorIcon} />
                    {fileErrors.businessLicense}
                  </p>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="idCardFront" className={styles.formLabel}>
                  <Image className={styles.labelIcon} />
                  {t('company.form.idFront')}
                </label>
                <input
                  type="file"
                  id="idCardFront"
                  accept=".jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange(e, 'idCardFront')}
                  className={styles.fileInput}
                  key={`idCardFront-${fileErrors.idCardFront ? 'error' : files.idCardFront?.name || 'default'}`}
                />
                {files.idCardFront && !fileErrors.idCardFront && (
                  <p className={styles.fileSelected}>
                    <CheckCircle2 className={styles.fileSelectedIcon} />
                    {t('company.selectedPrefix')} {files.idCardFront.name}
                  </p>
                )}
                {fileErrors.idCardFront && (
                  <div className={styles.fileError}>
                    <AlertTriangle className={styles.fileErrorIcon} />
                    <div className={styles.fileErrorMessage}>
                      {fileErrors.idCardFront.split('\n').map((line, idx) => (
                        <div key={idx}>{line}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="idCardBack" className={styles.formLabel}>
                  <Image className={styles.labelIcon} />
                  {t('company.form.idBack')}
                </label>
                <input
                  type="file"
                  id="idCardBack"
                  accept=".jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange(e, 'idCardBack')}
                  className={styles.fileInput}
                  key={`idCardBack-${fileErrors.idCardBack ? 'error' : files.idCardBack?.name || 'default'}`}
                />
                {files.idCardBack && !fileErrors.idCardBack && (
                  <p className={styles.fileSelected}>
                    <CheckCircle2 className={styles.fileSelectedIcon} />
                    {t('company.selectedPrefix')} {files.idCardBack.name}
                  </p>
                )}
                {fileErrors.idCardBack && (
                  <div className={styles.fileError}>
                    <AlertTriangle className={styles.fileErrorIcon} />
                    <div className={styles.fileErrorMessage}>
                      {fileErrors.idCardBack.split('\n').map((line, idx) => (
                        <div key={idx}>{line}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.infoBox}>
                <h3 className={styles.infoTitle}>
                  <Info className={styles.icon} style={{ width: '0.875rem', height: '0.875rem', display: 'inline', marginRight: '0.25rem', verticalAlign: 'middle' }} />
                  {t('company.important.title')}
                </h3>
                <ul className={styles.infoList}>
                  <li>{t('company.important.i1')}</li>
                  <li>{t('company.important.i2')}</li>
                  <li>{t('company.important.i3')}</li>
                  <li>{t('company.important.i4')}</li>
                  <li>{t('company.important.i5')}</li>
                  <li>{t('company.important.i6')}</li>
                </ul>
              </div>

              <div className={styles.buttonGroup}>
                <button
                  type="submit"
                  disabled={loading}
                  className={styles.primaryButton}
                  aria-label={loading ? t('company.submitting') : t('company.submit')}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} />
                      <span>{t('company.submitting')}</span>
                    </>
                  ) : (
                    <>
                      <FileUp size={16} strokeWidth={2} />
                      <span>{t('company.submit')}</span>
                    </>
                  )}
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