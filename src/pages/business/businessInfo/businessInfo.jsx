import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './businessInfo.css';

const BusinessInfo = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userEmail, setUserEmail] = useState('');

  const [files, setFiles] = useState({
    businessLicense: null,
    idCardFront: null,
    idCardBack: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // Kiểm tra 2 trường hợp:
    // 1. Từ đăng ký: lấy email từ localStorage
    // 2. Từ navbar: lấy email từ user đã đăng nhập trong localStorage
    let email = localStorage.getItem('userEmail');
    
    if (!email) {
      // Nếu không có email trong localStorage, thử lấy từ user đã đăng nhập
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        email = user.email;
      }
    }
    
    if (email) {
      setUserEmail(email);
    } else {
      // Nếu không có email, chuyển về trang đăng ký
      navigate('/register');
    }
  }, [navigate]);

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
      const savedUser = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      
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

  if (!userEmail) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Không tìm thấy thông tin đăng ký
          </h2>
          <button
            onClick={() => navigate('/register')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Quay lại đăng ký
          </button>
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
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Thông tin doanh nghiệp
              </h2>
              <p className="text-gray-600">
                Vui lòng upload các tài liệu cần thiết để admin có thể duyệt tài khoản doanh nghiệp của bạn.
              </p>
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
                <label htmlFor="businessLicense" className="block text-sm font-medium text-gray-700">
                  Giấy phép kinh doanh (PDF) *
                </label>
                <div className="mt-1">
                  <input
                    type="file"
                    id="businessLicense"
                    accept=".pdf"
                    onChange={(e) => handleFileChange(e, 'businessLicense')}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
                {files.businessLicense && (
                  <p className="mt-2 text-sm text-green-600">
                    ✅ Đã chọn: {files.businessLicense.name}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="idCardFront" className="block text-sm font-medium text-gray-700">
                  Mặt trước CCCD (JPG/PNG) *
                </label>
                <div className="mt-1">
                  <input
                    type="file"
                    id="idCardFront"
                    accept=".jpg,.jpeg,.png"
                    onChange={(e) => handleFileChange(e, 'idCardFront')}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
                {files.idCardFront && (
                  <p className="mt-2 text-sm text-green-600">
                    ✅ Đã chọn: {files.idCardFront.name}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="idCardBack" className="block text-sm font-medium text-gray-700">
                  Mặt sau CCCD (JPG/PNG) *
                </label>
                <div className="mt-1">
                  <input
                    type="file"
                    id="idCardBack"
                    accept=".jpg,.jpeg,.png"
                    onChange={(e) => handleFileChange(e, 'idCardBack')}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
                {files.idCardBack && (
                  <p className="mt-2 text-sm text-green-600">
                    ✅ Đã chọn: {files.idCardBack.name}
                  </p>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-2">Lưu ý quan trọng:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Giấy phép kinh doanh phải là file PDF</li>
                  <li>• CCCD phải rõ ràng, không bị mờ hoặc che khuất</li>
                  <li>• CCCD phải là ảnh thật, không phải ảnh màn hình hoặc scan</li>
                  <li>• Đảm bảo ánh sáng tốt khi chụp CCCD</li>
                  <li>• Mỗi file không được vượt quá 25MB</li>
                  <li>• Thời gian duyệt thường mất từ 1-3 ngày làm việc</li>
                </ul>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Quay lại
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Đang gửi...' : 'Xác nhận và gửi'}
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