import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Home, RefreshCw, ArrowLeft } from 'lucide-react';
import styles from './ErrorPages.module.css';

const Error500 = () => {
  const navigate = useNavigate();

  const handleRefresh = () => {
    window.location.reload();
  };

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
              <AlertTriangle className={styles.icon} />
            </div>

            <h1 className={styles.title}>500</h1>
            <h2 className={styles.subtitle}>Lỗi máy chủ</h2>
            
            <p className={styles.description}>
              Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau hoặc liên hệ hỗ trợ nếu vấn đề vẫn tiếp tục.
            </p>

            <div className={styles.infoBox}>
              <p className={styles.infoText}>
                Chúng tôi đang khắc phục sự cố này. Vui lòng thử lại sau vài phút.
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
                onClick={handleRefresh}
                className={styles.secondaryButton}
                aria-label="Tải lại trang"
              >
                <RefreshCw style={{ width: '1rem', height: '1rem', strokeWidth: 2 }} />
                <span>Tải lại</span>
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

export default Error500;

