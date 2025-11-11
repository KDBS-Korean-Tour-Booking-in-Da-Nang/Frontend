import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Modal from '../../components/modals/Modal';
import TossWidgetContainer from '../../components/payment/TossWidgetContainer';
import { getBookingById, getBookingTotal } from '../../services/bookingAPI';
import { createTossBookingPayment } from '../../services/paymentService';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { validateEmail } from '../../utils/emailValidator';

const formatCurrency = (value) => {
  if (!Number.isFinite(Number(value))) return '—';
  try {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
    }).format(Number(value));
  } catch (error) {
    console.error('[Payment] Currency format failed', error);
    return Number(value).toLocaleString('vi-VN');
  }
};

const BookingCheckPaymentPage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showError, showSuccess, showInfo } = useToast();

  const [booking, setBooking] = useState(null);
  const [totalAmount, setTotalAmount] = useState(null);
  const [userEmail, setUserEmail] = useState(user?.email || '');
  const [voucherCode, setVoucherCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderResponse, setOrderResponse] = useState(null);
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const [statusBanner, setStatusBanner] = useState(null);
  const loadOnceRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const loadBooking = async () => {
      // Prevent duplicate loads (e.g., StrictMode double-invoke)
      if (loadOnceRef.current) return;
      loadOnceRef.current = true;

      if (!bookingId) {
        setStatusBanner({
          type: 'error',
          text: 'Thiếu mã booking trong đường dẫn. Vui lòng quay lại trang đặt tour.',
        });
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const [bookingRes, totalRes] = await Promise.allSettled([
          getBookingById(bookingId),
          getBookingTotal(bookingId),
        ]);

        if (!isMounted) return;

        if (bookingRes.status === 'fulfilled') {
          setBooking(bookingRes.value);
        } else {
          // If booking failed (e.g., 400), surface a clear message and stop
          const msg = String(bookingRes.reason?.message || '');
          setStatusBanner({
            type: 'error',
            text:
              msg && msg.toLowerCase().includes('unauthenticated')
                ? 'Phiên đăng nhập đã hết hạn hoặc thiếu quyền. Vui lòng đăng nhập lại.'
                : 'Không thể tải thông tin booking. Có thể booking không tồn tại hoặc dữ liệu không hợp lệ.',
          });
          showError(
            msg && msg.toLowerCase().includes('unauthenticated')
              ? 'Vui lòng đăng nhập để xem thông tin booking.'
              : 'Không thể tải thông tin booking. Vui lòng kiểm tra lại hoặc liên hệ hỗ trợ.'
          );
          if (msg.toLowerCase().includes('unauthenticated')) {
            navigate('/login');
          }
          return;
        }

        if (totalRes.status === 'fulfilled') {
          setTotalAmount(totalRes.value?.totalAmount ?? null);
        } else {
          // If total fails (e.g., 400), we still proceed without the aggregated total
          setTotalAmount(null);
          console.debug('[Payment] Total amount unavailable:', totalRes.reason?.message);
        }

        const inferredEmail =
          bookingRes.value?.contactEmail ||
          bookingRes.value?.userEmail ||
          user?.email ||
          '';
        setUserEmail(inferredEmail);

        setStatusBanner(null);
      } catch (error) {
        if (!isMounted) return;
        console.error('[Payment] Failed to load booking', error);
        const message = String(error?.message || '');
        if (message.toLowerCase().includes('unauthenticated')) {
          setStatusBanner({
            type: 'error',
            text: 'Phiên đăng nhập đã hết hạn hoặc thiếu quyền. Vui lòng đăng nhập lại.',
          });
          showError('Vui lòng đăng nhập để xem thông tin booking.');
          navigate('/login');
          return;
        }
        // Handle 400 or runtime error generically
        setStatusBanner({
          type: 'error',
          text:
            'Không thể tải thông tin booking. Có thể booking không tồn tại hoặc dữ liệu không hợp lệ.',
        });
        showError(
          'Không thể tải thông tin booking. Vui lòng kiểm tra lại hoặc liên hệ hỗ trợ.'
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadBooking();

    return () => {
      isMounted = false;
    };
  }, [bookingId, showError, user?.email, navigate]);

  const handleVoucherChange = (event) => {
    setVoucherCode(event.target.value);
  };

  const handleEmailChange = (event) => {
    setUserEmail(event.target.value);
  };

  const dismissWidget = () => {
    setIsWidgetOpen(false);
    setOrderResponse(null);
  };

  const handleWidgetClose = () => {
    dismissWidget();
    setStatusBanner({
      type: 'warning',
      text: 'Bạn đã đóng cổng thanh toán. Nếu muốn tiếp tục, vui lòng nhấn "Thanh toán" để tạo lại phiên.',
    });
  };

  const handleWidgetError = (error) => {
    const message =
      error?.message || 'Đã xảy ra lỗi khi khởi tạo cổng thanh toán Toss.';
    showError(message);
    setStatusBanner({
      type: 'error',
      text: message,
    });
  };

  const handleWidgetReady = () => {
    showInfo('Cổng thanh toán Toss đã sẵn sàng. Vui lòng hoàn tất giao dịch trong cửa sổ này.');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!bookingId) {
      showError('Không xác định được mã booking.');
      return;
    }

    const emailValidation = validateEmail(userEmail);
    if (!emailValidation.isValid) {
      showError(emailValidation.error || 'Email không hợp lệ.');
      return;
    }

    setIsSubmitting(true);
    setStatusBanner(null);

    try {
      const response = await createTossBookingPayment({
        bookingId,
        userEmail,
        voucherCode,
      });

      if (!response?.success) {
        throw new Error(response?.message || 'Không thể tạo đơn thanh toán Toss.');
      }

      setOrderResponse(response);
      setIsWidgetOpen(true);
      showSuccess('Khởi tạo đơn thanh toán Toss thành công.');
      setStatusBanner({
        type: 'info',
        text: 'Đang mở cổng thanh toán Toss. Vui lòng hoàn tất giao dịch để hoàn tất đặt tour.',
      });
    } catch (error) {
      console.error('[Payment] Failed to create Toss payment', error);
      const message =
        error?.message || 'Không thể khởi tạo thanh toán. Vui lòng thử lại.';
      setStatusBanner({
        type: 'error',
        text: message,
      });
      showError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const bookingSummary = useMemo(() => {
    if (!booking) return null;
    return [
      { label: 'Mã booking', value: booking.bookingId },
      { label: 'Tên tour', value: booking.tourName },
      { label: 'Ngày khởi hành', value: booking.departureDate },
      { label: 'Số khách', value: booking.totalGuests },
      { label: 'Email liên hệ', value: booking.contactEmail || booking.userEmail },
    ];
  }, [booking]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-6 text-sm font-medium text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        ← Quay lại
      </button>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-5">
          <h1 className="text-xl font-semibold text-gray-900">
            Thanh toán đơn đặt tour
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Vui lòng kiểm tra kỹ thông tin trước khi bấm thanh toán. Cổng Toss sẽ mở
            trong cửa sổ này.
          </p>
        </div>

        <div className="px-6 py-6">
          {statusBanner && (
            <div
              role="status"
              className={`mb-5 rounded-lg border px-4 py-3 text-sm ${
                statusBanner.type === 'error'
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : statusBanner.type === 'warning'
                  ? 'border-yellow-200 bg-yellow-50 text-yellow-800'
                  : 'border-blue-200 bg-blue-50 text-blue-800'
              }`}
            >
              {statusBanner.text}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3 text-gray-500">
                <span className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-500" />
                <span>Đang tải thông tin booking...</span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              <section aria-labelledby="booking-summary" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 id="booking-summary" className="text-lg font-semibold text-gray-900">
                    Thông tin booking
                  </h2>
                  {booking?.bookingStatus && (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      Trạng thái: {booking.bookingStatus}
                    </span>
                  )}
                </div>

                {booking ? (
                  <dl className="grid gap-4 sm:grid-cols-2">
                    {bookingSummary?.map((item) => (
                      <div key={item.label} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                        <dt className="text-xs uppercase tracking-wide text-gray-500">
                          {item.label}
                        </dt>
                        <dd className="mt-1 text-sm font-medium text-gray-900">
                          {item.value || '—'}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="text-sm text-gray-600">
                    Không tìm thấy thông tin booking. Vui lòng kiểm tra lại mã booking.
                  </p>
                )}

                <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                  <p className="font-semibold">Tổng tiền tạm tính:</p>
                  <p className="mt-1 text-lg font-bold">
                    {formatCurrency(totalAmount)}
                  </p>
                  <p className="mt-1 text-xs text-blue-700">
                    Số tiền thực tế có thể thay đổi sau khi áp dụng voucher. Khoản thanh toán cuối
                    cùng sẽ được hiển thị sau khi khởi tạo Toss.
                  </p>
                </div>
              </section>

              <section aria-labelledby="payment-form" className="space-y-6">
                <h2 id="payment-form" className="text-lg font-semibold text-gray-900">
                  Thông tin thanh toán
                </h2>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="userEmail" className="text-sm font-medium text-gray-700">
                      Email người thanh toán
                    </label>
                    <input
                      id="userEmail"
                      type="email"
                      required
                      value={userEmail}
                      onChange={handleEmailChange}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-describedby="userEmail-hint"
                    />
                    <p id="userEmail-hint" className="text-xs text-gray-500">
                      Thông tin xác nhận sẽ được gửi về email này.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label htmlFor="voucherCode" className="text-sm font-medium text-gray-700">
                      Mã voucher (tuỳ chọn)
                    </label>
                    <input
                      id="voucherCode"
                      type="text"
                      value={voucherCode}
                      onChange={handleVoucherChange}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nhập mã voucher nếu có"
                      aria-describedby="voucherCode-hint"
                    />
                    <p id="voucherCode-hint" className="text-xs text-gray-500">
                      Voucher sẽ được kiểm tra và áp dụng khi tạo đơn thanh toán.
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-xs text-yellow-900">
                  <p className="font-semibold">Lưu ý bảo mật:</p>
                  <ul className="mt-1 list-disc pl-5">
                    <li>Không đóng trình duyệt cho tới khi nhận được thông báo kết quả.</li>
                    <li>Không chia sẻ thông tin thẻ/tài khoản trong quá trình thanh toán.</li>
                    <li>Nếu gặp sự cố, liên hệ hỗ trợ để được xử lý kịp thời.</li>
                  </ul>
                </div>
              </section>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => navigate('/user/booking-history')}
                  className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Xem lịch sử booking
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !booking}
                  className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-6 py-2 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  {isSubmitting ? 'Đang khởi tạo...' : 'Thanh toán'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <Modal
        isOpen={isWidgetOpen}
        onClose={handleWidgetClose}
        title="Thanh toán qua Toss"
        size="xl"
      >
        {orderResponse && (
          <TossWidgetContainer
            clientKey={orderResponse.clientKey}
            customerKey={orderResponse.customerKey}
            amount={orderResponse.amount}
            orderId={orderResponse.orderId}
            successUrl={orderResponse.successUrl}
            failUrl={orderResponse.failUrl}
            message={orderResponse.message}
            onClose={handleWidgetClose}
            onCancel={handleWidgetClose}
            onError={handleWidgetError}
            onReady={handleWidgetReady}
          />
        )}
      </Modal>
    </div>
  );
};

export default BookingCheckPaymentPage;

