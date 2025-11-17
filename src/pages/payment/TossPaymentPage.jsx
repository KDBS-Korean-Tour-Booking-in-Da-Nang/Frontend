import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import TossWidgetContainer from '../../components/payment/TossWidgetContainer';
import { useToast } from '../../contexts/ToastContext';

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
    <div className="min-h-screen bg-white">
      <div className="bg-white py-8">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {/* Container chính với shadow */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-lg">
            {/* Header với background nhẹ */}
            <div className="border-b border-gray-200 bg-[#D4E8FF] px-8 py-6 rounded-t-2xl">
              <div className="flex items-center gap-3 mb-2">
                <svg className="h-6 w-6 text-[#1a8eea]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <h1 className="text-2xl font-bold text-gray-900">{t('payment.tossPayment.title')}</h1>
              </div>
              <p className="text-sm text-gray-700 ml-9">
                {t('payment.tossPayment.subtitle')}
              </p>
            </div>

            <div className="px-8 py-8">
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


