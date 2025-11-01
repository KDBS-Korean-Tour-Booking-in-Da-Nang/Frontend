import React from 'react';
import TourList from './TourList/TourList';
import styles from './Tour.module.css';

const Tour = () => {
  return (
    <div className={styles['tour-page']}>
      <TourList />
    </div>
  );
};

export default Tour;
