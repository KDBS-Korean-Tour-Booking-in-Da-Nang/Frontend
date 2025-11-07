import React, { useState, useEffect } from 'react';
import styles from './ScrollToTopButton.module.css';

const ScrollToTopButton = () => {
  const [isVisible, setIsVisible] = useState(false);

  // Hiển thị button khi scroll xuống hơn 300px
  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);

    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  // Scroll lên đầu trang
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <button
      onClick={scrollToTop}
      className={`${styles.scrollToTopBtn} ${isVisible ? styles.visible : styles.hidden}`}
      aria-label="Scroll to top"
      title="Scroll to top"
    >
      <svg
        className={styles.arrowIcon}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 15l7-7 7 7"
        />
      </svg>
    </button>
  );
};

export default ScrollToTopButton;

