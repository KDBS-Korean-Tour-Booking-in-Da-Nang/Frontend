import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import viCommon from '../locales/vi/common.json';
import enCommon from '../locales/en/common.json';
import koCommon from '../locales/ko/common.json';

// Configure resources
const resources = {
	vi: { translation: viCommon },
	en: { translation: enCommon },
	ko: { translation: koCommon },
};

i18n
	.use(LanguageDetector)
	.use(initReactI18next)
	.init({
		resources,
		fallbackLng: 'vi',
		lng: 'vi',
		supportedLngs: ['vi', 'en', 'ko'],
		detection: {
			order: ['localStorage', 'navigator', 'htmlTag'],
			caches: ['localStorage'],
		},
		interpolation: {
			escapeValue: false,
		},
	});

export default i18n;


