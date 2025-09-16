import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './pendingPage.css';

const PendingPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    // Lấy email từ localStorage
    const email = localStorage.getItem('userEmail');
    if (email) {
      setUserEmail(email);
    } else {
      // Nếu không có email, chuyển về trang đăng ký
      navigate('/register');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('userEmail');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="px-6 py-8">
            <div className="text-center">
              {/* Icon pending */}
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-secondary mb-6">
                <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <h1 className="text-3xl font-bold text-gray-900 mb-4">{t('pending.title')}</h1>
              
              <p className="text-lg text-gray-600 mb-6">{t('pending.submitted')}</p>

              <div className="bg-secondary border border-primary rounded-lg p-6 mb-8">
                <h2 className="text-xl font-semibold text-primary mb-4">{t('pending.infoTitle')}</h2>
                <div className="text-left space-y-2">
                  <p className="text-primary"><span className="font-medium">{t('pending.email')}:</span> {userEmail}</p>
                  <p className="text-primary">
                    <span className="font-medium">{t('pending.status')}:</span> 
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-primary">
                      {t('pending.statusPending')}
                    </span>
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('pending.processTitle')}</h3>
                <div className="space-y-3 text-left">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-gray-700">{t('pending.step1')}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-gray-700">{t('pending.step2')}</span>
                  </div>
                  <div className="flex items-center opacity-50">
                    <div className="flex-shrink-0 w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-gray-500">{t('pending.step3')}</span>
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-500 mb-8">
                <p>{t('pending.note1')}</p>
                <p>{t('pending.note2')}</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => navigate('/')}
                  className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
                >
                  {t('pending.btnHome')}
                </button>
                <button
                  onClick={handleLogout}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {t('pending.btnLogout')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingPage;
