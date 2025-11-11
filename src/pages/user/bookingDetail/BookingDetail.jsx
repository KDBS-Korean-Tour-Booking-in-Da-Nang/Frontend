import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getBookingById } from '../../../services/bookingAPI';
import styles from './BookingDetail.module.css';

const normalizeStatus = (status) => {
  if (typeof status === 'number') return status === 1 ? 'PURCHASED' : status === 2 ? 'CANCELLED' : 'PENDING';
  if (status === '0') return 'PENDING';
  if (status === '1') return 'PURCHASED';
  if (status === '2') return 'CANCELLED';
  return String(status || 'PENDING').toUpperCase();
};

const BookingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getBookingById(id);
        setBooking(data);
      } catch (e) {
        if (e?.message === 'Unauthenticated') {
          navigate('/login', { state: { redirectTo: `/user/booking/${id}` } });
          return;
        }
        setError(e.message || 'Failed to load booking');
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  const status = useMemo(() => normalizeStatus(booking?.bookingStatus || booking?.status), [booking]);
  const isPending = status === 'PENDING';

  if (loading) {
    return (
      <div className={styles['booking-detail-container']}>
        <div className={styles['loading']}>
          <div className={styles['spinner']} />
          <p>{t('bookingHistory.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles['booking-detail-container']}>
        <div className={styles['error']}>
          <h3>{t('bookingHistory.error.title')}</h3>
          <p>{error}</p>
          <button className={styles['btn']} onClick={() => navigate(-1)}>
            {t('bookingHistory.backButton')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles['booking-detail-container']}>
      <div className={styles['header']}>
        <button className={styles['back']} onClick={() => navigate(-1)}>← {t('bookingHistory.backButton')}</button>
        <h1>{t('bookingHistory.title')}</h1>
      </div>

      <div className={styles['card']}>
        <div className={styles['row']}>
          <div className={styles['label']}>{t('bookingHistory.card.bookingId')}</div>
          <div className={styles['value']}>#{booking.bookingId}</div>
        </div>
        <div className={styles['row']}>
          <div className={styles['label']}>{t('payment.tourName')}</div>
          <div className={styles['value']}>{booking.tourName || booking.tour?.tourName || '-'}</div>
        </div>
        <div className={styles['row']}>
          <div className={styles['label']}>{t('payment.departureDate')}</div>
          <div className={styles['value']}>{booking.departureDate}</div>
        </div>
        <div className={styles['row']}>
          <div className={styles['label']}>{t('payment.totalGuests')}</div>
          <div className={styles['value']}>{booking.totalGuests}</div>
        </div>
        <div className={styles['row']}>
          <div className={styles['label']}>{t('bookingHistory.card.contactName')}</div>
          <div className={styles['value']}>{booking.contactName}</div>
        </div>
        <div className={styles['row']}>
          <div className={styles['label']}>{t('bookingHistory.card.contactPhone')}</div>
          <div className={styles['value']}>{booking.contactPhone}</div>
        </div>
        <div className={styles['row']}>
          <div className={styles['label']}>Email</div>
          <div className={styles['value']}>{booking.contactEmail}</div>
        </div>
        <div className={styles['row']}>
          <div className={styles['label']}>{t('bookingHistory.filters.status')}</div>
          <div className={styles['value']}>
            {status === 'PURCHASED' ? t('bookingHistory.status.purchased') : status === 'CANCELLED' ? t('bookingHistory.status.cancelled') : t('bookingHistory.status.pending')}
          </div>
        </div>
      </div>

    </div>
  );
};

export default BookingDetail;


