import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';

const sanitizeParam = (value) => {
  if (!value) return '';
  return value.replace(/[<>]/g, '').trim();
};

const formatAmount = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  try {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
    }).format(numeric);
  } catch (error) {
    console.error('[Payment] Failed to format amount', error);
    return numeric.toLocaleString('vi-VN');
  }
};

const PaymentResultPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { showError, showInfo, showSuccess } = useToast();

  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const params = useMemo(() => {
    const orderId = sanitizeParam(query.get('orderId'));
    const paymentMethod = sanitizeParam(query.get('paymentMethod'));
    const status = sanitizeParam(query.get('status')).toUpperCase();
    const amount = sanitizeParam(query.get('amount'));

    return {
      orderId,
      paymentMethod: paymentMethod || 'TOSS',
      status,
      amount,
    };
  }, [query]);

  const hasAllParams =
    Boolean(params.orderId) &&
    Boolean(params.status) &&
    params.status.length > 0 &&
    Boolean(params.amount);

  const isSuccess = params.status === 'SUCCESS';
  const isFailed = params.status === 'FAILED';

  useEffect(() => {
    if (!hasAllParams) {
      showError(
        'Thiếu thông tin giao dịch từ hệ thống. Vui lòng liên hệ bộ phận hỗ trợ hoặc kiểm tra lại email xác nhận.'
      );
    } else if (isSuccess) {
      showSuccess('Thanh toán Toss đã hoàn tất thành công.');
    } else {
      showInfo('Giao dịch Toss đã phản hồi. Vui lòng kiểm tra trạng thái hiển thị bên dưới.');
    }
  }, [hasAllParams, isSuccess, showError, showInfo, showSuccess]);

  const heading = isSuccess
    ? 'Thanh toán thành công'
    : isFailed
    ? 'Thanh toán không thành công'
    : 'Trạng thái giao dịch';

  const description = isSuccess
    ? 'Cảm ơn bạn đã hoàn tất giao dịch. Chúng tôi sẽ xử lý đơn đặt tour và gửi thông báo khi tour được xác nhận.'
    : isFailed
    ? 'Giao dịch không thành công hoặc đã bị huỷ. Vui lòng thử thanh toán lại hoặc liên hệ hỗ trợ để được giúp đỡ.'
    : 'Chúng tôi đã nhận được phản hồi từ Toss. Vui lòng kiểm tra chi tiết giao dịch bên dưới.';

  const statusClasses = isSuccess
    ? 'border-green-200 bg-green-50 text-green-900'
    : isFailed
    ? 'border-red-200 bg-red-50 text-red-900'
    : 'border-blue-200 bg-blue-50 text-blue-900';

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-6">
          <h1 className="text-2xl font-semibold text-gray-900">
            Kết quả thanh toán Toss
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Đây là trang kết quả do hệ thống trả về sau khi xử lý giao dịch cùng Toss Payments.
          </p>
        </div>

        <div className="px-6 py-8">
          <div className={`rounded-xl border px-5 py-4 ${statusClasses}`}>
            <h2 className="text-xl font-semibold">{heading}</h2>
            <p className="mt-2 text-sm leading-6">{description}</p>
          </div>

          {!hasAllParams && (
            <div
              role="alert"
              className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              <p>
                Không tìm thấy đầy đủ thông tin giao dịch trong đường dẫn. Vui lòng kiểm tra lại
                email xác nhận từ hệ thống hoặc liên hệ bộ phận hỗ trợ qua hotline/tổng đài.
              </p>
            </div>
          )}

          {hasAllParams && (
            <dl className="mt-8 grid gap-5 sm:grid-cols-2">
              <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                <dt className="text-xs uppercase tracking-wide text-gray-500">Mã đơn hàng</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900 break-all">
                  {params.orderId}
                </dd>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                <dt className="text-xs uppercase tracking-wide text-gray-500">Trạng thái</dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900">{params.status}</dd>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                <dt className="text-xs uppercase tracking-wide text-gray-500">Phương thức</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">{params.paymentMethod}</dd>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                <dt className="text-xs uppercase tracking-wide text-gray-500">Số tiền thanh toán</dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900">
                  {formatAmount(params.amount)}
                </dd>
              </div>
            </dl>
          )}

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => navigate('/user/booking-history')}
              className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Xem lịch sử booking
            </button>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Về trang chủ
              </button>
              <a
                href="mailto:support@kdbs.com"
                className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Liên hệ hỗ trợ
              </a>
            </div>
          </div>

          <div className="mt-8 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-xs text-yellow-900">
            <p className="font-semibold">Ghi chú:</p>
            <ul className="mt-1 list-disc pl-5 space-y-1">
              <li>Nếu trạng thái là SUCCESS, không cần thực hiện thêm bước nào.</li>
              <li>Nếu trạng thái FAILED, bạn có thể quay lại trang thanh toán để thử lại.</li>
              <li>
                Trong trường hợp nghi ngờ hoặc có câu hỏi, hãy liên hệ đội ngũ hỗ trợ để được kiểm
                tra chi tiết giao dịch.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentResultPage;

