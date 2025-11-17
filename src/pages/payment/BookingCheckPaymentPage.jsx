import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getBookingById, getBookingTotal, getGuestsByBookingId } from '../../services/bookingAPI';
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
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('id');
  const location = useLocation();
  const navState = location?.state || {};
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showError, showSuccess, showInfo } = useToast();
  const { t } = useTranslation();

  const [booking, setBooking] = useState(null);
  const [guests, setGuests] = useState([]);
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
  const guestsLoadedRef = useRef(false);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [showBackToWizardModal, setShowBackToWizardModal] = useState(false);

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
          text: t('payment.checkPayment.toast.missingBookingId'),
        });
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        // Reset guestsLoadedRef khi load booking mới
        guestsLoadedRef.current = false;
        
        // Load booking, tổng tiền và guests song song
        const [bookingRes, totalRes, guestsRes] = await Promise.allSettled([
          getBookingById(bookingId),
          getBookingTotal(bookingId),
          getGuestsByBookingId(bookingId),
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
                ? t('payment.checkPayment.toast.sessionExpired')
                : t('payment.checkPayment.toast.cannotLoadBooking'),
          });
          showError(
            msg && msg.toLowerCase().includes('unauthenticated')
              ? t('payment.checkPayment.toast.loginToViewBooking')
              : t('payment.checkPayment.toast.cannotLoadBookingSupport')
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

        // Xử lý guests: ưu tiên từ guestsRes API endpoint, fallback từ bookingRes
        let finalGuests = [];
        
        if (guestsRes.status === 'fulfilled' && guestsRes.value) {
          // API endpoint trả về List<BookingGuestResponse> trực tiếp
          const guestsData = Array.isArray(guestsRes.value) 
            ? guestsRes.value 
            : (guestsRes.value?.result || guestsRes.value?.guests || guestsRes.value?.data || []);
          
          if (Array.isArray(guestsData)) {
            finalGuests = guestsData;
            guestsLoadedRef.current = true;
          }
        }
        
        // Nếu guests API không có data hoặc failed, thử từ booking response
        if (finalGuests.length === 0 && bookingRes.status === 'fulfilled' && bookingRes.value?.guests) {
          const bookingGuests = Array.isArray(bookingRes.value.guests) 
            ? bookingRes.value.guests 
            : [];
          if (bookingGuests.length > 0) {
            finalGuests = bookingGuests;
            guestsLoadedRef.current = true;
          }
        }
        
        setGuests(finalGuests);

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
          showError(t('payment.checkPayment.toast.loginToViewBooking'));
          navigate('/login');
          return;
        }
        setStatusBanner({
          type: 'error',
          text: t('payment.checkPayment.toast.cannotLoadBooking'),
        });
        showError(t('payment.checkPayment.toast.cannotLoadBookingSupport'));
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
  }, [bookingId, showError, user?.email, navigate, navState?.booking]); // Removed booking and originalTotal to avoid infinite loop

  // Load lại guests riêng nếu chưa có (fallback) - chỉ chạy sau khi booking đã load
  useEffect(() => {
    if (!bookingId || !booking || guestsLoadedRef.current) return;

    let isActive = true;

    const loadGuests = async () => {
      // Kiểm tra lại xem guests đã được load chưa
      if (guestsLoadedRef.current || guests.length > 0) {
        return;
      }

      try {
        const guestsData = await getGuestsByBookingId(bookingId);
        
        if (!isActive || guestsLoadedRef.current) return;

        if (Array.isArray(guestsData) && guestsData.length > 0) {
          setGuests(guestsData);
          guestsLoadedRef.current = true;
        }
      } catch (error) {
        // Silently fail - guests will remain empty
        if (!isActive) return;
      }
    };

    // Delay một chút để đảm bảo booking đã được set
    const timer = setTimeout(() => {
      loadGuests();
    }, 200);

    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [bookingId, booking, guests.length]);

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
      showError(t('payment.checkPayment.toast.missingBookingIdError'));
      return;
    }

    // Validate email
    const emailValidation = validateEmail(userEmail);
    if (!emailValidation.isValid) {
      showError(emailValidation.error || t('payment.checkPayment.toast.invalidEmail'));
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
      navigate(`/booking/payment/checkout?id=${bookingId}`, {
        state: {
          orderResponse: response,
          backUrl: `/booking/payment?id=${bookingId}`,
        },
        replace: false,
      });
      showSuccess(t('payment.checkPayment.toast.tossPaymentSuccess'));
      setStatusBanner({
        type: 'info',
        text: t('payment.checkPayment.statusBanner.tossRedirectInfo'),
      });
    } catch (error) {
      // Xử lý lỗi khi tạo payment
      const message =
        error?.message || t('payment.checkPayment.toast.tossPaymentError');
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
      showError(t('payment.checkPayment.toast.voucherCodeRequired'));
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
        showError(t('payment.checkPayment.toast.voucherInvalid'));
        return;
      }

      // Tính toán giá sau khi áp dụng voucher
      const original = Number(matched.originalTotal ?? originalTotal ?? 0);
      const discount = Number(matched.discountAmount ?? 0);
      const final = Number(matched.finalTotal ?? Math.max(original - discount, 0));

      if (!Number.isFinite(original) || original <= 0) {
        throw new Error(t('payment.checkPayment.toast.voucherCalculationError'));
      }

      // Cập nhật state với giá đã áp dụng voucher
      setOriginalTotal(original);
      setDiscountAmount(discount);
      setTotalAmount(final);
      setVoucherApplied(discount > 0);
      setVoucherCode(matched.code);

      // Hiển thị thông báo thành công
      if (discount > 0) {
        showSuccess(t('payment.checkPayment.toast.voucherAppliedSuccess', { amount: formatCurrency(discount) }));
      } else {
        showSuccess(t('payment.checkPayment.toast.voucherAppliedNoDiscount'));
      }
    } catch (err) {
      // Xử lý lỗi khi áp dụng voucher
      setVoucherApplied(false);
      setDiscountAmount(0);
      if (originalTotal != null) {
        setTotalAmount(originalTotal);
      }
      showError(err?.message || t('payment.checkPayment.toast.voucherApplyError'));
    }
  };

  // Xử lý chọn voucher từ danh sách
  const handleSelectVoucherFromList = (voucher) => {
    if (!voucher?.code) return;
    setVoucherCode(voucher.code);
    handleApplyVoucher(voucher.code);
    setIsVoucherModalOpen(false);
  };

  // Xử lý mở modal xác nhận quay lại wizard
  const handleBackToWizardClick = () => {
    setShowBackToWizardModal(true);
  };

  // Xử lý xác nhận quay lại wizard để điền lại thông tin
  const handleBackToWizardConfirm = () => {
    if (!booking?.tourId) {
      showError(t('payment.checkPayment.toast.backToWizardMissingTour'));
      setShowBackToWizardModal(false);
      return;
    }

    const tourId = booking.tourId;

    try {
      // Clear tất cả dữ liệu booking cũ trong localStorage
      // để đảm bảo khi quay lại wizard, người dùng sẽ điền lại từ đầu
      localStorage.removeItem(`bookingData_${tourId}`);
      localStorage.removeItem(`hasConfirmedLeave_${tourId}`);
      localStorage.removeItem(`existingBookingId_${tourId}`);
      
      // Navigate về wizard với step 1
      navigate(`/tour/booking?id=${tourId}`, {
        state: {
          step: 1,
          returnFromPayment: true,
          clearExistingData: true
        }
      });
      
      setShowBackToWizardModal(false);
      showInfo(t('payment.checkPayment.toast.backToWizardSuccess'));
    } catch (error) {
      // Error navigating back to wizard
      showError(t('payment.checkPayment.toast.backToWizardError'));
      setShowBackToWizardModal(false);
    }
  };

  // Xử lý hủy modal
  const handleBackToWizardCancel = () => {
    setShowBackToWizardModal(false);
  };

  // Helper function để format ngày
  const formatDisplayDate = (dateString) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateString;
    }
  };

  // Helper function để format gender
  const formatGenderDisplay = (gender) => {
    if (!gender) return '—';
    const genderStr = String(gender).toLowerCase();
    if (genderStr === 'male' || genderStr === 'nam') return t('payment.male');
    if (genderStr === 'female' || genderStr === 'nu' || genderStr === 'nữ') return t('payment.female');
    if (genderStr === 'other' || genderStr === 'khac' || genderStr === 'khác') return t('payment.other');
    return gender;
  };

  // Helper function để format guest type
  const formatGuestType = (type) => {
    if (!type) return '—';
    const typeStr = String(type).toUpperCase();
    if (typeStr === 'ADULT') return t('payment.adult');
    if (typeStr === 'CHILD') return t('payment.child');
    if (typeStr === 'BABY' || typeStr === 'INFANT') return t('payment.baby');
    return type;
  };

  return (
    <>
      <div className="min-h-screen bg-white">
        {/* Background với màu trắng */}
        <div className="bg-white py-8">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            {/* Nút quay lại với icon */}
            <button
              type="button"
              onClick={handleBackToWizardClick}
              className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#1a8eea] transition hover:text-[#1670c4] focus:outline-none focus:ring-2 focus:ring-[#1a8eea] focus:ring-offset-2 rounded-md px-2 py-1"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span>{t('payment.checkPayment.actions.backToWizard')}</span>
            </button>

            {/* Container chính với shadow */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-lg">
              {/* Header với background nhẹ */}
              <div className="border-b border-gray-200 bg-[#D4E8FF] px-8 py-6 rounded-t-2xl">
                <div className="flex items-center gap-3 mb-2">
                  <svg className="h-6 w-6 text-[#1a8eea]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Thanh toán đơn đặt tour
                  </h1>
                </div>
                <p className="text-sm text-gray-700 ml-9">
                  Vui lòng kiểm tra kỹ thông tin trước khi bấm thanh toán. Cổng Toss sẽ mở trong cửa sổ này.
                </p>
              </div>

              <div className="px-8 py-8">
                {/* Hiển thị status banner */}
                {statusBanner && (
                  <div
                    role="status"
                    className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
                      statusBanner.type === 'error'
                        ? 'border-red-200 bg-red-50 text-red-800'
                        : statusBanner.type === 'warning'
                        ? 'border-yellow-200 bg-yellow-50 text-yellow-800'
                        : 'border-[#1a8eea] bg-[#D4E8FF] text-gray-900'
                    }`}
                  >
                    {statusBanner.text}
                  </div>
                )}

                {/* Loading state */}
                {isLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="flex flex-col items-center gap-4">
                      <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-[#1a8eea]" />
                      <span className="text-gray-600 font-medium">{t('payment.checkPayment.loadingBooking')}</span>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-10">
                    {/* Section: Thông tin booking */}
                    <section aria-labelledby="booking-summary" className="space-y-5">
                      <div className="flex items-center gap-2 mb-4">
                        <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h2 id="booking-summary" className="text-xl font-bold text-gray-900">
                          {t('payment.checkPayment.bookingInfo')}
                        </h2>
                      </div>

                      {/* Hiển thị thông tin booking */}
                      {booking ? (
                        <div className="grid gap-6 md:grid-cols-2">
                          {/* Container 1: Thông tin booking cơ bản */}
                          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                            <div className="border-b border-gray-200 bg-[#D4E8FF] px-6 py-4 rounded-t-xl">
                              <h3 className="text-base font-bold text-gray-900">{t('payment.checkPayment.bookingSummary.tourBookingInfo')}</h3>
                            </div>
                            <div className="px-6 py-5 space-y-4">
                              <div className="space-y-3">
                                <div className="flex items-start justify-between py-2 border-b border-gray-100">
                                  <span className="text-sm font-semibold text-gray-600 min-w-[140px]">{t('payment.checkPayment.bookingSummary.tourName')}</span>
                                  <span className="text-sm font-semibold text-gray-900 text-right flex-1">{booking.tourName || '—'}</span>
                                </div>
                                <div className="flex items-start justify-between py-2 border-b border-gray-100">
                                  <span className="text-sm font-semibold text-gray-600 min-w-[140px]">{t('payment.checkPayment.bookingSummary.departureDate')}</span>
                                  <span className="text-sm font-semibold text-gray-900 text-right flex-1">{booking.departureDate ? formatDisplayDate(booking.departureDate) : '—'}</span>
                                </div>
                                <div className="flex items-start justify-between py-2">
                                  <span className="text-sm font-semibold text-gray-600 min-w-[140px]">{t('payment.checkPayment.bookingSummary.contactEmail')}</span>
                                  <span className="text-sm font-semibold text-gray-900 text-right flex-1 break-words">{booking.contactEmail || booking.userEmail || '—'}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Container 2: Booking details với guests */}
                          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                            <div className="border-b border-gray-200 bg-[#D4E8FF] px-6 py-4 rounded-t-xl">
                              <div className="flex items-center gap-2">
                                <svg className="h-5 w-5 text-[#1a8eea]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <h3 className="text-base font-bold text-gray-900">{t('payment.checkPayment.guestsInfo.title', { count: guests?.length || 0 })}</h3>
                              </div>
                            </div>
                            <div className="px-6 py-5">
                              {guests && guests.length > 0 ? (
                                <div className="space-y-3">
                                  {guests.map((guest, index) => (
                                    <div key={guest.bookingGuestId || index} className="flex items-start justify-between py-2 border-b border-gray-100 last:border-b-0">
                                      <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#1a8eea] text-white text-xs font-bold flex-shrink-0">
                                          {index + 1}
                                        </span>
                                        <span className="text-sm font-semibold text-gray-900 flex-1 min-w-0 truncate">{guest.fullName || '—'}</span>
                                      </div>
                                      <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-[#D4E8FF] text-[#1a8eea] text-xs font-semibold">
                                          {formatGuestType(guest.bookingGuestType)}
                                        </span>
                                        <span className="text-sm font-semibold text-gray-900 min-w-[60px] text-right">
                                          {formatGenderDisplay(guest.gender)}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-8">
                                  <svg className="h-12 w-12 text-gray-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                  </svg>
                                  <p className="text-sm text-gray-500">{t('payment.checkPayment.guestsInfo.noGuests')}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center">
                          <p className="text-sm text-gray-600">
                            {t('payment.checkPayment.noBookingFound')}
                          </p>
                        </div>
                      )}
                    </section>

                    {/* Section: Thông tin thanh toán */}
                    <section aria-labelledby="payment-form" className="space-y-6">
                      <div className="flex items-center gap-2 mb-4">
                        <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <h2 id="payment-form" className="text-xl font-bold text-gray-900">
                          {t('payment.checkPayment.paymentInfo')}
                        </h2>
                      </div>

                      {/* Form input: Email và Voucher code */}
                      <div className="grid gap-6 md:grid-cols-1">
                        {/* Input email - hidden */}
                        <div className="hidden">
                          <label htmlFor="userEmail" className="text-sm font-semibold text-gray-700 mb-2 block">
                            Email người thanh toán
                          </label>
                          <input
                            id="userEmail"
                            type="email"
                            required
                            value={userEmail}
                            onChange={handleEmailChange}
                            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-[#1a8eea] focus:outline-none focus:ring-2 focus:ring-[#1a8eea]"
                            aria-describedby="userEmail-hint"
                          />
                        </div>

                        {/* Input voucher code */}
                        <div className="flex flex-col gap-3">
                          <label htmlFor="voucherCode" className="text-sm font-semibold text-gray-700">
                            {t('payment.checkPayment.voucherCode')}
                          </label>
                          <div className="flex items-stretch gap-3">
                            <div className="flex-1 relative">
                              <input
                                id="voucherCode"
                                type="text"
                                value={voucherCode}
                                onChange={handleVoucherChange}
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-[#1a8eea] focus:outline-none focus:ring-2 focus:ring-[#1a8eea]"
                                placeholder={t('payment.checkPayment.voucherPlaceholder')}
                                aria-describedby="voucherCode-hint"
                              />
                            </div>
                            {voucherApplied && voucherCode ? (
                              <div className="relative inline-flex items-center rounded-lg border-2 border-[#1a8eea] bg-[#D4E8FF] px-4 py-3 pr-10 text-sm font-semibold text-gray-900">
                                <svg className="h-5 w-5 mr-2 text-[#1a8eea] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="flex-1">{voucherCode}</span>
                                <button
                                  type="button"
                                  onClick={handleClearVoucher}
                                  className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gray-400 hover:bg-gray-500 text-white text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-gray-400"
                                  aria-label={t('payment.checkPayment.removeVoucherLabel')}
                                >
                                  ×
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setIsVoucherModalOpen(true)}
                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent bg-[#1a8eea] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1670c4] focus:outline-none focus:ring-2 focus:ring-[#1a8eea] focus:ring-offset-2 whitespace-nowrap"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                {t('payment.checkPayment.applyVoucher')}
                              </button>
                            )}
                          </div>
                          <p id="voucherCode-hint" className="text-xs text-gray-500">
                            {t('payment.checkPayment.voucherHint')}
                          </p>
                        </div>
                      </div>

                      {/* Hiển thị tổng tiền và giảm giá */}
                      <div className="rounded-xl border-2 border-[#1a8eea] bg-[#D4E8FF] px-6 py-5">
                        <div className="flex items-center gap-2 mb-4">
                          <svg className="h-5 w-5 text-[#1a8eea]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-base font-bold text-gray-900">
                            {voucherApplied ? t('payment.checkPayment.totalPayment') : t('payment.checkPayment.totalAmount')}
                          </p>
                        </div>
                        <div className="space-y-2">
                          {/* Giá gốc */}
                          {Number.isFinite(Number(originalTotal)) && originalTotal > 0 && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">{t('payment.checkPayment.originalPrice')}</span>
                              <span className={voucherApplied ? 'line-through text-gray-500' : 'font-semibold text-gray-900'}>
                                {formatCurrency(originalTotal)}
                              </span>
                            </div>
                          )}
                          {/* Giảm giá từ voucher */}
                          {voucherApplied && Number(discountAmount) > 0 && (
                            <div className="flex items-center justify-between text-sm font-semibold text-gray-900">
                              <span className="flex items-center gap-1">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                                {t('payment.checkPayment.discount')}
                              </span>
                              <span className="text-[#1a8eea]">-{formatCurrency(discountAmount)}</span>
                            </div>
                          )}
                          {/* Tổng sau giảm */}
                          <div className="flex items-center justify-between pt-3 mt-3 border-t-2 border-[#1a8eea]">
                            <span className="text-lg font-bold text-gray-900">
                              {voucherApplied ? t('payment.checkPayment.finalAmount') : t('payment.checkPayment.tempAmount')}
                            </span>
                            <span className="text-2xl font-bold text-[#1a8eea]">
                              {formatCurrency(totalAmount)}
                            </span>
                          </div>
                        </div>
                        {/* Thông báo trạng thái voucher */}
                        {voucherApplied && Number(discountAmount) > 0 && (
                          <div className="mt-4 flex items-center gap-2 text-sm text-gray-700">
                            <svg className="h-5 w-5 text-[#1a8eea]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="font-medium">{t('payment.checkPayment.voucherAppliedMessage', { amount: formatCurrency(totalAmount) })}</span>
                          </div>
                        )}
                        {!voucherApplied && (
                          <p className="mt-4 text-xs text-gray-700">
                            {originalTotal
                              ? t('payment.checkPayment.voucherHintMessage')
                              : t('payment.checkPayment.noTotalAmountMessage')}
                          </p>
                        )}
                      </div>
                    </section>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end pt-6 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => navigate('/user/booking-history')}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a8eea] focus:ring-offset-2"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {t('payment.checkPayment.actions.viewHistory')}
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting || !booking}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent bg-[#1a8eea] px-8 py-3 text-base font-bold text-white shadow-lg transition hover:bg-[#1670c4] focus:outline-none focus:ring-2 focus:ring-[#1a8eea] focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:hover:bg-gray-400"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            <span>{t('payment.checkPayment.actions.processing')}</span>
                          </>
                        ) : (
                          <>
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                            <span>{t('payment.checkPayment.actions.pay')}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal chọn voucher */}
      {isVoucherModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsVoucherModalOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-50 w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-200 bg-[#D4E8FF] px-6 py-5">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">{t('payment.checkPayment.voucherModal.title')}</h3>
                <p className="text-sm text-gray-700">{t('payment.checkPayment.voucherModal.subtitle')}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsVoucherModalOpen(false)}
                className="rounded-full p-2 text-gray-600 transition hover:bg-white hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1a8eea]"
                aria-label={t('payment.checkPayment.voucherModal.close')}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto px-6 py-5">
              {isLoadingVouchers ? (
                <div className="flex flex-col items-center justify-center gap-4 py-16">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#1a8eea]" />
                  <span className="text-gray-600 font-medium">{t('payment.checkPayment.voucherModal.loading')}</span>
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
                        onClick={() => handleSelectVoucherFromList(v)}
                        className={`cursor-pointer rounded-xl border-2 px-5 py-4 transition ${
                          isSelected
                            ? "border-[#1a8eea] bg-[#D4E8FF]"
                            : "border-gray-200 bg-white hover:border-[#1a8eea] hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <svg className="h-5 w-5 text-[#1a8eea]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                              </svg>
                              <p className="text-base font-bold text-gray-900">{v.code}</p>
                              {isSelected && (
                                <svg className="h-5 w-5 text-[#1a8eea]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 ml-7">
                              {discountBadge ? t('payment.checkPayment.voucherModal.discountLabel', { discount: discountBadge.replace(/^-/, "") }) : t('payment.checkPayment.voucherModal.available')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {isSelected && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleClearVoucher();
                                  setIsVoucherModalOpen(false);
                                }}
                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400"
                              >
                                {t('payment.checkPayment.voucherModal.removeSelected')}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectVoucherFromList(v);
                              }}
                              className={`inline-flex items-center justify-center gap-2 rounded-lg border border-transparent px-4 py-2 text-sm font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                isSelected
                                  ? "bg-gray-500 hover:bg-gray-600 focus:ring-gray-500"
                                  : "bg-[#1a8eea] hover:bg-[#1670c4] focus:ring-[#1a8eea]"
                              }`}
                            >
                              {isSelected ? t('payment.checkPayment.voucherApplied') : t('payment.checkPayment.voucherModal.apply')}
                            </button>
                          </div>
                        </div>
                        {Number(v.discountAmount) > 0 && (
                          <div className="mt-3 ml-7 inline-flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-[#1a8eea] border border-[#1a8eea]">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                            {t('payment.checkPayment.voucherModal.savings', { amount: formatCurrency(v.discountAmount) })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
                  <svg className="h-12 w-12 text-gray-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <p className="text-sm font-medium text-gray-600">{t('payment.checkPayment.voucherModal.noVouchers')}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setIsVoucherModalOpen(false)}
                className="rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#1a8eea] focus:ring-offset-2"
              >
                {t('payment.checkPayment.voucherModal.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal xác nhận quay lại wizard */}
      {showBackToWizardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleBackToWizardCancel}
            aria-hidden="true"
          />
          <div className="relative z-50 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-gray-200 bg-[#D4E8FF] px-6 py-5">
              <div className="flex items-center gap-2 mb-2">
                <svg className="h-6 w-6 text-[#1a8eea]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <h3 className="text-xl font-bold text-gray-900">
                  {t('payment.checkPayment.backToWizardModal.title')}
                </h3>
              </div>
            </div>
            <div className="px-6 py-6">
              <p className="text-sm text-gray-700 mb-6">
                {t('payment.checkPayment.backToWizardModal.message')}
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleBackToWizardCancel}
                  className="rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#1a8eea] focus:ring-offset-2"
                >
                  {t('payment.checkPayment.backToWizardModal.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleBackToWizardConfirm}
                  className="rounded-lg border border-transparent bg-[#1a8eea] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#1670c4] focus:outline-none focus:ring-2 focus:ring-[#1a8eea] focus:ring-offset-2"
                >
                  {t('payment.checkPayment.backToWizardModal.confirm')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BookingCheckPaymentPage;
