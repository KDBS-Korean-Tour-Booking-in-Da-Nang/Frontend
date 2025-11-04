import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './Dashboard.module.css';

const Dashboard = () => {
  const { t } = useTranslation();

  const analytics = [
    { label: t('companyDashboard.analytics.sales'), value: '$48.8k', delta: '+3,4%', trend: 'up', sub: `${t('companyDashboard.analytics.lastYear')} $32640` },
    { label: t('companyDashboard.analytics.purchase') || 'Purchase', value: '$15.4k', delta: '+2,8%', trend: 'up', sub: `${t('companyDashboard.analytics.lastYear')} $14832` },
    { label: t('companyDashboard.analytics.return') || 'Return', value: '$348.0', delta: '-1,2%', trend: 'down', sub: `${t('companyDashboard.analytics.lastYear')} $342` },
    { label: t('companyDashboard.analytics.marketing'), value: '$14.4k', delta: '+2,4%', trend: 'up', sub: `${t('companyDashboard.analytics.lastYear')} $12854` }
  ];

  return (
    <div className={styles.dashboardRoot}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{t('companyDashboard.sidebar.dashboard')}</h1>
        <p className={styles.pageSubtitle}>{t('companyDashboard.header.subtitle') || t('companyDashboard.welcome.subtitle')}</p>
      </div>
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <label className={styles.selectLabel}>{t('companyDashboard.charts.period') || 'Show:'}</label>
          <select className={styles.topSelect}>
            <option>{t('companyDashboard.filters.thisYear') || 'This Year'}</option>
            <option>{t('companyDashboard.filters.lastYear') || 'Last Year'}</option>
            <option>{t('companyDashboard.filters.thisQuarter') || 'This Quarter'}</option>
            <option>{t('companyDashboard.filters.thisMonth') || 'This Month'}</option>
          </select>
        </div>
        <button className={styles.downloadButton}>{t('companyDashboard.actions.download') || 'Download Report'}</button>
      </div>

      <div className={styles.analyticsGrid}>
        {analytics.map((a, i) => (
          <div key={i} className={styles.analyticsCard}>
            <div className={styles.cardHeader}>
              <span className={styles.cardLabel}>{a.label}</span>
              <span className={styles.cardDots}>⋯</span>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.cardValue}>{a.value}</div>
              <div className={`${styles.deltaBadge} ${a.trend === 'up' ? styles.deltaUp : styles.deltaDown}`}>
                {a.delta}
              </div>
            </div>
            <div className={styles.cardSub}>{a.sub}</div>
          </div>
        ))}
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <div className={styles.panelTitleGroup}>
            <h3 className={styles.panelTitle}>{t('companyDashboard.panel.title')}</h3>
            <div className={styles.panelSubtitle}>{t('companyDashboard.panel.subtitle')}</div>
          </div>
          <div className={styles.panelActions}>
            <div className={`${styles.pill} ${styles.activePill}`}>{t('companyDashboard.panel.marketing')}</div>
            <div className={styles.pill}>{t('companyDashboard.panel.sales')}</div>
            <div className={styles.sortWrap}>
              <span className={styles.sortLabel}>{t('companyDashboard.panel.sortBy')}</span>
              <select className={styles.sortSelect}>
                <option>{t('companyDashboard.panel.monthly')}</option>
                <option>{t('companyDashboard.panel.weekly')}</option>
                <option>{t('companyDashboard.panel.daily')}</option>
              </select>
            </div>
          </div>
        </div>

        <div className={styles.chartBox}>
          <svg className={styles.chartSvg} viewBox="0 0 1000 320" preserveAspectRatio="none">
            <defs>
              <linearGradient id="areaA" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="areaB" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#34d399" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0,200 C120,200 140,180 220,180 C300,180 320,120 420,120 C520,120 560,220 640,220 C720,220 760,160 840,160 C920,160 940,240 1000,240 L1000,320 L0,320 Z" fill="url(#areaA)" />
            <path d="M0,240 C120,240 160,260 240,260 C320,260 360,180 440,180 C520,180 560,220 640,220 C720,220 760,260 840,260 C920,260 960,200 1000,200 L1000,320 L0,320 Z" fill="url(#areaB)" />
            <polyline fill="none" stroke="#3b82f6" strokeWidth="3" points="0,200 120,200 220,180 420,120 640,220 840,160 1000,240" />
            <polyline fill="none" stroke="#10b981" strokeWidth="3" points="0,240 240,260 440,180 640,220 840,260 1000,200" />
          </svg>
          <div className={styles.chartXAxis}>
            <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span>
          </div>
          <div className={styles.chartYAxisLabel}>{t('companyDashboard.panel.yLabel')}</div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;


