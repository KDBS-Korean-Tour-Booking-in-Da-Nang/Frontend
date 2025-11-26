import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Clock, CheckCircle2, Mail, ArrowLeft } from 'lucide-react';
import styles from './pendingPage.module.css';

const PendingPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    // Lấy email từ localStorage
    const email = localStorage.getItem('userEmail');
    if (email) {
      setUserEmail(email);
    } else {
      // Nếu không có email, chuyển về trang đăng ký
      navigate('/register');
    }
  }, [navigate]);


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
            {/* Icon pending */}
            <div className={styles.iconWrapper}>
              <Clock className={styles.icon} />
            </div>

            <h1 className={styles.title}>{t('pending.title')}</h1>
            
            <p className={styles.subtitle}>{t('pending.submitted')}</p>

            <div className={styles.infoBox}>
              <h2 className={styles.infoTitle}>{t('pending.infoTitle')}</h2>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>
                  <Mail className={styles.icon} style={{ width: '0.875rem', height: '0.875rem', display: 'inline', marginRight: '0.25rem' }} />
                  {t('pending.email')}:
                </span> {userEmail}
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>{t('pending.status')}:</span> 
                <span className={styles.statusBadge}>
                  {t('pending.statusPending')}
                </span>
              </div>
            </div>

            <div className={styles.processBox}>
              <h3 className={styles.processTitle}>{t('pending.processTitle')}</h3>
              <div className={styles.processSteps}>
                <div className={styles.processStep}>
                  <div className={`${styles.stepIcon} ${styles.stepIconCompleted}`}>
                    <CheckCircle2 className={styles.stepIconInner} />
                  </div>
                  <span className={styles.stepText}>{t('pending.step1')}</span>
                </div>
                <div className={styles.processStep}>
                  <div className={`${styles.stepIcon} ${styles.stepIconPending}`}>
                    <Clock className={styles.stepIconInner} />
                  </div>
                  <span className={styles.stepText}>{t('pending.step2')}</span>
                </div>
                <div className={styles.processStep}>
                  <div className={`${styles.stepIcon} ${styles.stepIconWaiting}`}>
                    <CheckCircle2 className={styles.stepIconInner} />
                  </div>
                  <span className={`${styles.stepText} ${styles.stepTextWaiting}`}>{t('pending.step3')}</span>
                </div>
              </div>
            </div>

            <div className={styles.notes}>
              <p>{t('pending.note1')}</p>
              <p>{t('pending.note2')}</p>
            </div>

            <div className={styles.buttonGroup}>
              <button
                onClick={() => navigate('/company-info')}
                className={styles.primaryButton}
                aria-label="Quay về trang thông tin công ty"
              >
                <ArrowLeft style={{ width: '1rem', height: '1rem', strokeWidth: 2 }} />
                <span>Quay về trang thông tin công ty</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingPage;
