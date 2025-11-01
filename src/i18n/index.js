import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import viCommon from '../locales/vi/common.json';
import enCommon from '../locales/en/common.json';
import koCommon from '../locales/ko/common.json';

// Configure resources
const resources = {
	vi: { translation: viCommon },
	en: { translation: enCommon },
	ko: { translation: koCommon },
};

// Get language from localStorage or default to Vietnamese
const getInitialLanguage = () => {
    const savedLanguage = localStorage.getItem('i18nextLng');
    if (!savedLanguage) return 'vi';
    // Normalize regional variants like vi-VN, en-US → vi, en
    const base = savedLanguage.split('-')[0].toLowerCase();
    return ['vi', 'en', 'ko'].includes(base) ? base : 'vi';
};

i18n
	.use(initReactI18next)
	.init({
		resources,
        lng: getInitialLanguage(),
		fallbackLng: 'vi',
		supportedLngs: ['vi', 'en', 'ko'],
        // Ensure that if a regional code is provided (e.g., vi-VN),
        // i18next resolves it to the base language resources
        load: 'languageOnly',
        nonExplicitSupportedLngs: true,
		interpolation: {
			escapeValue: false,
		},
	});

// Override changeLanguage to save to localStorage
const originalChangeLanguage = i18n.changeLanguage;
i18n.changeLanguage = (lng) => {
    const normalized = (lng || '').split('-')[0].toLowerCase();
    localStorage.setItem('i18nextLng', normalized || 'vi');
    return originalChangeLanguage.call(i18n, normalized || 'vi');
};

export default i18n;