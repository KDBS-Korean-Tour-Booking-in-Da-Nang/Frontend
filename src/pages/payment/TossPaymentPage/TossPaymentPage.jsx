import { useEffect, useMemo } from 'react';
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
  const { showError, showInfo } = useToast();
  const { t } = useTranslation();

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
      showError(t('payment.tossPayment.toast.missingData'));
      navigate(backUrl, { replace: true });
    }
  }, [canRender, navigate, backUrl, showError]);

  const handleClose = () => {
    navigate(backUrl || '/', { replace: true });
  };

  const handleError = (error) => {
    const message =
      error?.message || t('payment.tossPayment.toast.error');
    showError(message);
  };

  const handleReady = () => {
    showInfo(t('payment.tossPayment.toast.ready'));
  };

  if (!canRender) {
    return null;
  }

  return (
    <div className={styles.shell}>
      <div className={styles.cardWrapper}>
        <button
          type="button"
          onClick={handleClose}
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


