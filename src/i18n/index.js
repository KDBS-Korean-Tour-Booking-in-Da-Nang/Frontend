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
	// Standard i18n behavior: if i18nextLng exists, use it; otherwise use Vietnamese
	const savedLanguage = localStorage.getItem('i18nextLng');
	return savedLanguage || 'vi';
};

i18n
	.use(initReactI18next)
	.init({
		resources,
		lng: getInitialLanguage(),
		fallbackLng: 'vi',
		supportedLngs: ['vi', 'en', 'ko'],
		interpolation: {
			escapeValue: false,
		},
	});

// Override changeLanguage to save to localStorage
const originalChangeLanguage = i18n.changeLanguage;
i18n.changeLanguage = (lng) => {
	localStorage.setItem('i18nextLng', lng);
	return originalChangeLanguage.call(i18n, lng);
};

export default i18n;
