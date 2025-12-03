import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CreditCard, ShieldCheck, ArrowLeft } from 'lucide-react';
import TossWidgetContainer from '../../../components/payment/TossWidgetContainer';
import { useToast } from '../../../contexts/ToastContext';
import styles from './TossPaymentPage.module.css';

const TossPaymentPage = () => {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('id');
  const location = useLocation();
  const navigate = useNavigate();
  const { showInfo } = useToast();
  const { t } = useTranslation();
  const [error, setError] = useState('');
  const [showBackConfirm, setShowBackConfirm] = useState(false);

  const orderResponse = location?.state?.orderResponse || null;
  const backUrl = location?.state?.backUrl || `/booking/payment?id=${bookingId}`;

  const canRender = useMemo(() => {
    if (!orderResponse) return false;
    const required = [
      'clientKey',
      'customerKey',
      'amount',
      'orderId',
      'successUrl',
      'failUrl',
    ];
    return required.every((k) => Boolean(orderResponse?.[k]));
  }, [orderResponse]);

  useEffect(() => {
    if (!canRender) {
      setError(t('payment.tossPayment.toast.missingData') || 'Thiếu dữ liệu thanh toán');
      navigate(backUrl, { replace: true });
    }
  }, [canRender, navigate, backUrl]);

  const handleClose = () => {
    navigate(backUrl || '/', { replace: true });
  };

  const handleBackClick = () => {
    setShowBackConfirm(true);
  };

  const handleCancelBack = () => {
    setShowBackConfirm(false);
  };

  const handleConfirmBack = () => {
    // Hủy thanh toán và chuyển đến trang lịch sử booking
    navigate('/user/booking-history', { replace: true });
  };

  const handleError = (error) => {
    const message =
      error?.message || t('payment.tossPayment.toast.error') || 'Có lỗi xảy ra';
    setError(message);
  };

  const handleReady = () => {
    showInfo(t('payment.tossPayment.toast.ready'));
  };

  if (!canRender) {
    return null;
  }

  return (
    <div className={styles.shell}>
      {error && (
        <div style={{ position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)', padding: '0.75rem 1.5rem', backgroundColor: '#fef2f2', color: '#e11d48', borderRadius: '0.5rem', fontSize: '0.875rem', zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          {error}
        </div>
      )}
      <div className={styles.cardWrapper}>
        {showBackConfirm && (
          <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/40">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">
                {t('payment.tossPayment.backConfirmTitle', {
                  defaultValue: 'Bạn có chắc muốn quay lại?',
                })}
              </h2>
              <p className="mb-5 text-sm text-gray-600">
                {t('payment.tossPayment.backConfirmMessage', {
                  defaultValue:
                    'Nếu bạn quay lại bây giờ, quá trình thanh toán hiện tại sẽ bị hủy. Bạn sẽ được chuyển đến lịch sử đặt tour.',
                })}
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCancelBack}
                  className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  {t('common.cancel', { defaultValue: 'Hủy' })}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBack}
                  className="rounded-full bg-[#1a8eea] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1670c4]"
                >
                  {t('payment.tossPayment.backConfirmOk', {
                    defaultValue: 'Xác nhận quay lại',
                  })}
                </button>
              </div>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={handleBackClick}
          className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-4 py-2 text-xs font-semibold text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:text-[#1670c4]"
        >
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#EAF3FF] text-[#1a8eea]">
            <ArrowLeft className="h-3.5 w-3.5" />
          </span>
          {t('payment.tossPayment.back', { defaultValue: 'Quay lại' })}
        </button>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className="flex flex-col gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/70 px-3 py-1.5 text-xs font-semibold text-gray-600 w-fit">
                <CreditCard className="h-4 w-4 text-[#1a8eea]" />
                {t('payment.tossPayment.title')}
              </div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {t('payment.tossPayment.subtitle')}
              </h1>
              <div className="flex flex-col gap-2 rounded-[18px] border border-white/70 bg-white/70 px-4 py-3 text-xs text-gray-600 shadow-inner sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <ShieldCheck className="h-4 w-4 text-[#1a8eea]" />
                  {t('payment.tossPayment.security', { defaultValue: 'Kết nối bảo mật chuẩn PCI-DSS từ Toss' })}
                </div>
                <p className="text-xs text-gray-500">
                  {t('payment.tossPayment.tip', { defaultValue: 'Giữ cửa sổ này mở đến khi thanh toán hoàn tất.' })}
                </p>
              </div>
            </div>
          </div>
          <div className={styles.cardBody}>
            <div className="rounded-[22px] border border-gray-100 bg-white/95 p-4 shadow-[0_25px_80px_rgba(157,168,199,0.2)]">
              <TossWidgetContainer
                clientKey={orderResponse.clientKey}
                customerKey={orderResponse.customerKey}
                amount={orderResponse.amount}
                orderId={orderResponse.orderId}
                successUrl={orderResponse.successUrl}
                failUrl={orderResponse.failUrl}
                message={orderResponse.message}
                onClose={handleClose}
                onCancel={handleClose}
                onError={handleError}
                onReady={handleReady}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TossPaymentPage;


