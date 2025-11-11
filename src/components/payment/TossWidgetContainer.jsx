import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Align with backend sample (checkout.html uses v2/standard)
const TOSS_WIDGET_URL = 'https://js.tosspayments.com/v2/standard';
const CURRENCY_CODE = (import.meta.env.VITE_TOSS_CURRENCY || 'KRW').toUpperCase();

let tossScriptPromise = null;

const ensureTossScript = () => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Toss widget requires a browser environment'));
  }

  if (window.TossPayments) {
    return Promise.resolve(window.TossPayments);
  }

  if (!tossScriptPromise) {
    tossScriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${TOSS_WIDGET_URL}"]`);

      const handleLoad = () => {
        if (window.TossPayments) {
          resolve(window.TossPayments);
        } else {
          reject(new Error('TossPayments global not found after script load'));
        }
      };

      const handleError = () => {
        reject(new Error('Failed to load TossPayments script'));
      };

      if (existing) {
        existing.addEventListener('load', handleLoad, { once: true });
        existing.addEventListener('error', handleError, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = TOSS_WIDGET_URL;
      script.async = true;
      script.addEventListener('load', handleLoad, { once: true });
      script.addEventListener('error', handleError, { once: true });
      document.body.appendChild(script);
    });
  }

  return tossScriptPromise;
};

const TossWidgetContainer = ({
  clientKey,
  customerKey,
  amount,
  orderId,
  successUrl,
  failUrl,
  message,
  onClose,
  onCancel,
  onError,
  onReady,
}) => {
  const paymentMethodsRef = useRef(null);
  const agreementRef = useRef(null);
  const widgetsRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState(null);
  const [requesting, setRequesting] = useState(false);

  const safeAmount = useMemo(() => {
    const numeric = Number(amount);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return null;
    }
    return numeric;
  }, [amount]);

  const cleanupListeners = useCallback(() => {
    widgetsRef.current = null;
  }, []);

  useEffect(() => {
    let isActive = true;
    setLoading(true);
    setInitError(null);

    if (!clientKey || !customerKey || !safeAmount || !orderId || !successUrl || !failUrl) {
      const missing = ['clientKey', 'customerKey', 'amount', 'orderId', 'successUrl', 'failUrl']
        .filter((key) => {
          if (key === 'amount') return !safeAmount;
          return !Boolean({
            clientKey,
            customerKey,
            orderId,
            successUrl,
            failUrl,
          }[key]);
        });
      const error = new Error(`Missing Toss widget parameters: ${missing.join(', ')}`);
      setInitError(error.message);
      setLoading(false);
      onError?.(error);
      return () => cleanupListeners();
    }

    ensureTossScript()
      .then((TossPayments) => {
        if (!isActive) return;
        const tossPayments = TossPayments(clientKey);
        const widgets = tossPayments.widgets({ customerKey });
        widgetsRef.current = widgets;
        return widgets.setAmount({
          currency: CURRENCY_CODE,
          value: safeAmount,
        });
      })
      .then(() => {
        if (!isActive || !widgetsRef.current) return;
        return Promise.all([
          widgetsRef.current.renderPaymentMethods({
            selector: '#payment-method',
            variantKey: 'DEFAULT',
            amount: {
              currency: CURRENCY_CODE,
              value: safeAmount,
            },
          }),
          widgetsRef.current.renderAgreement({
            selector: '#agreement',
            // Align with sample using "AGREEMENT"
            variantKey: 'AGREEMENT',
          }),
        ]);
      })
      .then(() => {
        if (!isActive) return;
        setLoading(false);
        onReady?.();
      })
      .catch((error) => {
        if (!isActive) return;
        console.error('[Payment] Toss widget init failed', error);
        setInitError(error.message || 'Không thể khởi tạo cổng thanh toán Toss.');
        onError?.(error);
        setLoading(false);
      });

    return () => {
      isActive = false;
      cleanupListeners();
    };
  }, [
    clientKey,
    customerKey,
    safeAmount,
    orderId,
    successUrl,
    failUrl,
    onError,
    onReady,
    cleanupListeners,
  ]);

  const handleCancel = () => {
    console.debug('[Payment] Toss widget cancelled by user', { orderId });
    onCancel?.();
    onClose?.();
  };

  const handleRequestPayment = async () => {
    if (!widgetsRef.current || requesting) return;
    setRequesting(true);
    try {
      await widgetsRef.current.requestPayment({
        orderId,
        orderName: `Booking ${orderId}`,
        successUrl,
        failUrl,
        amount: {
          currency: CURRENCY_CODE,
          value: safeAmount,
        },
      });
    } catch (error) {
      console.error('[Payment] Toss widget requestPayment error', error);
      setRequesting(false);
      onError?.(error);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {message && (
        <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">
          {message}
        </div>
      )}

      {initError && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {initError}
        </div>
      )}

      {loading && (
        <div
          className="flex items-center justify-center rounded-md border border-gray-200 bg-white py-12"
          role="status"
          aria-live="polite"
        >
          <div className="flex flex-col items-center gap-2 text-sm text-gray-600">
            <span className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-500" />
            <span>Đang tải cổng thanh toán Toss...</span>
          </div>
        </div>
      )}

      {!loading && !initError && (
        <>
          <div id="payment-method" ref={paymentMethodsRef} aria-live="polite" />
          <div id="agreement" ref={agreementRef} />

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleRequestPayment}
              disabled={requesting}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {requesting ? 'Đang chuyển hướng...' : 'Thanh toán qua Toss'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default TossWidgetContainer;

