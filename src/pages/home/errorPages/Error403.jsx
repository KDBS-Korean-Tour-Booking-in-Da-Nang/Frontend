import { useNavigate } from 'react-router-dom';
import { ShieldX, Home, ArrowLeft } from 'lucide-react';
import styles from './ErrorPages.module.css';

const Error403 = () => {
  const navigate = useNavigate();

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
              <ShieldX className={styles.icon} />
            </div>

            <h1 className={styles.title}>403</h1>
            <h2 className={styles.subtitle}>Không có quyền truy cập</h2>
            
            <p className={styles.description}>
              Bạn không có quyền truy cập vào trang này. Vui lòng liên hệ quản trị viên nếu bạn cho rằng đây là lỗi.
            </p>

            <div className={styles.infoBox}>
              <p className={styles.infoText}>
                Bạn cần có quyền phù hợp để truy cập tài nguyên này.
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

export default Error403;

