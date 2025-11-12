import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Modal from '../../components/modals/Modal';
import TossWidgetContainer from '../../components/payment/TossWidgetContainer';
import { getBookingById, getBookingTotal } from '../../services/bookingAPI';
import { createTossBookingPayment } from '../../services/paymentService';
import { getAvailableVouchersForBooking } from '../../services/voucherAPI';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { validateEmail } from '../../utils/emailValidator';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const formatCurrency = (value) => {
  if (!Number.isFinite(Number(value))) return '—';
  try {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
    }).format(Number(value));
  } catch (error) {
    return Number(value).toLocaleString('vi-VN');
  }
};

const BookingCheckPaymentPage = () => {
  const { bookingId } = useParams();
  const location = useLocation();
  const navState = location?.state || {};
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showError, showSuccess, showInfo } = useToast();

  const [booking, setBooking] = useState(null);
  const [totalAmount, setTotalAmount] = useState(null);
  const [originalTotal, setOriginalTotal] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [voucherApplied, setVoucherApplied] = useState(false);
  const [userEmail, setUserEmail] = useState(user?.email || '');
  const [voucherCode, setVoucherCode] = useState('');
  const [availableVouchers, setAvailableVouchers] = useState([]);
  const [isLoadingVouchers, setIsLoadingVouchers] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderResponse, setOrderResponse] = useState(null);
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const [statusBanner, setStatusBanner] = useState(null);
  const lastLoadedBookingIdRef = useRef(null);
  const loadAvailableVouchersRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    if (navState?.booking && !booking) {
      setBooking(navState.booking);
    }

    const computeFromBookingSnapshot = async (b) => {
      try {
        if (!b?.tourId) return;
        const tourResp = await fetch(`${API_BASE_URL}/api/tour/${b.tourId}`);
        if (!tourResp.ok) return;
        const tour = await tourResp.json();
        const adults = Number(b.adultsCount || 0);
        const children = Number(b.childrenCount || 0);
        const babies = Number(b.babiesCount || 0);
        const adultPrice = Number(tour.adultPrice || 0);
        const childrenPrice = Number(tour.childrenPrice || 0);
        const babyPrice = Number(tour.babyPrice || 0);
        const computed = adults * adultPrice + children * childrenPrice + babies * babyPrice;
        const safeComputed = Number.isFinite(computed) ? computed : null;
        setOriginalTotal(safeComputed);
        setTotalAmount(safeComputed);
        setDiscountAmount(0);
        setVoucherApplied(false);
      } catch (_) {}
    };

    if (navState?.booking && originalTotal == null) {
      computeFromBookingSnapshot(navState.booking);
    }

    const loadBooking = async () => {
      if (lastLoadedBookingIdRef.current === bookingId) {
        setIsLoading(false);
        return;
      }
      lastLoadedBookingIdRef.current = bookingId;

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

        if (totalRes.status === 'fulfilled' && Number(totalRes.value?.totalAmount) > 0) {
          const base = Number(totalRes.value.totalAmount);
          setOriginalTotal(base);
          setTotalAmount(base);
          setDiscountAmount(0);
          setVoucherApplied(false);
        } else {
          try {
            const b = bookingRes.value;
            if (b?.tourId) {
              const tourResp = await fetch(`${API_BASE_URL}/api/tour/${b.tourId}`);
              if (tourResp.ok) {
                const tour = await tourResp.json();
                const adults = Number(b.adultsCount || 0);
                const children = Number(b.childrenCount || 0);
                const babies = Number(b.babiesCount || 0);
                const adultPrice = Number(tour.adultPrice || 0);
                const childrenPrice = Number(tour.childrenPrice || 0);
                const babyPrice = Number(tour.babyPrice || 0);
                const computed =
                  adults * adultPrice + children * childrenPrice + babies * babyPrice;
                const safeComputed = Number.isFinite(computed) ? computed : null;
                setOriginalTotal(safeComputed);
                setTotalAmount(safeComputed);
                setDiscountAmount(0);
                setVoucherApplied(false);
              } else {
                setOriginalTotal(null);
                setTotalAmount(null);
              }
            } else {
              setOriginalTotal(null);
              setTotalAmount(null);
            }
          } catch (e) {
            setOriginalTotal(null);
            setTotalAmount(null);
          }
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
  }, [bookingId, showError, user?.email, navigate, navState?.booking, booking, originalTotal]);

  useEffect(() => {
    let isActive = true;

    const loadAvailableVouchers = async (showLoading = true) => {
      if (!bookingId) {
        return [];
      }

      if (showLoading) {
        setIsLoadingVouchers(true);
      }

      try {
        const vouchers = await getAvailableVouchersForBooking(bookingId);

        if (!isActive) {
          return [];
        }

        if (!Array.isArray(vouchers)) {
          setAvailableVouchers([]);
          return [];
        }

        const normalized = vouchers.map((v) => ({
          id: v.voucherId,
          voucherId: v.voucherId,
          code: v.voucherCode || v.code || '',
          discountAmount: v.discountAmount ? Number(v.discountAmount) : 0,
          finalTotal: v.finalTotal ? Number(v.finalTotal) : null,
          originalTotal: v.originalTotal ? Number(v.originalTotal) : null,
          discountLabel: v.discountAmount ? `-${formatCurrency(v.discountAmount)}` : '',
        }));

        const filtered = normalized.filter((v) => Boolean(v.code));

        setAvailableVouchers(filtered);
        return filtered;
      } catch (err) {
        if (!isActive) {
          return [];
        }
        setAvailableVouchers([]);
        return [];
      } finally {
        if (showLoading && isActive) {
          setIsLoadingVouchers(false);
        }
      }
    };

    loadAvailableVouchersRef.current = loadAvailableVouchers;

    if (bookingId) {
      const timer = setTimeout(() => {
        loadAvailableVouchers();
      }, 100);

      return () => {
        isActive = false;
        clearTimeout(timer);
      };
    }

    return () => {
      isActive = false;
    };
  }, [bookingId, booking]);

  const handleVoucherChange = (event) => {
    setVoucherCode(event.target.value);
    // Reset applied state when user edits the code
    setVoucherApplied(false);
    setDiscountAmount(0);
    if (originalTotal != null) {
      setTotalAmount(originalTotal);
    }
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
      navigate(`/booking/${bookingId}/payment/checkout`, {
        state: {
          orderResponse: response,
          backUrl: location.pathname,
        },
        replace: false,
      });
      showSuccess('Khởi tạo đơn thanh toán Toss thành công. Đang chuyển tới cổng thanh toán...');
      setStatusBanner({
        type: 'info',
        text: 'Đang chuyển tới cổng thanh toán Toss. Vui lòng hoàn tất giao dịch để hoàn tất đặt tour.',
      });
    } catch (error) {
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

  const handleApplyVoucher = async (codeOverride) => {
    const codeToApply = (codeOverride ?? voucherCode)?.trim();
    if (!bookingId || !codeToApply) {
      showError('Vui lòng nhập mã voucher để áp dụng.');
      return;
    }

    try {
      const normalizedCode = codeToApply.toUpperCase().trim();
      let vouchers = availableVouchers;
      
      let matched = vouchers.find((v) => v.code?.toUpperCase().trim() === normalizedCode);
      
      if (!matched && loadAvailableVouchersRef.current) {
        const refreshed = await loadAvailableVouchersRef.current(false);
        vouchers = refreshed;
        matched = refreshed.find((v) => v.code?.toUpperCase().trim() === normalizedCode);
      }

      if (!matched) {
        setVoucherApplied(false);
        setDiscountAmount(0);
        if (originalTotal != null) {
          setTotalAmount(originalTotal);
        }
        showError('Voucher không hợp lệ hoặc không áp dụng được cho booking này. Vui lòng chọn voucher từ danh sách hoặc kiểm tra lại mã voucher.');
        return;
      }

      const original = Number(matched.originalTotal ?? originalTotal ?? 0);
      const discount = Number(matched.discountAmount ?? 0);
      const final = Number(matched.finalTotal ?? Math.max(original - discount, 0));

      if (!Number.isFinite(original) || original <= 0) {
        throw new Error('Không thể tính toán giá gốc từ voucher.');
      }

      setOriginalTotal(original);
      setDiscountAmount(discount);
      setTotalAmount(final);
      setVoucherApplied(discount > 0);
      setVoucherCode(matched.code);

      if (discount > 0) {
        showSuccess(`Đã áp dụng voucher. Giảm ${formatCurrency(discount)}. Voucher sẽ được lưu khi thanh toán.`);
      } else {
        showSuccess('Voucher đã được áp dụng. Voucher sẽ được lưu khi thanh toán.');
      }
    } catch (err) {
      setVoucherApplied(false);
      setDiscountAmount(0);
      if (originalTotal != null) {
        setTotalAmount(originalTotal);
      }
      showError(err?.message || 'Không thể áp dụng voucher. Vui lòng kiểm tra lại mã voucher.');
    }
  };

  const handleSelectVoucherFromList = (voucher) => {
    if (!voucher?.code) return;
    setVoucherCode(voucher.code);
    handleApplyVoucher(voucher.code);
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
                  <p className="font-semibold">
                    {voucherApplied ? 'Tổng tiền thanh toán' : 'Tổng tiền tạm tính'}
                  </p>
                  <div className="mt-1 space-y-1">
                    {Number.isFinite(Number(originalTotal)) && originalTotal > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span>Giá gốc</span>
                        <span className={voucherApplied ? 'line-through text-gray-600' : ''}>
                          {formatCurrency(originalTotal)}
                        </span>
                      </div>
                    )}
                    {voucherApplied && Number(discountAmount) > 0 && (
                      <div className="flex items-center justify-between text-xs text-green-700 font-medium">
                        <span>Giảm giá (voucher)</span>
                        <span>-{formatCurrency(discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-base font-bold mt-2 pt-2 border-t border-blue-200">
                      <span>
                        {voucherApplied ? 'Tổng sau giảm' : 'Tạm tính'}
                      </span>
                      <span className="text-lg">
                        {formatCurrency(totalAmount)}
                      </span>
                    </div>
                  </div>
                  {voucherApplied && Number(discountAmount) > 0 && (
                    <p className="mt-2 text-xs text-green-700 font-medium">
                      ✓ Voucher đã được áp dụng. Bạn sẽ thanh toán {formatCurrency(totalAmount)}.
                    </p>
                  )}
                  {!voucherApplied && (
                    <p className="mt-1 text-xs text-blue-700">
                      {originalTotal
                        ? 'Áp dụng voucher để được giảm giá. Khoản thanh toán cuối cùng sẽ được hiển thị sau khi áp dụng voucher.'
                        : 'Số tiền thực tế có thể thay đổi sau khi áp dụng voucher. Khoản thanh toán cuối cùng sẽ được hiển thị sau khi khởi tạo Toss.'}
                    </p>
                  )}
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
                      Nhập mã voucher và bấm "Áp dụng voucher" để xem chi tiết giảm giá. Voucher sẽ được lưu vào database khi bấm "Thanh toán".
                    </p>
                    <div>
                      <button
                        type="button"
                        onClick={handleApplyVoucher}
                        className="mt-2 inline-flex items-center justify-center rounded-md border border-transparent bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                      >
                        Áp dụng voucher
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">Voucher của công ty</p>
                    {isLoadingVouchers && (
                      <span className="text-xs text-gray-500">Đang tải...</span>
                    )}
                  </div>
                  {isLoadingVouchers ? (
                    <div className="mt-3 flex items-center justify-center py-4">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-500" />
                      <span className="ml-2 text-xs text-gray-500">Đang tải voucher...</span>
                    </div>
                  ) : availableVouchers?.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-gray-600">
                        Chọn một voucher để áp dụng ngay:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {availableVouchers.map((v) => (
                          <button
                            key={v.id || v.voucherId || v.code}
                            type="button"
                            onClick={() => handleSelectVoucherFromList(v)}
                            className="inline-flex items-center gap-2 rounded-lg border-2 border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 transition hover:border-emerald-400 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                            title={`Mã: ${v.code} - Giảm ${formatCurrency(v.discountAmount)}`}
                          >
                            <span className="font-semibold">{v.code}</span>
                            {v.discountAmount > 0 && (
                              <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-xs font-bold text-emerald-900">
                                -{formatCurrency(v.discountAmount)}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-gray-600">
                      Hiện chưa có voucher khả dụng từ công ty này.
                    </p>
                  )}
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

      {/* Widget now shown on a dedicated page. Modal removed as per requirements. */}
    </div>
  );
};

export default BookingCheckPaymentPage;
