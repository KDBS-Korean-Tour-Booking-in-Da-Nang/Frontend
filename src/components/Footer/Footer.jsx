import React from 'react';
import { useTranslation } from 'react-i18next';

const Footer = () => {
  const { t } = useTranslation();
  
  return (
    <footer className="bg-white pt-16 relative z-40">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 pb-10 border-b border-gray-100">
          {/* Left Section - Description & Company Info */}
          <div className="space-y-8">
            {/* Brand */}
            <div className="flex items-center gap-4">
              <img
                src="/logoKDBS.png"
                alt="KDBS Logo"
                className="h-10 w-10 object-contain"
                loading="lazy"
              />
              <span className="text-2xl font-extrabold tracking-tight text-gray-900">KDBS</span>
            </div>
            {/* Description */}
            <p className="text-gray-600 text-lg leading-relaxed max-w-md">
              {t('footer.newsletter.desc')}
            </p>
            
            {/* Company Info Section */}
            <div className="flex items-start gap-3">
              <img
                src="/logoKDBS.png"
                alt="KDBS Logo"
                className="h-6 w-6 object-contain"
                loading="lazy"
              />
              <div className="space-y-2">
                <p className="text-gray-600 text-sm">
                  © {new Date().getFullYear()} KDBS. {t('footer.legal.rights', { defaultValue: 'All rights reserved.' })}
                </p>
                <p className="text-gray-600 text-sm">
                  {t('footer.company.title')}: KDBS
                </p>
              </div>
            </div>
          </div>

          {/* Right Section - Navigation Links */}
          <div className="grid md:grid-cols-3 gap-8">
            {/* About Column */}
            <div className="space-y-4">
              <h4 className="text-lg font-bold text-gray-900">{t('footer.company.title')}</h4>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors duration-300">
                    {t('footer.company.about')}
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors duration-300">
                    {t('footer.support.contact')}
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors duration-300">
                    {t('footer.support.help')}
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors duration-300">
                    {t('footer.company.careers')}
                  </a>
                </li>
              </ul>
            </div>

            {/* Support Column */}
            <div className="space-y-4">
              <h4 className="text-lg font-bold text-gray-900">{t('footer.support.title')}</h4>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors duration-300">
                    {t('footer.support.help')}
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors duration-300">
                    {t('footer.support.contact')}
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors duration-300">
                    {t('footer.support.status')}
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors duration-300">
                    {t('footer.support.community')}
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal Column */}
            <div className="space-y-4">
              <h4 className="text-lg font-bold text-gray-900">{t('footer.legal.title')}</h4>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors duration-300">
                    {t('footer.company.blog')}
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors duration-300">
                    {t('footer.legal.privacy')}
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors duration-300">
                    {t('footer.legal.terms')}
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors duration-300">
                    {t('footer.legal.cookies')}
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;