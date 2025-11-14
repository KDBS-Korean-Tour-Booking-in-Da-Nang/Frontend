import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { getBookingById, getBookingTotal } from '../../services/bookingAPI';
import { createTossBookingPayment } from '../../services/paymentService';
import { getAvailableVouchersForBooking } from '../../services/voucherAPI';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { validateEmail } from '../../utils/emailValidator';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

/**
 * Format số tiền thành định dạng VND (ví dụ: 100000 -> "100.000 ₫")
 */
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

/**
 * Format số phần trăm (ví dụ: 10 -> "10%", 10.5 -> "10.5%")
 */
const formatPercent = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '';

  const rounded = Number.isInteger(num) ? num : Number(num.toFixed(2));
  const text = Number.isInteger(rounded)
    ? String(rounded)
    : String(rounded).replace(/\.?0+$/, '');

  return `${text}%`;
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
  const [statusBanner, setStatusBanner] = useState(null);
  const lastLoadedBookingIdRef = useRef(null);
  const loadAvailableVouchersRef = useRef(null);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);

  // Load booking information và tính toán tổng tiền
  useEffect(() => {
    let isMounted = true;

    // Sử dụng booking từ navigation state nếu có
    if (navState?.booking && !booking) {
      setBooking(navState.booking);
    }

    // Tính toán tổng tiền từ booking snapshot (khi có tourId)
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

    // Tính toán tổng tiền từ booking snapshot nếu chưa có originalTotal
    if (navState?.booking && originalTotal == null) {
      computeFromBookingSnapshot(navState.booking);
    }

    // Load booking và tổng tiền từ API
    const loadBooking = async () => {
      // Tránh load lại nếu bookingId không đổi
      if (lastLoadedBookingIdRef.current === bookingId) {
        setIsLoading(false);
        return;
      }
      lastLoadedBookingIdRef.current = bookingId;

      // Validate bookingId
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
        // Load booking và tổng tiền song song
        const [bookingRes, totalRes] = await Promise.allSettled([
          getBookingById(bookingId),
          getBookingTotal(bookingId),
        ]);

        if (!isMounted) return;

        // Xử lý kết quả load booking
        if (bookingRes.status === 'fulfilled') {
          setBooking(bookingRes.value);
        } else {
          // Xử lý lỗi: unauthenticated hoặc lỗi khác
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

        // Xử lý tổng tiền: ưu tiên từ API, fallback tính từ tour
        if (totalRes.status === 'fulfilled' && Number(totalRes.value?.totalAmount) > 0) {
          const base = Number(totalRes.value.totalAmount);
          setOriginalTotal(base);
          setTotalAmount(base);
          setDiscountAmount(0);
          setVoucherApplied(false);
        } else {
          // Fallback: tính tổng tiền từ tour prices
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

        // Lấy email từ booking hoặc user hiện tại
        const inferredEmail =
          bookingRes.value?.contactEmail ||
          bookingRes.value?.userEmail ||
          user?.email ||
          '';
        setUserEmail(inferredEmail);

        setStatusBanner(null);
      } catch (error) {
        // Xử lý lỗi tổng quát
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

  // Load danh sách voucher khả dụng cho booking
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
        // Load vouchers từ API
        // API này trả về TẤT CẢ voucher khả dụng cho booking, bao gồm:
        // 1. Voucher áp dụng cho toàn bộ tour (không có tour mappings)
        // 2. Voucher chỉ áp dụng cho tour cụ thể (có tour mappings và tour của booking nằm trong danh sách)
        // Backend đã tự động filter và chỉ trả về voucher hợp lệ
        const vouchers = await getAvailableVouchersForBooking(bookingId);

        if (!isActive) {
          return [];
        }

        if (!Array.isArray(vouchers)) {
          setAvailableVouchers([]);
          return [];
        }

        // Normalize và parse dữ liệu voucher từ API
        const normalized = vouchers.map((v) => {
          // Helper: Parse số từ nhiều format khác nhau (string, number, null, undefined)
          const parsePossibleNumber = (value) => {
            if (value === undefined || value === null) return null;
            if (typeof value === 'number') {
              return Number.isFinite(value) ? value : null;
            }
            if (typeof value === 'string') {
              const normalized = value.trim();
              if (normalized === '') return null;
              const digitsOnly = normalized.replace(/[^0-9.,-]/g, '');
              if (digitsOnly === '' || digitsOnly === '-' || digitsOnly === '.' || digitsOnly === '-.')
                return null;
              const adjusted =
                digitsOnly.includes('.') && digitsOnly.includes(',')
                  ? digitsOnly.replace(/,/g, '')
                  : digitsOnly.includes(',')
                  ? digitsOnly.replace(/,/g, '.')
                  : digitsOnly;
              const num = Number(adjusted);
              return Number.isFinite(num) ? num : null;
            }
            const num = Number(value);
            return Number.isFinite(num) ? num : null;
          };

          // Parse discountType từ API (có thể là string, object enum, hoặc null)
          let rawType = '';
          let hasDiscountTypeFromAPI = false;
          
          if (v.discountType !== undefined && v.discountType !== null) {
            if (typeof v.discountType === 'string') {
              rawType = v.discountType.trim().toUpperCase();
              hasDiscountTypeFromAPI = rawType === 'PERCENT' || rawType === 'FIXED';
            } else if (typeof v.discountType === 'object') {
              // Xử lý enum object từ Java (có thể có property name, value, hoặc toString)
              if (v.discountType.name) {
                rawType = String(v.discountType.name).trim().toUpperCase();
              } else if (v.discountType.value) {
                rawType = String(v.discountType.value).trim().toUpperCase();
              } else if (v.discountType.toString) {
                rawType = String(v.discountType.toString()).trim().toUpperCase();
              } else {
                rawType = String(v.discountType).trim().toUpperCase();
              }
              hasDiscountTypeFromAPI = rawType === 'PERCENT' || rawType === 'FIXED';
            } else {
              rawType = String(v.discountType).trim().toUpperCase();
              hasDiscountTypeFromAPI = rawType === 'PERCENT' || rawType === 'FIXED';
            }
          }
          
          // Parse các giá trị số từ API
          const discountAmount = parsePossibleNumber(v.discountAmount) ?? 0;
          const finalTotal = parsePossibleNumber(v.finalTotal);
          let originalTotal = parsePossibleNumber(v.originalTotal);
          // Tính originalTotal từ finalTotal + discountAmount nếu chưa có
          if (originalTotal === null && finalTotal !== null && discountAmount > 0) {
            originalTotal = finalTotal + discountAmount;
          }
          
          let discountValue = parsePossibleNumber(v.discountValue);
          
          // Xác định discountType: ưu tiên từ API, mặc định FIXED nếu không có
          let discountType = null;
          if (hasDiscountTypeFromAPI) {
            discountType = rawType;
          } else {
            discountType = 'FIXED';
          }

          // Đảm bảo discountType hợp lệ (PERCENT hoặc FIXED)
          if (discountType !== 'PERCENT' && discountType !== 'FIXED') {
            discountType = 'FIXED';
          }

          // Tính discountLabel để hiển thị trên UI
          // PERCENT: hiển thị phần trăm (ví dụ: -10%)
          // FIXED: hiển thị số tiền (ví dụ: -100.000₫)
          let discountLabel = '';
          if (discountType === 'PERCENT') {
            if (discountValue !== null && discountValue > 0) {
              discountLabel = `-${formatPercent(discountValue)}`;
            } else if (originalTotal && discountAmount > 0) {
              // Fallback: tính phần trăm từ discountAmount và originalTotal
              const computedPercent = (discountAmount / originalTotal) * 100;
              if (Number.isFinite(computedPercent) && computedPercent > 0) {
                discountValue = Math.round(computedPercent * 100) / 100;
                discountLabel = `-${formatPercent(discountValue)}`;
              }
            } else {
              discountLabel = '-%';
            }
          } else {
            // FIXED: ưu tiên discountAmount, fallback discountValue
            if (discountAmount > 0) {
              discountLabel = `-${formatCurrency(discountAmount)}`;
            } else if (discountValue !== null && discountValue > 0) {
              discountLabel = `-${formatCurrency(discountValue)}`;
            }
          }

          return {
            id: v.voucherId,
            voucherId: v.voucherId,
            code: v.voucherCode || v.code || '',
            discountType,
            discountValue,
            discountAmount,
            finalTotal,
            originalTotal,
            discountLabel,
          };
        });

        // Lọc bỏ các voucher không có code
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

    // Lưu function vào ref để có thể gọi từ nơi khác
    loadAvailableVouchersRef.current = loadAvailableVouchers;

    // Load vouchers khi có bookingId
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

  // Xử lý xóa voucher (clear selection)
  const handleClearVoucher = () => {
    setVoucherCode('');
    setVoucherApplied(false);
    setDiscountAmount(0);
    if (originalTotal != null) {
      setTotalAmount(originalTotal);
    }
  };

  // Xử lý thay đổi voucher code input
  const handleVoucherChange = (event) => {
    const newValue = event.target.value;
    setVoucherCode(newValue);
    
    // Nếu xóa hết code, clear voucher selection
    if (!newValue || newValue.trim() === '') {
      // Clear các state liên quan đến voucher (không cần set voucherCode vì đã set ở trên)
      setVoucherApplied(false);
      setDiscountAmount(0);
      if (originalTotal != null) {
        setTotalAmount(originalTotal);
      }
      return;
    }
    
    // Reset trạng thái khi user thay đổi code (nhưng chưa xóa hết)
    setVoucherApplied(false);
    setDiscountAmount(0);
    if (originalTotal != null) {
      setTotalAmount(originalTotal);
    }
  };

  // Xử lý thay đổi email input
  const handleEmailChange = (event) => {
    setUserEmail(event.target.value);
  };

  // Xử lý submit form thanh toán
  const handleSubmit = async (event) => {
    event.preventDefault();

    // Validate bookingId
    if (!bookingId) {
      showError('Không xác định được mã booking.');
      return;
    }

    // Validate email
    const emailValidation = validateEmail(userEmail);
    if (!emailValidation.isValid) {
      showError(emailValidation.error || 'Email không hợp lệ.');
      return;
    }

    setIsSubmitting(true);
    setStatusBanner(null);

    try {
      // Tạo payment order từ Toss API
      const response = await createTossBookingPayment({
        bookingId,
        userEmail,
        voucherCode,
      });

      if (!response?.success) {
        throw new Error(response?.message || 'Không thể tạo đơn thanh toán Toss.');
      }

      // Navigate đến trang checkout với order response
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
      // Xử lý lỗi khi tạo payment
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

  // Áp dụng voucher từ code
  const handleApplyVoucher = async (codeOverride) => {
    const codeToApply = (codeOverride ?? voucherCode)?.trim();
    if (!bookingId || !codeToApply) {
      showError('Vui lòng nhập mã voucher để áp dụng.');
      return;
    }

    try {
      // Tìm voucher trong danh sách available
      const normalizedCode = codeToApply.toUpperCase().trim();
      let vouchers = availableVouchers;
      
      let matched = vouchers.find((v) => v.code?.toUpperCase().trim() === normalizedCode);
      
      // Nếu không tìm thấy, refresh danh sách voucher và tìm lại
      if (!matched && loadAvailableVouchersRef.current) {
        const refreshed = await loadAvailableVouchersRef.current(false);
        vouchers = refreshed;
        matched = refreshed.find((v) => v.code?.toUpperCase().trim() === normalizedCode);
      }

      // Xử lý khi không tìm thấy voucher
      if (!matched) {
        setVoucherApplied(false);
        setDiscountAmount(0);
        if (originalTotal != null) {
          setTotalAmount(originalTotal);
        }
        showError('Voucher không hợp lệ hoặc không áp dụng được cho booking này. Vui lòng chọn voucher từ danh sách hoặc kiểm tra lại mã voucher.');
        return;
      }

      // Tính toán giá sau khi áp dụng voucher
      const original = Number(matched.originalTotal ?? originalTotal ?? 0);
      const discount = Number(matched.discountAmount ?? 0);
      const final = Number(matched.finalTotal ?? Math.max(original - discount, 0));

      if (!Number.isFinite(original) || original <= 0) {
        throw new Error('Không thể tính toán giá gốc từ voucher.');
      }

      // Cập nhật state với giá đã áp dụng voucher
      setOriginalTotal(original);
      setDiscountAmount(discount);
      setTotalAmount(final);
      setVoucherApplied(discount > 0);
      setVoucherCode(matched.code);

      // Hiển thị thông báo thành công
      if (discount > 0) {
        showSuccess(`Đã áp dụng voucher. Giảm ${formatCurrency(discount)}. Voucher sẽ được lưu khi thanh toán.`);
      } else {
        showSuccess('Voucher đã được áp dụng. Voucher sẽ được lưu khi thanh toán.');
      }
    } catch (err) {
      // Xử lý lỗi khi áp dụng voucher
      setVoucherApplied(false);
      setDiscountAmount(0);
      if (originalTotal != null) {
        setTotalAmount(originalTotal);
      }
      showError(err?.message || 'Không thể áp dụng voucher. Vui lòng kiểm tra lại mã voucher.');
    }
  };

  // Xử lý chọn voucher từ danh sách
  const handleSelectVoucherFromList = (voucher) => {
    if (!voucher?.code) return;
    setVoucherCode(voucher.code);
    handleApplyVoucher(voucher.code);
    setIsVoucherModalOpen(false);
  };

  // Tính toán booking summary để hiển thị
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
    <>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Nút quay lại */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-6 text-sm font-medium text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        ← Quay lại
      </button>

      {/* Container chính */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Header */}
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
          {/* Hiển thị status banner (error, warning, info) */}
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

          {/* Loading state */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3 text-gray-500">
                <span className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-500" />
                <span>Đang tải thông tin booking...</span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Section: Thông tin booking */}
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

                {/* Hiển thị thông tin booking */}
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

                {/* Hiển thị tổng tiền và giảm giá (nếu có voucher) */}
                <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                  <p className="font-semibold">
                    {voucherApplied ? 'Tổng tiền thanh toán' : 'Tổng tiền tạm tính'}
                  </p>
                  <div className="mt-1 space-y-1">
                    {/* Giá gốc */}
                    {Number.isFinite(Number(originalTotal)) && originalTotal > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span>Giá gốc</span>
                        <span className={voucherApplied ? 'line-through text-gray-600' : ''}>
                          {formatCurrency(originalTotal)}
                        </span>
                      </div>
                    )}
                    {/* Giảm giá từ voucher */}
                    {voucherApplied && Number(discountAmount) > 0 && (
                      <div className="flex items-center justify-between text-xs text-green-700 font-medium">
                        <span>Giảm giá (voucher)</span>
                        <span>-{formatCurrency(discountAmount)}</span>
                      </div>
                    )}
                    {/* Tổng sau giảm */}
                    <div className="flex items-center justify-between text-base font-bold mt-2 pt-2 border-t border-blue-200">
                      <span>
                        {voucherApplied ? 'Tổng sau giảm' : 'Tạm tính'}
                      </span>
                      <span className="text-lg">
                        {formatCurrency(totalAmount)}
                      </span>
                    </div>
                  </div>
                  {/* Thông báo trạng thái voucher */}
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

              {/* Section: Thông tin thanh toán */}
              <section aria-labelledby="payment-form" className="space-y-6">
                <h2 id="payment-form" className="text-lg font-semibold text-gray-900">
                  Thông tin thanh toán
                </h2>

                {/* Form input: Email và Voucher code */}
                <div className="grid gap-5 md:grid-cols-2">
                  {/* Input email */}
                  <div className="hidden">
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
                  </div>

                  {/* Input voucher code */}
                  <div className="flex flex-col gap-2">
                    <label htmlFor="voucherCode" className="text-sm font-medium text-gray-700">
                      Mã voucher (tuỳ chọn)
                    </label>
                    <div className="flex items-stretch gap-3">
                      <input
                        id="voucherCode"
                        type="text"
                        value={voucherCode}
                        onChange={handleVoucherChange}
                        className="w-full flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Nhập mã voucher nếu có"
                        aria-describedby="voucherCode-hint"
                      />
                      {voucherApplied && voucherCode ? (
                        <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-400 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900 shadow-sm">
                          <span>{voucherCode}</span>
                          <button
                            type="button"
                            onClick={handleClearVoucher}
                            className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1"
                            aria-label="Bỏ chọn voucher"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsVoucherModalOpen(true)}
                          className="inline-flex items-center justify-center rounded-md border border-transparent bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 whitespace-nowrap"
                        >
                          Áp dụng voucher
                        </button>
                      )}
                    </div>
                    <p id="voucherCode-hint" className="text-xs text-gray-500">
                      Nhập mã voucher và bấm "Áp dụng voucher" để xem chi tiết giảm giá. Voucher sẽ được lưu vào database khi bấm "Thanh toán".
                    </p>
                  </div>
                </div>

                {/* Lưu ý bảo mật */}
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-xs text-yellow-900">
                  <p className="font-semibold">Lưu ý bảo mật:</p>
                  <ul className="mt-1 list-disc pl-5">
                    <li>Không đóng trình duyệt cho tới khi nhận được thông báo kết quả.</li>
                    <li>Không chia sẻ thông tin thẻ/tài khoản trong quá trình thanh toán.</li>
                    <li>Nếu gặp sự cố, liên hệ hỗ trợ để được xử lý kịp thời.</li>
                  </ul>
                </div>
              </section>

              {/* Action buttons */}
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
    </div>

    {isVoucherModalOpen && (
      <div className="fixed inset-0 z-40 flex items-center justify-center px-4 py-6">
        <div
          className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
          onClick={() => setIsVoucherModalOpen(false)}
          aria-hidden="true"
        />
        <div className="relative z-50 w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Chọn voucher để áp dụng</h3>
              <p className="text-sm text-gray-500">Mỗi booking chỉ áp dụng được 1 voucher.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsVoucherModalOpen(false)}
              className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Đóng"
            >
              ×
            </button>
          </div>

          <div className="max-h-[65vh] overflow-y-auto px-6 py-4">
            {isLoadingVouchers ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-gray-500">
                <span className="h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-500" />
                <span>Đang tải voucher...</span>
              </div>
            ) : availableVouchers.length > 0 ? (
              <div className="space-y-3">
                {availableVouchers.map((v) => {
                  const discountBadge = v.discountLabel || "";
                  const isSelected =
                    voucherCode &&
                    v.code &&
                    voucherCode.toUpperCase().trim() === v.code.toUpperCase().trim();
                  return (
                    <div
                      key={v.id || v.voucherId || v.code}
                      className={`rounded-xl border px-4 py-3 transition ${
                        isSelected ? "border-emerald-500 bg-emerald-50" : "border-gray-200 bg-white"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-gray-900">{v.code}</p>
                          <p className="text-xs text-gray-500">
                            {discountBadge ? `Giảm ${discountBadge.replace(/^-/, "")}` : "Voucher khả dụng"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isSelected && (
                            <button
                              type="button"
                              onClick={() => {
                                handleClearVoucher();
                                setIsVoucherModalOpen(false);
                              }}
                              className="inline-flex items-center justify-center rounded-md border border-transparent bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
                            >
                              Bỏ chọn
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleSelectVoucherFromList(v)}
                            className="inline-flex items-center justify-center rounded-md border border-transparent bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2"
                          >
                            {isSelected ? "Đang áp dụng" : "Áp dụng"}
                          </button>
                        </div>
                      </div>
                      {Number(v.discountAmount) > 0 && (
                        <div className="mt-2 rounded-lg bg-emerald-100 px-3 py-2 text-xs text-emerald-800">
                          Tiết kiệm {formatCurrency(v.discountAmount)} so với giá gốc.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                Hiện chưa có voucher khả dụng từ công ty này.
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
            <button
              type="button"
              onClick={() => setIsVoucherModalOpen(false)}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default BookingCheckPaymentPage;
