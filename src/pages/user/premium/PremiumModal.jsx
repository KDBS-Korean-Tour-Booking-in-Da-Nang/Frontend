import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../../../config/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import styles from './PremiumModal.module.css';

const PremiumModal = ({ isOpen, onClose }) => {
  const [premiumStatus, setPremiumStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('1month');
  const { user, getToken } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n?.language || 'vi';


  const premiumPlans = [
    {
      id: '1month',
      name: t('premium.plans.1month'),
      price: t('premium.price', { amount: '100,000' }),
      priceValue: 100000,
      duration: 1
    },
    {
      id: '3months',
      name: t('premium.plans.3months'),
      price: t('premium.price', { amount: '250,000' }),
      priceValue: 250000,
      duration: 3
    }
  ];

  // Fetch premium status when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchPremiumStatus();
    }
  }, [isOpen]);

  const fetchPremiumStatus = async () => {
    try {
      setLoading(true);
      const token = getToken();
      
      if (!token) {
        console.error('No token available for premium status check');
        return;
      }

      const response = await fetch(API_ENDPOINTS.PREMIUM_STATUS, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Backend trả về format: { message: "...", result: { isPremium: true/false, expirationDate: "..." } }
        setPremiumStatus(data.result);
      } else {
        console.error('Failed to fetch premium status:', response.status);
      }
    } catch (error) {
      console.error('Error fetching premium status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    try {
      setLoading(true);
      const selectedPlanData = premiumPlans.find(plan => plan.id === selectedPlan);
      
      const token = getToken();
      
      
      if (!token) {
        throw new Error(t('premium.errors.noToken'));
      }

      if (!user?.email) {
        throw new Error(t('premium.errors.noEmail'));
      }

      // Tạo JSON request body theo đúng format backend mong đợi
      const requestBody = {
        durationInMonths: selectedPlanData.duration,
        userEmail: user.email
      };


      const response = await fetch(API_ENDPOINTS.PREMIUM_PAYMENT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });


      if (response.ok) {
        const data = await response.json();
        
        // Check if we have the required data - try different field names
        const payUrl = data.payUrl || data.pay_url || data.paymentUrl || data.payment_url;
        if (!payUrl) {
          console.error('Missing payUrl in response:', data);
          throw new Error(t('premium.errors.missingPayUrl'));
        }
        
        // Navigate to payment page with premium data
        navigate('/payment/vnpay', { 
          state: { 
            premiumData: {
              orderId: data.orderId || data.order_id,
              amount: selectedPlanData.priceValue,
              planName: selectedPlanData.name,
              duration: selectedPlanData.duration,
              type: 'premium',
              payUrl: payUrl,
              orderInfo: data.orderInfo || data.order_info
            }
          } 
        });
        onClose();
      } else {
        const errorText = await response.text();
        console.error('Premium payment failed:', response.status, errorText);
        throw new Error(`Premium payment failed: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error('Error initiating premium payment:', error);
      alert(`${t('premium.errors.error')}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return t('premium.na');
    const date = new Date(dateString);
    const locale = currentLanguage === 'ko' ? 'ko-KR' : currentLanguage === 'en' ? 'en-US' : 'vi-VN';
    return date.toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };


  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>{t('common.processing')}</p>
          </div>
        ) : premiumStatus?.isPremium ? (
          // Modal 2: User đã có premium
          <div className={styles.premiumActiveModal}>
            <h2 className={styles.title}>{t('premium.title')}</h2>
            <div className={styles.statusContent}>
              <p className={styles.statusText}>
                <em>
                  {premiumStatus?.expirationDate || 
                   premiumStatus?.validUntil || 
                   premiumStatus?.expiresAt || 
                   premiumStatus?.endDate ||
                   premiumStatus?.validUntilDate
                    ? `${t('premium.validUntil')}: ${formatDate(
                        premiumStatus?.expirationDate || 
                        premiumStatus?.validUntil || 
                        premiumStatus?.expiresAt || 
                        premiumStatus?.endDate ||
                        premiumStatus?.validUntilDate
                      )}`
                    : t('premium.activeNoExpiry')
                  }
                </em>
              </p>
            </div>
            <button 
              className={styles.closeButton}
              onClick={onClose}
            >
              {t('common.close')}
            </button>
          </div>
        ) : (
          // Modal 1: User chưa có premium
          <div className={styles.premiumPurchaseModal}>
            <h2 className={styles.title}>{t('premium.subscriptionTitle')}</h2>
            <div className={styles.plansContainer}>
              {premiumPlans.map((plan) => (
                <div 
                  key={plan.id}
                  className={`${styles.planCard} ${selectedPlan === plan.id ? styles.selected : ''}`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  <div className={styles.planName}>{plan.name}</div>
                  <div className={styles.planPrice}>{plan.price}</div>
                </div>
              ))}
            </div>
            <button 
              className={styles.purchaseButton}
              onClick={handlePurchase}
              disabled={loading}
            >
              {t('premium.purchase')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PremiumModal;
