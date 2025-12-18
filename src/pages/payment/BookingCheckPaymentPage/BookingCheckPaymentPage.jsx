import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getBookingById, getBookingTotal, getGuestsByBookingId } from '../../../services/bookingAPI';
import { createTossBookingPayment } from '../../../services/paymentService';
import { previewApplyVoucher } from '../../../services/voucherAPI';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { validateEmail } from '../../../utils/emailValidator';
import { API_ENDPOINTS } from '../../../config/api';
import {
  ArrowLeft,
  CreditCard,
  Users,
  ClipboardList,
  Tag,
  Sparkles,
  Loader2,
  History,
  Home,
  CheckCircle2,
  XCircle,
  Info,
  Ticket,
  X,
} from 'lucide-react';
import styles from './BookingCheckPaymentPage.module.css';


// Format số tiền thành định dạng KRW: VND / 18 = KRW (ví dụ: 1800000 -> "100,000 KRW"), sử dụng Intl.NumberFormat với locale 'ko-KR'
const formatCurrency = (value) => {
  if (!Number.isFinite(Number(value))) return '—';
  try {
    const krwValue = Math.round(Number(value) / 18);
    return new Intl.NumberFormat('ko-KR').format(krwValue) + ' KRW';
  } catch (error) {
    return Math.round(Number(value) / 18).toLocaleString('ko-KR') + ' KRW';
  }
};

// Format số phần trăm: round nếu là số nguyên, nếu không thì làm tròn 2 chữ số thập phân, remove trailing zeros (ví dụ: 10 -> "10%", 10.5 -> "10.5%")
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
  const { showSuccess, showInfo } = useToast();
  const { t } = useTranslation();

  const [error, setError] = useState('');
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
  // Voucher preview response: chứa finalDepositAmount và finalRemainingAmount từ preview-apply endpoint để tính toán số tiền thanh toán
  const [voucherPreview, setVoucherPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusBanner, setStatusBanner] = useState(null);
  const lastLoadedBookingIdRef = useRef(null);
  const loadAvailableVouchersRef = useRef(null);
  const guestsLoadedRef = useRef(false);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [showBackToWizardModal, setShowBackToWizardModal] = useState(false);
  const [actionConfirmState, setActionConfirmState] = useState({
    open: false,
    title: '',
    message: '',
    confirmLabel: '',
    onConfirm: null,
  });

  // Load booking information và tính toán tổng tiền
  useEffect(() => {
    let isMounted = true;

    if (navState?.booking && !booking) {
      const navBooking = navState.booking;
      setBooking(navBooking);
      
      if (bookingId) {
        const navVoucherCode = navState?.voucherCode || navBooking?.voucherCode;
        const hasValidVoucherCode = navVoucherCode && 
          navVoucherCode !== 'none' && 
          navVoucherCode.trim() !== '' &&
          navVoucherCode !== null &&
          navVoucherCode !== undefined;
        
        if (hasValidVoucherCode) {
          previewApplyVoucher(bookingId)
            .then((preview) => {
              if (!isMounted) return;
              if (preview) {
                setVoucherPreview(preview);
                setVoucherApplied(true);
                setVoucherCode(preview.voucherCode || navVoucherCode || '');
                setDiscountAmount(Number(preview.discountAmount || 0));
                setTotalAmount(Number(preview.finalTotal || navBooking.totalAmount || 0));
                setOriginalTotal(Number(preview.originalTotal || navBooking.totalAmount || 0));
              }
            })
            .catch((err) => {
              if (navVoucherCode && navVoucherCode !== 'none' && navVoucherCode.trim() !== '') {
                return previewApplyVoucher(bookingId, navVoucherCode);
              }
              throw err;
            })
            .then((preview) => {
              if (preview && !isMounted) return;
              if (preview) {
                setVoucherPreview(preview);
                setVoucherApplied(true);
                setVoucherCode(preview.voucherCode || navVoucherCode || '');
                setDiscountAmount(Number(preview.discountAmount || 0));
                setTotalAmount(Number(preview.finalTotal || navBooking.totalAmount || 0));
                setOriginalTotal(Number(preview.originalTotal || navBooking.totalAmount || 0));
              }
            })
            .catch((err) => {
              // Silently handle error
            });
        } else {
          setVoucherApplied(false);
          setDiscountAmount(0);
          setVoucherCode('');
          setVoucherPreview(null);
        }
      }
    }

    // Tính toán tổng tiền từ booking snapshot khi có tourId: fetch tour từ API, tính tổng từ adults * adultPrice + children * childrenPrice + babies * babyPrice
    const computeFromBookingSnapshot = async (b) => {
      try {
        if (!b?.tourId) return;
        const tourResp = await fetch(API_ENDPOINTS.TOUR_BY_ID(b.tourId));
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
      } catch {
        // Silently handle error
      }
    };

    if (navState?.booking && originalTotal == null) {
      computeFromBookingSnapshot(navState.booking);
    }

    // Load booking và tổng tiền từ API: tránh load lại nếu bookingId không đổi, validate bookingId, load booking/total/guests song song với Promise.allSettled, xử lý voucher preview, xử lý tổng tiền (ưu tiên từ API, fallback tính từ tour), xử lý guests (ưu tiên từ guestsRes API, fallback từ bookingRes)
    const loadBooking = async () => {
      if (lastLoadedBookingIdRef.current === bookingId) {
        setIsLoading(false);
        return;
      }
      lastLoadedBookingIdRef.current = bookingId;

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
        guestsLoadedRef.current = false;

        const [bookingRes, totalRes, guestsRes] = await Promise.allSettled([
          getBookingById(bookingId),
          getBookingTotal(bookingId),
          getGuestsByBookingId(bookingId),
        ]);

        if (!isMounted) return;

        let hasVoucherPreview = false;
        const loadedBooking = bookingRes.status === 'fulfilled' ? bookingRes.value : null;

        if (bookingRes.status === 'fulfilled') {
          if (!loadedBooking?.totalAmount && !loadedBooking?.tourId) {
            setStatusBanner({
              type: 'error',
              text: t('payment.checkPayment.toast.bookingMissingAmount') || 'Booking thiếu thông tin số tiền. Vui lòng liên hệ hỗ trợ.',
            });
            setError(t('payment.checkPayment.toast.bookingMissingAmount') || 'Booking thiếu thông tin số tiền.');
            setIsLoading(false);
            return;
          }
          
          setBooking(loadedBooking);
          
          if (bookingId) {
            const navVoucherCode = navState?.voucherCode || loadedBooking?.voucherCode;
            const hasValidVoucherCode = navVoucherCode && 
              navVoucherCode !== 'none' && 
              navVoucherCode.trim() !== '' &&
              navVoucherCode !== null &&
              navVoucherCode !== undefined;
            
            if (hasValidVoucherCode) {
              try {
                let preview = await previewApplyVoucher(bookingId);
                if (preview) {
                  setVoucherPreview(preview);
                  setVoucherApplied(true);
                  setVoucherCode(preview.voucherCode || navVoucherCode || '');
                  setDiscountAmount(Number(preview.discountAmount || 0));
                  setTotalAmount(Number(preview.finalTotal || loadedBooking.totalAmount || 0));
                  setOriginalTotal(Number(preview.originalTotal || loadedBooking.totalAmount || 0));
                  hasVoucherPreview = true;
                }
              } catch (err) {
                if (navVoucherCode && navVoucherCode !== 'none' && navVoucherCode.trim() !== '') {
                  try {
                    const preview = await previewApplyVoucher(bookingId, navVoucherCode);
                    if (preview) {
                      setVoucherPreview(preview);
                      setVoucherApplied(true);
                      setVoucherCode(preview.voucherCode || navVoucherCode);
                      setDiscountAmount(Number(preview.discountAmount || 0));
                      setTotalAmount(Number(preview.finalTotal || loadedBooking.totalAmount || 0));
                      setOriginalTotal(Number(preview.originalTotal || loadedBooking.totalAmount || 0));
                      hasVoucherPreview = true;
                    }
                  } catch (fallbackErr) {
                    // Silently handle error
                  }
                }
              }
            } else {
              setVoucherApplied(false);
              setDiscountAmount(0);
              setVoucherCode('');
              setVoucherPreview(null);
            }
          }
        } else {
          const msg = String(bookingRes.reason?.message || '');
          setStatusBanner({
            type: 'error',
            text:
              msg && msg.toLowerCase().includes('unauthenticated')
                ? t('payment.checkPayment.toast.sessionExpired')
                : t('payment.checkPayment.toast.cannotLoadBooking'),
          });
          setError(
            msg && msg.toLowerCase().includes('unauthenticated')
              ? t('payment.checkPayment.toast.loginToViewBooking') || 'Vui lòng đăng nhập để xem booking'
              : t('payment.checkPayment.toast.cannotLoadBookingSupport') || 'Không thể tải thông tin booking'
          );
          if (msg.toLowerCase().includes('unauthenticated')) {
            navigate('/login');
          }
          return;
        }

        if (loadedBooking) {
          if (totalRes.status === 'fulfilled' && Number(totalRes.value?.totalAmount) > 0) {
            const base = Number(totalRes.value.totalAmount);
            if (!hasVoucherPreview) {
              setOriginalTotal(base);
              setTotalAmount(base);
              setDiscountAmount(0);
              setVoucherApplied(false);
            } else {
              if (originalTotal == null || originalTotal === 0) {
                setOriginalTotal(base);
              }
            }
          } else if (!hasVoucherPreview) {
            try {
              const b = loadedBooking;
              if (b?.tourId) {
                const tourResp = await fetch(API_ENDPOINTS.TOUR_BY_ID(b.tourId));
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
        }

        let finalGuests = [];

        if (guestsRes.status === 'fulfilled' && guestsRes.value) {
          const guestsData = Array.isArray(guestsRes.value)
            ? guestsRes.value
            : (guestsRes.value?.result || guestsRes.value?.guests || guestsRes.value?.data || []);

          if (Array.isArray(guestsData)) {
            finalGuests = guestsData;
            guestsLoadedRef.current = true;
          }
        }

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
          setError(t('payment.checkPayment.toast.loginToViewBooking') || 'Vui lòng đăng nhập để xem booking');
          navigate('/login');
          return;
        }
        setStatusBanner({
          type: 'error',
          text: t('payment.checkPayment.toast.cannotLoadBooking'),
        });
        setError(t('payment.checkPayment.toast.cannotLoadBookingSupport') || 'Không thể tải thông tin booking');
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
  }, [bookingId, user?.email, navigate, t]);

  // Load lại guests riêng nếu chưa có (fallback): chỉ chạy sau khi booking đã load, delay 200ms để đảm bảo booking đã được set, gọi getGuestsByBookingId
  useEffect(() => {
    if (!bookingId || !booking || guestsLoadedRef.current) return;

    let isActive = true;

    const loadGuests = async () => {
      if (guestsLoadedRef.current) {
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
        if (!isActive) return;
      }
    };

    const timer = setTimeout(() => {
      loadGuests();
    }, 200);

    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [bookingId, booking?.bookingId]);

  // Load danh sách voucher khả dụng cho booking: lưu function vào ref để có thể gọi từ nơi khác, lọc bỏ voucher hết hạn hoặc hết số lượng, normalize và parse dữ liệu voucher từ API (parse discountType, discountValue, discountAmount, finalTotal, originalTotal), tính discountLabel để hiển thị trên UI
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
        const vouchers = [];

        if (!isActive) {
          return [];
        }

        if (!Array.isArray(vouchers)) {
          setAvailableVouchers([]);
          return [];
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const validVouchers = vouchers.filter((v) => {
          const remaining = v?.remainingQuantity;
          if (remaining !== null && remaining !== undefined && remaining <= 0) {
            return false;
          }

          const rawEndDate = v?.endDate || v?.meta?.endDate || v?.expiryDate;
          if (!rawEndDate) return true; // nếu BE không gửi endDate thì coi như luôn hiển thị
          const end = new Date(rawEndDate);
          if (Number.isNaN(end.getTime())) return true;
          end.setHours(23, 59, 59, 999); // còn hiệu lực đến hết ngày endDate
          return end >= today;
        });

        if (validVouchers.length === 0) {
          setAvailableVouchers([]);
          return [];
        }

        const normalized = validVouchers.map((v) => {
          // Helper: Parse số từ nhiều format khác nhau (string, number, null, undefined): normalize string (remove non-digits, handle comma/dot), convert sang Number, return null nếu không parse được
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

          // Parse discountType từ API: có thể là string, object enum (Java enum với property name/value/toString), hoặc null, normalize về PERCENT hoặc FIXED
          let rawType = '';
          let hasDiscountTypeFromAPI = false;

          if (v.discountType !== undefined && v.discountType !== null) {
            if (typeof v.discountType === 'string') {
              rawType = v.discountType.trim().toUpperCase();
              hasDiscountTypeFromAPI = rawType === 'PERCENT' || rawType === 'FIXED';
            } else if (typeof v.discountType === 'object') {
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

          const discountAmount = parsePossibleNumber(v.discountAmount) ?? 0;
          const finalTotal = parsePossibleNumber(v.finalTotal);
          let originalTotal = parsePossibleNumber(v.originalTotal);
          if (originalTotal === null && finalTotal !== null && discountAmount > 0) {
            originalTotal = finalTotal + discountAmount;
          }

          let discountValue = parsePossibleNumber(v.discountValue);

          let discountType = null;
          if (hasDiscountTypeFromAPI) {
            discountType = rawType;
          } else {
            discountType = 'FIXED';
          }

          if (discountType !== 'PERCENT' && discountType !== 'FIXED') {
            discountType = 'FIXED';
          }

          // Tính discountLabel để hiển thị trên UI: PERCENT hiển thị phần trăm (ví dụ: -10%), FIXED hiển thị số tiền (ví dụ: -100.000 KRW), fallback tính phần trăm từ discountAmount và originalTotal nếu không có discountValue
          let discountLabel = '';
          if (discountType === 'PERCENT') {
            if (discountValue !== null && discountValue > 0) {
              discountLabel = `-${formatPercent(discountValue)}`;
            } else if (originalTotal && discountAmount > 0) {
              const computedPercent = (discountAmount / originalTotal) * 100;
              if (Number.isFinite(computedPercent) && computedPercent > 0) {
                discountValue = Math.round(computedPercent * 100) / 100;
                discountLabel = `-${formatPercent(discountValue)}`;
              }
            } else {
              discountLabel = '-%';
            }
          } else {
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
  }, [bookingId]);

  // Xử lý xóa voucher: clear voucherCode, set voucherApplied = false, set discountAmount = 0, restore totalAmount về originalTotal
  const handleClearVoucher = () => {
    setVoucherCode('');
    setVoucherApplied(false);
    setDiscountAmount(0);
    setVoucherPreview(null);
    if (originalTotal != null) {
      setTotalAmount(originalTotal);
    }
  };

  // Xử lý thay đổi voucher code input: nếu xóa hết code thì clear voucher selection, nếu thay đổi code thì reset trạng thái (voucherApplied = false, discountAmount = 0, restore totalAmount về originalTotal)
  const handleVoucherChange = (event) => {
    const newValue = event.target.value;
    setVoucherCode(newValue);

    if (!newValue || newValue.trim() === '') {
      setVoucherApplied(false);
      setDiscountAmount(0);
      if (originalTotal != null) {
        setTotalAmount(originalTotal);
      }
      return;
    }

    setVoucherApplied(false);
    setDiscountAmount(0);
    if (originalTotal != null) {
      setTotalAmount(originalTotal);
    }
  };

  // Xử lý phím Enter trong ô voucher: prevent default và stop propagation, gọi handleApplyVoucher với voucherCode hiện tại
  const handleVoucherKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      handleApplyVoucher();
    }
  };

  // Khi rời khỏi ô voucher (blur): nếu có mã thì tự apply voucher với voucherCode đã trim
  const handleVoucherBlur = () => {
    const trimmed = voucherCode?.trim();
    if (!trimmed) {
      return;
    }
    handleApplyVoucher(trimmed);
  };

  // Mở modal xác nhận cho một hành động bất kỳ: set actionConfirmState với title, message, confirmLabel, onConfirm
  const openActionConfirm = ({ title, message, confirmLabel, onConfirm }) => {
    setActionConfirmState({
      open: true,
      title,
      message,
      confirmLabel,
      onConfirm,
    });
  };

  const handleActionConfirm = () => {
    if (typeof actionConfirmState.onConfirm === 'function') {
      actionConfirmState.onConfirm();
    }
    setActionConfirmState((prev) => ({
      ...prev,
      open: false,
      onConfirm: null,
    }));
  };

  const handleActionCancel = () => {
    setActionConfirmState((prev) => ({
      ...prev,
      open: false,
      onConfirm: null,
    }));
  };

  // Xử lý thay đổi email input: set userEmail từ event.target.value
  const handleEmailChange = (event) => {
    setUserEmail(event.target.value);
  };

  // Xác định số tiền cần thanh toán dựa vào status: ưu tiên sử dụng finalDepositAmount và finalRemainingAmount từ voucher preview nếu có, nếu oneTimePayment = true hoặc PENDING_PAYMENT thì thanh toán finalTotal/totalAmount, nếu PENDING_DEPOSIT_PAYMENT thì thanh toán finalDepositAmount/depositAmount, nếu PENDING_BALANCE_PAYMENT thì thanh toán finalRemainingAmount/(totalAmount - payedAmount)
  const getPaymentAmount = () => {
    const status = booking?.bookingStatus || booking?.status;
    const statusString = String(status || '').toUpperCase();
    
    const isOneTimePayment = voucherPreview?.oneTimePayment || 
      (booking?.depositPercentage === 100) || 
      (booking?.depositPercentage === 0);
    
    if (voucherPreview) {
      if (isOneTimePayment || statusString === 'PENDING_PAYMENT') {
        const amount = Number(voucherPreview.finalTotal || totalAmount || 0);
        return amount;
      }
      
      if (statusString === 'PENDING_DEPOSIT_PAYMENT') {
        const amount = Number(voucherPreview.finalDepositAmount || 0);
        return amount;
      }
      
      if (statusString === 'PENDING_BALANCE_PAYMENT' || navState?.isBalancePayment) {
        const amount = Number(voucherPreview.finalRemainingAmount || 0);
        return amount;
      }
    }
    
    if (isOneTimePayment || statusString === 'PENDING_PAYMENT') {
      const amount = booking?.totalAmount || totalAmount || 0;
      return amount;
    }
    
    if (statusString === 'PENDING_DEPOSIT_PAYMENT') {
      const amount = booking?.depositAmount || 0;
      return amount;
    }
    
    if (statusString === 'PENDING_BALANCE_PAYMENT' || navState?.isBalancePayment) {
      const amount = (booking?.totalAmount || 0) - (booking?.payedAmount || 0);
      return amount;
    }
    
    return totalAmount || 0;
  };

  // Xác định isDeposit cho API: ưu tiên 1 - navState.paymentType (balance = false, deposit/full = true), ưu tiên 2 - navState.isBalancePayment (true = false), ưu tiên 3 - bookingStatus (PENDING_DEPOSIT_PAYMENT/PENDING_PAYMENT = true, PENDING_BALANCE_PAYMENT = false), mặc định = false, return boolean isDeposit
  const getIsDeposit = () => {
    const status = booking?.bookingStatus || booking?.status;
    const statusString = String(status || '').toUpperCase();
    const paymentType = navState?.paymentType;
    
    if (paymentType === 'balance') {
      return false;
    }
    if (paymentType === 'deposit') {
      return true;
    }
    if (paymentType === 'full') {
      return true;
    }
    
    if (navState?.isBalancePayment === true) {
      return false;
    }
    
    if (statusString === 'PENDING_DEPOSIT_PAYMENT') {
      return true;
    }
    
    if (statusString === 'PENDING_PAYMENT') {
      return true;
    }
    
    if (statusString === 'PENDING_BALANCE_PAYMENT') {
      return false;
    }
    
    return false;
  };

  // Xử lý submit form thanh toán: validate bookingId, validate email, validate booking exists và có tourId, validate payment amount, gọi createTossBookingPayment với isDeposit và paymentAmount, navigate đến TossPaymentPage với orderResponse
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!bookingId) {
      setError(t('payment.checkPayment.toast.missingBookingIdError') || 'Thiếu booking ID');
      return;
    }

    const emailValidation = validateEmail(userEmail);
    if (!emailValidation.isValid) {
      setError(emailValidation.error || t('payment.checkPayment.toast.invalidEmail') || 'Email không hợp lệ');
      return;
    }

    setIsSubmitting(true);
    setStatusBanner(null);

    try {
      if (!booking) {
        setError(t('payment.checkPayment.toast.cannotLoadBooking') || 'Không thể tải thông tin booking. Vui lòng thử lại.');
        setIsSubmitting(false);
        return;
      }

      if (!booking.tourId && !booking.tour?.tourId) {
        setError(t('payment.checkPayment.toast.bookingMissingTour') || 'Booking thiếu thông tin tour. Vui lòng liên hệ hỗ trợ.');
        setStatusBanner({
          type: 'error',
          text: t('payment.checkPayment.toast.bookingMissingTour') || 'Booking thiếu thông tin tour. Vui lòng liên hệ hỗ trợ.',
        });
        setIsSubmitting(false);
        return;
      }

      const isDeposit = getIsDeposit();
      const paymentAmount = getPaymentAmount();

      if (!paymentAmount || paymentAmount <= 0) {
        const errorMsg = t('payment.checkPayment.toast.invalidAmount') || 'Số tiền thanh toán không hợp lệ. Vui lòng kiểm tra lại thông tin booking.';
        setError(errorMsg);
        setStatusBanner({
          type: 'error',
          text: errorMsg,
        });
        setIsSubmitting(false);
      return;
    }

      const response = await createTossBookingPayment({
        bookingId,
        userEmail,
        voucherCode: booking?.voucherCode || '',  // Lấy từ booking, không từ input
        isDeposit: isDeposit,
      });

      if (!response?.success) {
        throw new Error(response?.message || 'Không thể tạo đơn thanh toán Toss.');
      }

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
      let message = error?.message || t('payment.checkPayment.toast.tossPaymentError');
      
      if (message.includes('500') || message.includes('Server error')) {
        message = t('payment.checkPayment.toast.serverError') || 
          'Lỗi server khi xử lý thanh toán. Vui lòng kiểm tra lại thông tin booking hoặc liên hệ hỗ trợ.';
      } else if (message.includes('Invalid amount') || message.includes('invalid amount')) {
        message = t('payment.checkPayment.toast.invalidAmount') || 
          'Số tiền thanh toán không hợp lệ. Vui lòng kiểm tra lại thông tin booking.';
      } else if (message.includes('Booking') && message.includes('not found')) {
        message = t('payment.checkPayment.toast.bookingNotFound') || 
          'Không tìm thấy thông tin booking. Vui lòng thử lại.';
      }
      
      setStatusBanner({
        type: 'error',
        text: message,
      });
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Áp dụng voucher từ code: gọi API endpoint preview-apply với bookingId và voucherCode, sử dụng giá trị từ API response (originalTotal, discountAmount, finalTotal, finalDepositAmount, finalRemainingAmount), cập nhật state (originalTotal, discountAmount, totalAmount, voucherApplied, voucherCode, voucherPreview), hiển thị thông báo thành công, handle error và clear voucher nếu invalid
  const handleApplyVoucher = async (codeOverride) => {
    const codeToApply = (codeOverride ?? voucherCode)?.trim();
    if (!bookingId || !codeToApply) {
      setError(t('payment.checkPayment.toast.voucherCodeRequired') || 'Vui lòng nhập mã voucher');
      return;
    }

    try {
      const preview = await previewApplyVoucher(bookingId, codeToApply);

      if (!preview) {
        setVoucherApplied(false);
        setDiscountAmount(0);
        if (originalTotal != null) {
          setTotalAmount(originalTotal);
        }
        setError(t('payment.checkPayment.toast.voucherInvalid') || 'Mã voucher không hợp lệ');
        return;
      }

      const original = Number(preview.originalTotal ?? originalTotal ?? 0);
      const discount = Number(preview.discountAmount ?? 0);
      const final = Number(preview.finalTotal ?? Math.max(original - discount, 0));
      const finalDeposit = Number(preview.finalDepositAmount ?? 0);
      const finalRemaining = Number(preview.finalRemainingAmount ?? 0);

      if (!Number.isFinite(original) || original <= 0) {
        throw new Error(t('payment.checkPayment.toast.voucherCalculationError'));
      }

      setOriginalTotal(original);
      setDiscountAmount(discount);
      setTotalAmount(final);
      setVoucherApplied(discount > 0);
      setVoucherCode(preview.voucherCode || codeToApply);
      setVoucherPreview(preview);

      if (discount > 0) {
        showSuccess(t('payment.checkPayment.toast.voucherAppliedSuccess', { amount: formatCurrency(discount) }));
      } else {
        showSuccess(t('payment.checkPayment.toast.voucherAppliedNoDiscount'));
      }
    } catch (err) {
      setVoucherApplied(false);
      setDiscountAmount(0);
      setVoucherPreview(null);
      if (originalTotal != null) {
        setTotalAmount(originalTotal);
      }
      setError(err?.message || t('payment.checkPayment.toast.voucherApplyError') || 'Không thể áp dụng voucher');
    }
  };

  // Xử lý chọn voucher từ danh sách: set voucherCode state, gọi handleApplyVoucher với voucher.code, đóng voucher modal
  const handleSelectVoucherFromList = (voucher) => {
    if (!voucher?.code) return;
    setVoucherCode(voucher.code);
    handleApplyVoucher(voucher.code);
    setIsVoucherModalOpen(false);
  };

  // Xử lý mở modal xác nhận quay lại wizard: set showBackToWizardModal state = true
  const handleBackToWizardClick = () => {
    setShowBackToWizardModal(true);
  };

  // Handler cho các button chính để hiển thị modal xác nhận trước khi thực hiện: gọi openActionConfirm với title, message, confirmLabel, onConfirm callback
  const handleViewHistoryClick = () => {
    openActionConfirm({
      title: t('payment.checkPayment.actionConfirm.viewHistoryTitle', {
        defaultValue: 'Xem lịch sử booking?',
      }),
      message: t('payment.checkPayment.actionConfirm.viewHistoryMessage', {
        defaultValue: 'Bạn sẽ được chuyển đến trang lịch sử booking. Các thay đổi trên trang thanh toán hiện tại sẽ không được lưu.',
      }),
      confirmLabel: t('payment.checkPayment.actionConfirm.viewHistoryConfirm', {
        defaultValue: 'Đi đến lịch sử booking',
      }),
      onConfirm: () => navigate('/user/booking-history'),
    });
  };

  const handleGoHomeClick = () => {
    openActionConfirm({
      title: t('payment.checkPayment.actionConfirm.goHomeTitle', {
        defaultValue: 'Về trang chủ?',
      }),
      message: t('payment.checkPayment.actionConfirm.goHomeMessage', {
        defaultValue: 'Bạn sẽ quay lại trang chủ. Các thay đổi trên trang thanh toán hiện tại sẽ không được lưu.',
      }),
      confirmLabel: t('payment.checkPayment.actionConfirm.goHomeConfirm', {
        defaultValue: 'Về trang chủ',
      }),
      onConfirm: () => navigate('/'),
    });
  };

  const handlePayClick = () => {
    openActionConfirm({
      title: t('payment.checkPayment.actionConfirm.payTitle', {
        defaultValue: 'Xác nhận thanh toán?',
      }),
      message: t('payment.checkPayment.actionConfirm.payMessage', {
        defaultValue: 'Vui lòng kiểm tra lại thông tin booking và số tiền thanh toán trước khi tiếp tục.',
      }),
      confirmLabel: t('payment.checkPayment.actionConfirm.payConfirm', {
        defaultValue: 'Tiếp tục thanh toán',
      }),
      onConfirm: () => handleSubmit({ preventDefault: () => { } }),
    });
  };

  // Xử lý xác nhận quay lại wizard để điền lại thông tin: clear tất cả dữ liệu booking cũ trong localStorage, navigate về wizard với step 1, show success toast
  const handleBackToWizardConfirm = () => {
    if (!booking?.tourId) {
      setError(t('payment.checkPayment.toast.backToWizardMissingTour') || 'Thiếu thông tin tour');
      setShowBackToWizardModal(false);
      return;
    }

    const tourId = booking.tourId;

    try {
      localStorage.removeItem(`bookingData_${tourId}`);
      localStorage.removeItem(`hasConfirmedLeave_${tourId}`);
      localStorage.removeItem(`existingBookingId_${tourId}`);

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
      setError(t('payment.checkPayment.toast.backToWizardError') || 'Không thể quay lại wizard');
      setShowBackToWizardModal(false);
    }
  };

  // Xử lý hủy modal: set showBackToWizardModal = false
  const handleBackToWizardCancel = () => {
    setShowBackToWizardModal(false);
  };

  // Helper function để format ngày: format dateString sang DD/MM/YYYY, return '—' nếu không hợp lệ
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

  // Helper function để format date time: format dateString sang DD/MM/YYYY HH:mm với locale vi-VN, return '—' nếu không hợp lệ
  const formatDateTimeDisplay = (dateString) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      if (Number.isNaN(date.getTime())) return dateString;
      return date.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  // Helper function để format gender: map gender string (male/nam, female/nu/nữ, other/khac/khác) sang i18n text, return '—' nếu không có
  const formatGenderDisplay = (gender) => {
    if (!gender) return '—';
    const genderStr = String(gender).toLowerCase();
    if (genderStr === 'male' || genderStr === 'nam') return t('payment.male');
    if (genderStr === 'female' || genderStr === 'nu' || genderStr === 'nữ') return t('payment.female');
    if (genderStr === 'other' || genderStr === 'khac' || genderStr === 'khác') return t('payment.other');
    return gender;
  };

  // Helper function để format guest type: map type string (ADULT, CHILD, BABY/INFANT) sang i18n text, return '—' nếu không có
  const formatGuestType = (type) => {
    if (!type) return '—';
    const typeStr = String(type).toUpperCase();
    if (typeStr === 'ADULT') return t('payment.adult');
    if (typeStr === 'CHILD') return t('payment.child');
    if (typeStr === 'BABY' || typeStr === 'INFANT') return t('payment.baby');
    return type;
  };

  const statusBannerStyles = {
    error: {
      classes: 'border-rose-200 bg-rose-50/90 text-rose-900',
      Icon: XCircle,
    },
    warning: {
      classes: 'border-amber-200 bg-amber-50/90 text-amber-900',
      Icon: Info,
    },
    info: {
      classes: 'border-[#1a8eea]/30 bg-[#EAF3FF] text-[#1a8eea]',
      Icon: CheckCircle2,
    },
  };

  const limitedGuests = Array.isArray(guests) ? guests.slice(0, 3) : [];
  const hasMoreGuests = Array.isArray(guests) && guests.length > 3;

  // Ẩn button "Return to wizard" khi đến từ booking detail hoặc booking history (thanh toán balance hoặc deposit từ detail/history page): check navState.fromBookingDetail, fromBookingHistory, isBalancePayment
  const showBackToWizardButton = !navState?.fromBookingDetail && !navState?.fromBookingHistory && !navState?.isBalancePayment;

  return (
    <>
      <div className={styles['payment-soft-shell']}>
        <div className={styles['payment-soft-card-wrapper']}>
          {showBackToWizardButton && (
            <button
              type="button"
              onClick={handleBackToWizardClick}
              className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-4 py-2 text-xs font-semibold text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:text-[#1670c4]"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#EAF3FF] text-[#1a8eea]">
                <ArrowLeft className="h-3.5 w-3.5" />
              </span>
              <span>{t('payment.checkPayment.actions.backToWizard')}</span>
            </button>
          )}

          <div className={styles['payment-soft-card']}>
            <div className={styles['payment-soft-card__header']}>
              <div className="flex flex-col gap-3">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/80 bg-white/70 px-3 py-1.5 text-xs font-semibold text-gray-600">
                  <CreditCard className="h-4 w-4 text-[#1a8eea]" />
                  {t('payment.checkPayment.badge', { defaultValue: 'Payment Checkout' })}
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">
                    {t('payment.checkPayment.heroTitle', { defaultValue: 'Thanh toán đơn đặt tour' })}
                  </h1>
                  <p className="mt-1.5 max-w-3xl text-sm text-gray-600 leading-relaxed">
                    {t('payment.checkPayment.heroSubtitle', {
                      defaultValue: 'Kiểm tra thông tin, áp dụng voucher và hoàn tất thanh toán dưới đây.'
                    })}
                  </p>
                </div>
              </div>
            </div>

            <div className={styles['payment-soft-card__body']}>
              {statusBanner && (() => {
                const style = statusBannerStyles[statusBanner.type] || statusBannerStyles.info;
                const Icon = style.Icon;
                return (
                  <div className={`mb-6 flex items-start gap-3 rounded-[20px] border px-4 py-4 text-sm font-medium shadow-inner ${style.classes}`}>
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span>{statusBanner.text}</span>
                  </div>
                );
              })()}

              {isLoading ? (
                <div className="flex flex-col items-center justify-center gap-4 py-20 text-gray-600">
                  <Loader2 className="h-10 w-10 animate-spin text-[#1a8eea]" />
                  <span className="font-medium">{t('payment.checkPayment.loadingBooking')}</span>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-8">
                  <section aria-labelledby="booking-summary" className="space-y-4">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-5 w-5 text-gray-500" />
                      <h2 id="booking-summary" className="text-xl font-semibold text-gray-900">
                        {t('payment.checkPayment.bookingInfo')}
                      </h2>
                    </div>

                    {booking ? (
                      <div className="grid gap-5 lg:grid-cols-2">
                        <div className="rounded-[24px] border border-gray-100 bg-gradient-to-br from-white to-[#f6f9ff] shadow-inner">
                          <div className="rounded-t-[24px] border-b border-white/70 bg-white/70 px-5 py-3">
                            <h3 className="text-base font-semibold text-gray-900">
                              {t('payment.checkPayment.bookingSummary.tourBookingInfo')}
                            </h3>
                          </div>
                          <div className="px-5 py-4 space-y-2.5">
                            <div className="flex items-start justify-between border-b border-gray-100/60 pb-3">
                              <span className="text-sm font-semibold text-gray-500">{t('payment.checkPayment.bookingSummary.tourName')}</span>
                              <span className="text-sm font-semibold text-gray-900 text-right flex-1 pl-4">{booking.tourName || '—'}</span>
                            </div>
                            <div className="flex items-start justify-between border-b border-gray-100/60 pb-3">
                              <span className="text-sm font-semibold text-gray-500">{t('payment.checkPayment.bookingSummary.departureDate')}</span>
                              <span className="text-sm font-semibold text-gray-900 text-right flex-1 pl-4">
                                {booking.departureDate ? formatDisplayDate(booking.departureDate) : '—'}
                              </span>
                            </div>
                            <div className="flex items-start justify-between border-b border-gray-100/60 pb-3">
                              <span className="text-sm font-semibold text-gray-500">{t('payment.checkPayment.bookingSummary.contactName')}</span>
                              <span className="text-sm font-semibold text-gray-900 text-right flex-1 break-words pl-4">
                                {booking.contactName || '—'}
                              </span>
                            </div>
                            <div className="flex items-start justify-between border-b border-gray-100/60 pb-3">
                              <span className="text-sm font-semibold text-gray-500">{t('payment.checkPayment.bookingSummary.contactEmail')}</span>
                              <span className="text-sm font-semibold text-gray-900 text-right flex-1 break-words pl-4">
                                {booking.contactEmail || booking.userEmail || '—'}
                              </span>
                            </div>
                            {booking.createdAt && (
                              <div className="flex items-start justify-between">
                                <span className="text-sm font-semibold text-gray-500">{t('payment.checkPayment.bookingSummary.createdAt')}</span>
                                <span className="text-sm font-semibold text-gray-900 text-right flex-1 pl-4">
                                  {formatDateTimeDisplay(booking.createdAt)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="rounded-[24px] border border-gray-100 bg-gradient-to-br from-white to-[#f6f9ff] shadow-inner">
                          <div className="rounded-t-[24px] border-b border-white/70 bg-white/70 px-5 py-3">
                            <div className="flex items-center gap-2 text-gray-900">
                              <Users className="h-5 w-5 text-[#1a8eea]" />
                              <h3 className="text-base font-semibold">
                                {t('payment.checkPayment.guestsInfo.title', { count: guests?.length || 0 })}
                              </h3>
                            </div>
                          </div>
                          <div className="px-5 py-4">
                            {guests && guests.length > 0 ? (
                              <div className="space-y-2.5">
                                {limitedGuests.map((guest, index) => (
                                  <div
                                    key={guest.bookingGuestId || index}
                                    className="flex items-center gap-3 rounded-[14px] border border-white/70 bg-white/90 px-3.5 py-2 text-sm font-semibold text-gray-900"
                                  >
                                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#1a8eea] text-[11px] font-bold text-white">
                                      {index + 1}
                                    </span>
                                    <span className="truncate">{guest.fullName || '—'}</span>
                                    <span className="text-xs font-medium text-gray-500">{formatGenderDisplay(guest.gender)}</span>
                                    <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-[#EAF3FF] px-2.5 py-1 text-[11px] font-semibold text-[#1a8eea]">
                                      <Users className="h-3 w-3" />
                                      {formatGuestType(guest.bookingGuestType)}
                                    </span>
                                  </div>
                                ))}
                                {hasMoreGuests && (
                                  <button
                                    type="button"
                                    onClick={() => setIsGuestModalOpen(true)}
                                    className="flex w-full items-center justify-center gap-2 rounded-[16px] border border-dashed border-[#1a8eea]/50 bg-white/60 px-4 py-2 text-sm font-semibold text-[#1a8eea] transition hover:border-[#1a8eea]"
                                  >
                                    <span>+{guests.length - 3}</span>
                                    {t('payment.checkPayment.guestsInfo.viewAll', { defaultValue: 'View all guests' })}
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-3 py-10 text-gray-500">
                                <Users className="h-10 w-10 text-gray-400" />
                                <p className="text-sm">{t('payment.checkPayment.guestsInfo.noGuests')}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-[28px] border border-gray-100 bg-white/80 px-6 py-6 text-center text-sm text-gray-600 shadow-inner">
                        {t('payment.checkPayment.noBookingFound')}
                      </div>
                    )}
                  </section>

                  <section aria-labelledby="payment-form" className="space-y-4">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-gray-500" />
                      <h2 id="payment-form" className="text-xl font-semibold text-gray-900">
                        {t('payment.checkPayment.paymentInfo')}
                      </h2>
                    </div>

                    <div className="grid gap-4">
                      <div className="hidden">
                        <label htmlFor="userEmail" className="mb-2 block text-sm font-semibold text-gray-700">
                          Email người thanh toán
                        </label>
                        <input
                          id="userEmail"
                          type="email"
                          required
                          value={userEmail}
                          onChange={handleEmailChange}
                          className="w-full rounded-[18px] border border-gray-200 px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-[#1a8eea] focus:outline-none focus:ring-2 focus:ring-[#1a8eea]/40"
                          aria-describedby="userEmail-hint"
                        />
                      </div>

                      {/* Voucher Section - READONLY */}
                      {booking?.voucherCode && (
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-semibold text-gray-700">
                            {t('payment.checkPayment.voucherCode')}
                          </label>
                          <div className="relative inline-flex items-center rounded-[20px] border border-gray-300 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-600 shadow-inner">
                            <Tag className="mr-2 h-4 w-4 text-gray-500" />
                            <span className="flex-1">{booking.voucherCode}</span>
                            <span className="ml-2 text-xs text-gray-500">({t('payment.checkPayment.voucherApplied')})</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Payment Summary - Updated with Voucher Details */}
                    <div className="rounded-[24px] border border-[#1a8eea]/40 bg-gradient-to-br from-[#fefefe] to-[#eaf3ff] px-4 py-4 shadow-[0_20px_70px_rgba(157,168,199,0.2)] sm:px-5 sm:py-4">
                      <div className="flex items-center gap-2 text-gray-900 mb-1.5">
                        <Sparkles className="h-5 w-5 text-[#1a8eea]" />
                        <p className="text-base font-semibold">
                          {t('payment.checkPayment.paymentSummary')}
                        </p>
                      </div>
                      
                      <div className="space-y-2 rounded-[18px] bg-white/85 px-4 py-2.5">
                        {/* Total Tour Price - strikethrough when voucher is applied */}
                        {(originalTotal || booking?.totalAmount) && (
                          <div className="flex items-center justify-between text-sm py-2 border-b border-dashed border-gray-200">
                            <span className="text-gray-600">{t('payment.checkPayment.totalTourPrice')}</span>
                            <span className={`font-semibold ${voucherPreview ? 'line-through text-gray-400 opacity-70' : 'text-gray-900'}`}>
                              {formatCurrency(originalTotal || booking?.totalAmount || 0)}
                            </span>
                          </div>
                        )}

                        {/* Voucher Code Section - READONLY */}
                        {voucherCode && (
                          <div className="py-2 border-b border-dashed border-gray-200">
                            <div className="flex items-center gap-2 mb-2">
                              <Tag className="h-4 w-4 text-gray-500" />
                              <span className="text-sm text-gray-600">{t('booking.step3.payment.voucher')}</span>
                            </div>
                            <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 border border-gray-200">
                              <span className="text-sm font-semibold text-gray-700 flex-1">{voucherCode}</span>
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            </div>
                          </div>
                        )}

                        {/* Discount Amount (when voucher is applied) */}
                        {voucherPreview && (() => {
                          const voucherDiscountAmount = Number(voucherPreview.discountAmount || 0);
                          if (voucherDiscountAmount <= 0) return null;
                          
                          const discountType = voucherPreview.discountType || voucherPreview.meta?.discountType;
                          const discountValue = voucherPreview.discountValue || voucherPreview.meta?.discountValue || 0;
                          
                          // Display based on discount type
                          let discountDisplay = '';
                          if (discountType === 'PERCENT' || discountType === 'PERCENTAGE') {
                            // Show percentage discount (e.g., -20%)
                            const percentValue = Number.isFinite(Number(discountValue)) 
                              ? Math.round(Number(discountValue))
                              : discountValue;
                            discountDisplay = `-${percentValue}%`;
                          } else if (discountType === 'FIXED' || discountType === 'AMOUNT') {
                            // Show fixed amount discount (e.g., -50,000 KRW)
                            discountDisplay = `-${formatCurrency(voucherDiscountAmount)}`;
                          } else {
                            // Fallback: show amount if type is unknown
                            discountDisplay = `-${formatCurrency(voucherDiscountAmount)}`;
                          }
                          
                          return (
                            <div className="flex items-center justify-between text-sm py-2 border-b border-dashed border-gray-200">
                              <span className="text-gray-600">{t('booking.step3.payment.discountLabel')}</span>
                              <span className="font-semibold text-green-600">
                                {discountDisplay}
                              </span>
                            </div>
                          );
                        })()}

                        {/* Final Total (after voucher) - always show when voucher is applied */}
                        {voucherPreview && (
                          <div className="flex items-center justify-between text-sm py-2 border-b border-dashed border-gray-200">
                            <span className="text-gray-600 font-medium">{t('booking.step3.payment.finalTotal')}</span>
                            <span className="font-bold text-blue-600 text-base">
                              {formatCurrency(voucherPreview.finalTotal || totalAmount || 0)}
                            </span>
                          </div>
                        )}

                        {/* Deposit and Balance - only show if NOT oneTimePayment */}
                        {(() => {
                          const isOneTimePayment = voucherPreview?.oneTimePayment || 
                            (booking?.depositPercentage === 100) || 
                            (booking?.depositPercentage === 0);
                          
                          if (isOneTimePayment) return null;
                          
                          return (
                            <>
                              {/* Deposit Amount - use finalDepositAmount if voucher applied */}
                              {(() => {
                                const depositAmount = voucherPreview?.finalDepositAmount || booking?.depositAmount || 0;
                                const depositPercentage = booking?.depositPercentage || 0;
                                return depositAmount > 0 ? (
                                  <div className="flex items-center justify-between text-sm py-2 border-b border-dashed border-gray-200">
                                    <span className="text-gray-600">
                                      {t('booking.step3.payment.depositAmount')}
                                      {depositPercentage > 0 && ` (${depositPercentage}%)`}
                                    </span>
                                    <span className="font-semibold text-gray-900">
                                      {formatCurrency(depositAmount)}
                                    </span>
                                  </div>
                                ) : null;
                              })()}

                              {/* Remaining Amount - use finalRemainingAmount if voucher applied */}
                              {(() => {
                                const remainingAmount = voucherPreview?.finalRemainingAmount || 
                                  (booking?.totalAmount && booking?.depositAmount ? booking.totalAmount - booking.depositAmount : 0);
                                return remainingAmount > 0 ? (
                                  <div className="flex items-center justify-between text-sm py-2">
                                    <span className="text-gray-600">{t('booking.step3.payment.balanceAmount')}</span>
                                    <span className="font-semibold text-gray-900">
                                      {formatCurrency(remainingAmount)}
                                    </span>
                                  </div>
                                ) : null;
                              })()}
                            </>
                          );
                        })()}

                        {/* Hiển thị số tiền đã thanh toán (chỉ khi không phải oneTimePayment và không phải đang thanh toán remaining) */}
                        {(() => {
                          const isOneTimePayment = voucherPreview?.oneTimePayment || 
                            (booking?.depositPercentage === 100) || 
                            (booking?.depositPercentage === 0);
                          const status = booking?.bookingStatus || booking?.status;
                          const statusString = String(status || '').toUpperCase();
                          const isBalancePayment = statusString === 'PENDING_BALANCE_PAYMENT' || navState?.isBalancePayment;
                          
                          // Không hiển thị paidAmount khi:
                          // 1. oneTimePayment (thanh toán 100%)
                          // 2. Đang thanh toán remaining (PENDING_BALANCE_PAYMENT)
                          if (isOneTimePayment || isBalancePayment) {
                            return null;
                          }
                          
                          // Chỉ hiển thị khi có payedAmount > 0
                          if (booking?.payedAmount > 0) {
                            return (
                              <div className="flex items-center justify-between text-sm py-2 border-b border-dashed border-gray-200">
                                <span className="text-gray-600">{t('payment.checkPayment.paidAmount')}</span>
                                <span className="font-semibold text-green-600">
                                  {formatCurrency(booking.payedAmount)}
                                </span>
                              </div>
                            );
                          }
                          
                          return null;
                        })()}
                        
                        {/* Hiển thị số tiền CẦN thanh toán lần này */}
                        <div className="flex items-center justify-between pt-3 mt-2 border-t-2 border-dashed border-[#1a8eea]/30">
                          <span className="text-base font-bold text-gray-900">
                            {booking?.bookingStatus === 'PENDING_DEPOSIT_PAYMENT' 
                              ? t('payment.checkPayment.depositDue')
                              : booking?.bookingStatus === 'PENDING_BALANCE_PAYMENT'
                              ? t('payment.checkPayment.balanceDue')
                              : t('payment.checkPayment.amountDue')}
                          </span>
                          <span className="text-2xl font-bold text-[#1a8eea]">
                            {formatCurrency(getPaymentAmount())}
                          </span>
                        </div>
                      </div>
                    </div>
                  </section>

                  <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-end">
                    <button
                      type="button"
                      onClick={handleViewHistoryClick}
                      className="inline-flex items-center justify-center gap-2 rounded-[20px] border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-900 shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300"
                    >
                      <History className="h-4 w-4" />
                      {t('payment.checkPayment.actions.viewHistory')}
                    </button>
                    <button
                      type="button"
                      onClick={handleGoHomeClick}
                      className="inline-flex items-center justify-center gap-2 rounded-[20px] border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-900 shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300"
                    >
                      <Home className="h-4 w-4" />
                      {t('payment.checkPayment.actions.viewHome', { defaultValue: 'Về trang chủ' })}
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting || !booking}
                      onClick={handlePayClick}
                      className="inline-flex items-center justify-center gap-2 rounded-[20px] border border-transparent bg-[#1a8eea] px-8 py-3 text-base font-bold text-white shadow-[0_18px_45px_rgba(26,142,234,0.35)] transition hover:-translate-y-0.5 hover:bg-[#1670c4] disabled:cursor-not-allowed disabled:bg-gray-400"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin text-white" />
                          <span>{t('payment.checkPayment.actions.processing')}</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-5 w-5" />
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

      {/* Modal xác nhận chung cho các hành động trên trang */}
      {actionConfirmState.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleActionCancel}
            aria-hidden="true"
          />
          <div className="relative z-50 w-full max-w-md overflow-hidden rounded-[28px] border border-white/70 bg-white/95 shadow-[0_30px_100px_rgba(157,168,199,0.35)]">
            <div className="border-b border-white/60 bg-gradient-to-r from-[#eaf3ff] to-[#fff6fb] px-6 py-5">
              <div className="mb-1 flex items-center gap-2">
                <Info className="h-5 w-5 text-[#1a8eea]" />
                <h3 className="text-lg font-semibold text-gray-900">
                  {actionConfirmState.title}
                </h3>
              </div>
            </div>
            <div className="px-6 py-5">
              <p className="mb-6 text-sm text-gray-600">
                {actionConfirmState.message}
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleActionCancel}
                  className="rounded-[18px] border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-300"
                >
                  {t('payment.checkPayment.actionConfirm.cancel', {
                    defaultValue: 'Hủy',
                  })}
                </button>
                <button
                  type="button"
                  onClick={handleActionConfirm}
                  className="rounded-[18px] border border-transparent bg-[#1a8eea] px-5 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(26,142,234,0.3)] transition hover:-translate-y-0.5 hover:bg-[#1670c4]"
                >
                  {actionConfirmState.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal chọn voucher */}
      {isVoucherModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsVoucherModalOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-50 w-full max-w-2xl overflow-hidden rounded-[32px] border border-white/70 bg-white/95 shadow-[0_35px_110px_rgba(164,176,209,0.4)]">
            <div className="flex items-start justify-between border-b border-white/60 bg-gradient-to-r from-[#eaf3ff] to-[#fff6fb] px-6 py-5">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/70 px-3 py-1 text-xs font-semibold text-gray-600">
                  <Ticket className="h-3.5 w-3.5 text-[#1a8eea]" />
                  {t('payment.checkPayment.voucherModal.badge', { defaultValue: 'Voucher soft list' })}
                </div>
                <h3 className="text-xl font-semibold text-gray-900">{t('payment.checkPayment.voucherModal.title')}</h3>
                <p className="text-sm text-gray-600">{t('payment.checkPayment.voucherModal.subtitle')}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsVoucherModalOpen(false)}
                className="rounded-full bg-white/70 p-2 text-gray-600 transition hover:-translate-y-0.5 hover:text-gray-900"
                aria-label={t('payment.checkPayment.voucherModal.close')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto px-6 py-6">
              {isLoadingVouchers ? (
                <div className="flex flex-col items-center justify-center gap-4 py-16 text-gray-600">
                  <Loader2 className="h-8 w-8 animate-spin text-[#1a8eea]" />
                  <span className="font-medium">{t('payment.checkPayment.voucherModal.loading')}</span>
                </div>
              ) : availableVouchers.length > 0 ? (
                <div className="space-y-3">
                  {availableVouchers.map((v) => {
                    const discountBadge = v.discountLabel || '';
                    const isSelected =
                      voucherCode &&
                      v.code &&
                      voucherCode.toUpperCase().trim() === v.code.toUpperCase().trim();
                    return (
                      <div
                        key={v.id || v.voucherId || v.code}
                        onClick={() => handleSelectVoucherFromList(v)}
                        className={`cursor-pointer rounded-[24px] border px-5 py-4 transition ${isSelected
                          ? 'border-[#1a8eea] bg-[#EAF3FF]'
                          : 'border-gray-200 bg-white hover:border-[#1a8eea] hover:bg-gray-50'
                          }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="mb-1 flex items-center gap-2">
                              <Ticket className="h-5 w-5 text-[#1a8eea]" />
                              <p className="text-base font-semibold text-gray-900">{v.code}</p>
                              {isSelected && <CheckCircle2 className="h-5 w-5 text-[#1a8eea]" />}
                            </div>
                            <p className="ml-7 text-sm text-gray-500">
                              {discountBadge
                                ? t('payment.checkPayment.voucherModal.discountLabel', {
                                  discount: discountBadge.replace(/^-/, ''),
                                })
                                : t('payment.checkPayment.voucherModal.available')}
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
                                className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-300"
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
                              className={`inline-flex items-center justify-center gap-2 rounded-[18px] border border-transparent px-4 py-2 text-sm font-semibold text-white transition ${isSelected
                                ? 'bg-gray-500 hover:bg-gray-600'
                                : 'bg-[#1a8eea] hover:bg-[#1670c4]'
                                }`}
                            >
                              {isSelected ? t('payment.checkPayment.voucherApplied') : t('payment.checkPayment.voucherModal.apply')}
                            </button>
                          </div>
                        </div>
                        {Number(v.discountAmount) > 0 && (
                          <div className="ml-7 mt-3 inline-flex items-center gap-1 rounded-full border border-[#1a8eea]/30 bg-white px-3 py-1 text-xs font-semibold text-[#1a8eea]">
                            <Tag className="h-3.5 w-3.5" />
                            {t('payment.checkPayment.voucherModal.savings', { amount: formatCurrency(v.discountAmount) })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
                  <Ticket className="mx-auto h-10 w-10 text-gray-400" />
                  <p className="mt-3 text-sm font-medium text-gray-600">
                    {t('payment.checkPayment.voucherModal.noVouchers')}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-white/80 px-6 py-4">
              <button
                type="button"
                onClick={() => setIsVoucherModalOpen(false)}
                className="rounded-[18px] border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-300"
              >
                {t('payment.checkPayment.voucherModal.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal xem toàn bộ khách */}
      {isGuestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsGuestModalOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-50 w-full max-w-2xl overflow-hidden rounded-[32px] border border-white/70 bg-white/95 shadow-[0_35px_110px_rgba(164,176,209,0.38)]">
            <div className="flex items-start justify-between border-b border-white/60 bg-gradient-to-r from-[#eaf3ff] to-[#fff6fb] px-6 py-5">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/70 px-3 py-1 text-xs font-semibold text-gray-600">
                  <Users className="h-4 w-4 text-[#1a8eea]" />
                  {t('payment.checkPayment.guestsInfo.badge', { defaultValue: 'Guest list' })}
                </div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {t('payment.checkPayment.guestsInfo.fullTitle', { defaultValue: 'Danh sách hành khách' })}
                </h3>
                <p className="text-sm text-gray-600">
                  {t('payment.checkPayment.guestsInfo.fullSubtitle', { defaultValue: 'Tất cả hành khách trong booking này' })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsGuestModalOpen(false)}
                className="rounded-full bg-white/70 p-2 text-gray-600 transition hover:-translate-y-0.5 hover:text-gray-900"
                aria-label={t('payment.checkPayment.guestsInfo.closeModal', { defaultValue: 'Đóng danh sách hành khách' })}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[65vh] overflow-y-auto px-6 py-5">
              {Array.isArray(guests) && guests.length > 0 ? (
                <div className="space-y-3">
                  {guests.map((guest, index) => (
                    <div
                      key={guest.bookingGuestId || index}
                      className="rounded-[20px] border border-gray-100 bg-white/90 px-5 py-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#1a8eea] text-sm font-bold text-white shadow">
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {guest.fullName || '—'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatGenderDisplay(guest.gender)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF3FF] px-3 py-1 text-[#1a8eea]">
                            <Users className="h-3.5 w-3.5" />
                            {formatGuestType(guest.bookingGuestType)}
                          </span>
                          {guest.dateOfBirth && (
                            <span className="rounded-full bg-gray-100 px-3 py-1">
                              {formatDisplayDate(guest.dateOfBirth)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-sm text-gray-500">
                  {t('payment.checkPayment.guestsInfo.noGuests')}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end border-t border-gray-100 bg-white/80 px-6 py-4">
              <button
                type="button"
                onClick={() => setIsGuestModalOpen(false)}
                className="rounded-[18px] border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-300"
              >
                {t('payment.checkPayment.guestsInfo.close', { defaultValue: 'Đóng' })}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal xác nhận quay lại wizard */}
      {showBackToWizardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleBackToWizardCancel}
            aria-hidden="true"
          />
          <div className="relative z-50 w-full max-w-md overflow-hidden rounded-[28px] border border-white/70 bg-white/95 shadow-[0_30px_100px_rgba(157,168,199,0.35)]">
            <div className="border-b border-white/60 bg-gradient-to-r from-[#eaf3ff] to-[#fff6fb] px-6 py-5">
              <div className="mb-2 flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-[#1a8eea]" />
                <h3 className="text-xl font-semibold text-gray-900">
                  {t('payment.checkPayment.backToWizardModal.title')}
                </h3>
              </div>
            </div>
            <div className="px-6 py-6">
              <p className="mb-6 text-sm text-gray-600">
                {t('payment.checkPayment.backToWizardModal.message')}
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleBackToWizardCancel}
                  className="rounded-[18px] border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-300"
                >
                  {t('payment.checkPayment.backToWizardModal.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleBackToWizardConfirm}
                  className="rounded-[18px] border border-transparent bg-[#1a8eea] px-5 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(26,142,234,0.3)] transition hover:-translate-y-0.5 hover:bg-[#1670c4]"
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
