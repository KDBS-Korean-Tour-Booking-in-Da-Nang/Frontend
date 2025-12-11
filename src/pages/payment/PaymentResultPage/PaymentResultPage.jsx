import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  XCircle,
  Info,
  History,
  Home,
  Mail,
  CreditCard,
  Receipt,
  Clock3,
  Hash,
  BadgeCheck,
  Coins,
} from 'lucide-react';
import styles from './PaymentResultPage.module.css';

function sanitize(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/[<>]/g, '').trim();
}

// Format as KRW (BE already processed the conversion, just display)
function formatCurrencyVND(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  try {
    return new Intl.NumberFormat('ko-KR').format(n) + ' KRW';
  } catch {
    return n.toLocaleString('ko-KR') + ' KRW';
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

  const bannerIcon = isSuccess ? CheckCircle2 : isFailed ? XCircle : Info;
  const bannerClasses = isSuccess
    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
    : isFailed
      ? 'border-rose-200 bg-rose-50 text-rose-900'
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
    <div className={styles.shell}>
      <div className={styles.cardWrapper}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className="flex flex-col gap-3">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/80 bg-white/70 px-3 py-1.5 text-xs font-semibold text-gray-600">
                <CreditCard className="h-4 w-4 text-[#1a8eea]" />
                {t('payment.result.title')}
              </div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {t('payment.result.subtitle')}
              </h1>
            </div>
          </div>

          <div className={styles.cardBody}>
            <div className={`mb-5 flex items-center gap-3 rounded-[18px] border px-4 py-3 text-sm shadow-[0_16px_40px_rgba(164,176,209,0.2)] ${bannerClasses}`}>
              {(() => {
                const Icon = bannerIcon;
                return <Icon className="h-6 w-6 flex-shrink-0" />;
              })()}
              <div className="flex-1">
                <p className="text-[11px] uppercase tracking-[0.35em] text-gray-500 mb-0.5">
                  {t('payment.result.statusLabel', { defaultValue: 'Status' })}
                </p>
                <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                <p className="text-xs text-gray-700 mt-0.5">
                  {subtitle}
                </p>
              </div>
            </div>

            {!hasParams && (
              <div
                role="alert"
                className="mb-8 rounded-[18px] border border-rose-200 bg-rose-50/90 px-5 py-4 text-sm text-rose-800 shadow-inner"
              >
                {t('payment.result.missingParams')}
              </div>
            )}

            {hasParams && (
              <div className="mb-8 space-y-4">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-gray-500" />
                  <h2 className="text-lg font-semibold text-gray-900">{t('payment.result.transactionInfo')}</h2>
                </div>
                <dl className="grid gap-4 lg:grid-cols-2">
                  {[
                    { label: t('payment.result.orderId'), value: orderId, icon: Hash, compact: true },
                    { label: t('payment.result.status'), value: status, icon: BadgeCheck, compact: true },
                    { label: t('payment.result.paymentMethod'), value: paymentMethod, icon: CreditCard },
                    { label: t('payment.result.amount'), value: formatCurrencyVND(amountRaw), icon: Coins },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.label}
                        className={`flex items-center gap-3 rounded-[20px] border border-gray-100 bg-white/90 px-4 shadow-inner ${item.compact ? 'py-2.5' : 'py-3'}`}
                      >
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#EAF3FF] text-[#1a8eea]">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div>
                          <dt className="text-[10px] uppercase tracking-[0.35em] text-gray-500">{item.label}</dt>
                          <dd
                            className={`mt-1 font-semibold text-gray-900 ${item.compact ? 'text-xs leading-snug break-all' : 'text-sm break-all'}`}
                          >
                            {item.value}
                          </dd>
                        </div>
                      </div>
                    );
                  })}
                </dl>
              </div>
            )}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-2.5">
              <button
                type="button"
                onClick={() => navigate('/user/booking-history')}
                className="inline-flex w-full items-center justify-center gap-2 rounded-[18px] border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-900 shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 sm:w-[200px]"
              >
                <History className="h-4 w-4" />
                {t('payment.result.actions.viewBookingHistory')}
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="inline-flex w-full items-center justify-center gap-2 rounded-[18px] border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-900 shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 sm:w-[130px]"
              >
                <Home className="h-4 w-4" />
                {t('payment.result.actions.goHome')}
              </button>
              <a
                href="mailto:support@kdbs.com"
                className="inline-flex w-full items-center justify-center gap-2 rounded-[18px] border border-transparent bg-[#1a8eea] px-4 py-2.5 text-xs font-semibold text-white no-underline shadow-[0_12px_30px_rgba(26,142,234,0.3)] transition hover:-translate-y-0.5 hover:bg-[#1670c4] sm:w-[165px]"
              >
                <Mail className="h-4 w-4" />
                {t('payment.result.actions.contactSupport')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

