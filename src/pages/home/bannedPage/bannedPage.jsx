import { useNavigate } from 'react-router-dom';
import { UserX, LogIn, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from '../errorPages/ErrorPages.module.css';

const BannedPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className={styles.container}>
      <div className={styles.backgroundBlobs}>
        <div className={styles.blob1} />
        <div className={styles.blob2} />
        <div className={styles.blob3} />
      </div>
      <div className={styles.contentWrapper}>
        <div className={styles.card}>
          <div className={styles.content}>
            {/* Icon */}
            <div className={styles.iconWrapper}>
              <UserX className={styles.icon} />
            </div>

            <h1 className={styles.title}>{t('auth.banned.title')}</h1>
            <h2 className={styles.subtitle}>{t('auth.banned.subtitle')}</h2>

            <p className={styles.description}>
              {t('auth.banned.description')}
            </p>

            <div className={styles.infoBox}>
              <p className={styles.infoText}>
                {t('auth.banned.info')}
              </p>
            </div>

            <div className={styles.buttonGroup}>
              <button
                onClick={() => navigate('/login')}
                className={styles.secondaryButton}
                aria-label={t('auth.banned.ariaBackToLogin')}
              >
                <LogIn style={{ width: '1rem', height: '1rem', strokeWidth: 2 }} />
                <span>{t('auth.banned.backToLogin')}</span>
              </button>
              <button
                onClick={() => navigate('/')}
                className={styles.primaryButton}
                aria-label={t('auth.banned.ariaBackToHome')}
              >
                <Home style={{ width: '1rem', height: '1rem', strokeWidth: 2 }} />
                <span>{t('auth.banned.backToHome')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BannedPage;
