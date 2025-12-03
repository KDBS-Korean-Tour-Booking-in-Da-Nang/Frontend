import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';
import styles from './ErrorPages.module.css';

const Error404 = () => {
  const navigate = useNavigate();
  const location = useLocation();

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
              <FileQuestion className={styles.icon} />
            </div>

            <h1 className={styles.title}>404</h1>
            <h2 className={styles.subtitle}>Trang không tìm thấy</h2>
            
            <p className={styles.description}>
              Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
            </p>

            <div className={styles.infoBox}>
              <p className={styles.infoText}>
                <strong>URL:</strong> {location.pathname}
              </p>
            </div>

            <div className={styles.buttonGroup}>
              <button
                onClick={() => navigate(-1)}
                className={styles.secondaryButton}
                aria-label="Quay lại trang trước"
              >
                <ArrowLeft style={{ width: '1rem', height: '1rem', strokeWidth: 2 }} />
                <span>Quay lại</span>
              </button>
              <button
                onClick={() => navigate('/')}
                className={styles.primaryButton}
                aria-label="Về trang chủ"
              >
                <Home style={{ width: '1rem', height: '1rem', strokeWidth: 2 }} />
                <span>Về trang chủ</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Error404;

