import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();

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
    ? t('payment.result.successTitle')
    : isFailed
    ? t('payment.result.failedTitle')
    : t('payment.result.unknownTitle');

  const subtitle = isSuccess
    ? t('payment.result.successMessage')
    : isFailed
    ? t('payment.result.failedMessage')
    : t('payment.result.unknownMessage');

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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h1 className="text-2xl font-bold text-gray-900">{t('payment.result.title')}</h1>
              </div>
              <p className="text-sm text-gray-700 ml-9">
                {t('payment.result.subtitle')}
              </p>
            </div>

            <div className="px-8 py-8">
              {/* Banner status */}
              <div className={`rounded-xl border px-5 py-4 mb-6 ${bannerClasses}`}>
                <h2 className="text-xl font-bold">{title}</h2>
                <p className="mt-2 text-sm leading-6">{subtitle}</p>
              </div>

              {!hasParams && (
                <div
                  role="alert"
                  className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                >
                    <p>
                      {t('payment.result.missingParams')}
                    </p>
                </div>
              )}

              {hasParams && (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h2 className="text-xl font-bold text-gray-900">{t('payment.result.transactionInfo')}</h2>
                  </div>
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-6 py-4">
                      <dt className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">{t('payment.result.orderId')}</dt>
                      <dd className="break-all text-sm font-semibold text-gray-900">{orderId}</dd>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-6 py-4">
                      <dt className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">{t('payment.result.status')}</dt>
                      <dd className="text-sm font-semibold text-gray-900">{status}</dd>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-6 py-4">
                      <dt className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">{t('payment.result.paymentMethod')}</dt>
                      <dd className="text-sm font-semibold text-gray-900">{paymentMethod}</dd>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-6 py-4">
                      <dt className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">{t('payment.result.amount')}</dt>
                      <dd className="text-sm font-semibold text-gray-900">
                        {formatCurrencyVND(amountRaw)}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => navigate('/user/booking-history')}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#1a8eea] focus:ring-offset-2"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t('payment.result.actions.viewBookingHistory')}
                </button>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#1a8eea] focus:ring-offset-2"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    {t('payment.result.actions.goHome')}
                  </button>
                  <a
                    href="mailto:support@kdbs.com"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-transparent bg-[#1a8eea] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1670c4] focus:outline-none focus:ring-2 focus:ring-[#1a8eea] focus:ring-offset-2"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {t('payment.result.actions.contactSupport')}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

