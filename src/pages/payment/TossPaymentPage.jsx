import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import TossWidgetContainer from '../../components/payment/TossWidgetContainer';
import { useToast } from '../../contexts/ToastContext';

const TossPaymentPage = () => {
  const { bookingId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { showError, showInfo } = useToast();

  const orderResponse = location?.state?.orderResponse || null;
  const backUrl = location?.state?.backUrl || `/booking/${bookingId}/payment`;

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
      showError('Thiếu dữ liệu khởi tạo cổng thanh toán. Vui lòng khởi tạo lại.');
      navigate(backUrl, { replace: true });
    }
  }, [canRender, navigate, backUrl, showError]);

  const handleClose = () => {
    navigate(backUrl || '/', { replace: true });
  };

  const handleError = (error) => {
    const message =
      error?.message || 'Đã xảy ra lỗi khi khởi tạo cổng thanh toán Toss.';
    showError(message);
  };

  const handleReady = () => {
    showInfo('Cổng thanh toán Toss đã sẵn sàng. Vui lòng hoàn tất giao dịch trong cửa sổ này.');
  };

  if (!canRender) {
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-4">
        <button
          type="button"
          onClick={handleClose}
          className="text-sm font-medium text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          ← Quay lại
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-gray-900 mb-4">Thanh toán qua Toss</h1>
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
  );
};

export default TossPaymentPage;


