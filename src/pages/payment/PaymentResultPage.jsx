import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

function sanitize(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/[<>]/g, '').trim();
}

function formatCurrencyVND(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  try {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
    }).format(n);
  } catch {
    return n.toLocaleString('vi-VN');
  }
}

export default function PaymentResultPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const orderId = sanitize(searchParams.get('orderId') || '');
  const paymentMethod = sanitize(searchParams.get('paymentMethod') || 'TOSS');
  const statusRaw = sanitize(searchParams.get('status') || '');
  const status = statusRaw.toUpperCase();
  const amountRaw = sanitize(searchParams.get('amount') || '');

  const hasParams = Boolean(orderId) && Boolean(status) && Boolean(amountRaw);
  const isSuccess = status === 'SUCCESS';
  const isFailed = status === 'FAILED';

  const bannerClasses = isSuccess
    ? 'border-green-200 bg-green-50 text-green-900'
    : isFailed
    ? 'border-red-200 bg-red-50 text-red-900'
    : 'border-blue-200 bg-blue-50 text-blue-900';

  const title = isSuccess
    ? 'Thanh toán thành công'
    : isFailed
    ? 'Thanh toán không thành công'
    : 'Trạng thái giao dịch';

  const subtitle = isSuccess
    ? 'Cảm ơn bạn. Chúng tôi đã ghi nhận giao dịch và sẽ tiếp tục xử lý đơn đặt tour.'
    : isFailed
    ? 'Giao dịch thất bại hoặc đã bị huỷ. Bạn có thể thử lại hoặc liên hệ hỗ trợ.'
    : 'Chúng tôi đã nhận phản hồi từ hệ thống. Vui lòng kiểm tra chi tiết bên dưới.';

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-6">
          <h1 className="text-2xl font-semibold text-gray-900">Kết quả thanh toán</h1>
          <p className="mt-1 text-sm text-gray-600">
            Đây là trang kết quả do hệ thống chuyển hướng sau khi xử lý thanh toán.
          </p>
        </div>

        <div className="px-6 py-8">
          <div className={`rounded-xl border px-5 py-4 ${bannerClasses}`}>
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-6">{subtitle}</p>
          </div>

          {!hasParams && (
            <div
              role="alert"
              className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              <p>
                Thiếu tham số giao dịch trong đường dẫn. Vui lòng kiểm tra lại email xác nhận hoặc
                liên hệ bộ phận hỗ trợ để được trợ giúp.
              </p>
            </div>
          )}

          {hasParams && (
            <dl className="mt-8 grid gap-5 sm:grid-cols-2">
              <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                <dt className="text-xs uppercase tracking-wide text-gray-500">Mã đơn hàng</dt>
                <dd className="mt-1 break-all text-sm font-medium text-gray-900">{orderId}</dd>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                <dt className="text-xs uppercase tracking-wide text-gray-500">Trạng thái</dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900">{status}</dd>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                <dt className="text-xs uppercase tracking-wide text-gray-500">Phương thức</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">{paymentMethod}</dd>
              </div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                <dt className="text-xs uppercase tracking-wide text-gray-500">Số tiền</dt>
                <dd className="mt-1 text-sm font-semibold text-gray-900">
                  {formatCurrencyVND(amountRaw)}
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
        </div>
      </div>
    </div>
  );
}

