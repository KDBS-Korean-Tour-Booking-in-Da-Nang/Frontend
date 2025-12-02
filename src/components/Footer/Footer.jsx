import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Building2, 
  HelpCircle, 
  FileText, 
  Facebook, 
  Twitter, 
  Instagram, 
  Linkedin,
  Mail,
  Phone,
  MapPin,
  ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './Footer.module.css';

const Footer = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.footerContent}>
          {/* Left Section - Brand & Description */}
          <div className={styles.brandSection}>
            {/* Brand */}
            <div className={styles.brand}>
              <img
                src="/logoKDBS.png"
                alt="KDBS Logo"
                className={styles.brandLogo}
                loading="lazy"
              />
              <span className={styles.brandName}>KDBS</span>
            </div>
            
            {/* Description */}
            <p className={styles.description}>
              {t('footer.newsletter.desc')}
            </p>
            
            {/* Company Info Card */}
            <div className={styles.companyInfo}>
              <img
                src="/logoKDBS.png"
                alt="KDBS Logo"
                className={styles.companyInfoLogo}
                loading="lazy"
              />
              <div className={styles.companyInfoText}>
                <p>
                  © {new Date().getFullYear()} KDBS. {t('footer.legal.rights', { defaultValue: 'All rights reserved.' })}
                </p>
                <p>
                  {t('footer.company.title')}: KDBS
                </p>
              </div>
            </div>
          </div>

          {/* Right Section - Navigation Links */}
          <div className={styles.linksSection}>
            {/* Company Column */}
            <div className={styles.linkColumn}>
              <h4 className={styles.linkTitle}>
                <Building2 className={styles.linkIcon} />
                {t('footer.company.title')}
              </h4>
              <ul className={styles.linkList}>
                <li className={styles.linkItem}>
                  <a 
                    href="/about" 
                    className={styles.link}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate('/about');
                    }}
                  >
                    <ExternalLink className={styles.linkIcon} />
                    {t('footer.company.about')}
                  </a>
                </li>
                <li className={styles.linkItem}>
                  <a 
                    href="#" 
                    className={styles.link}
                  >
                    <Mail className={styles.linkIcon} />
                    {t('footer.support.contact')}
                  </a>
                </li>
                <li className={styles.linkItem}>
                  <a 
                    href="#" 
                    className={styles.link}
                  >
                    <HelpCircle className={styles.linkIcon} />
                    {t('footer.support.help')}
                  </a>
                </li>
                <li className={styles.linkItem}>
                  <a 
                    href="#" 
                    className={styles.link}
                  >
                    <Building2 className={styles.linkIcon} />
                    {t('footer.company.careers')}
                  </a>
                </li>
              </ul>
            </div>

            {/* Support Column */}
            <div className={styles.linkColumn}>
              <h4 className={styles.linkTitle}>
                <HelpCircle className={styles.linkIcon} />
                {t('footer.support.title')}
              </h4>
              <ul className={styles.linkList}>
                <li className={styles.linkItem}>
                  <a 
                    href="#" 
                    className={styles.link}
                  >
                    <HelpCircle className={styles.linkIcon} />
                    {t('footer.support.help')}
                  </a>
                </li>
                <li className={styles.linkItem}>
                  <a 
                    href="#" 
                    className={styles.link}
                  >
                    <Phone className={styles.linkIcon} />
                    {t('footer.support.contact')}
                  </a>
                </li>
                <li className={styles.linkItem}>
                  <a 
                    href="#" 
                    className={styles.link}
                  >
                    <MapPin className={styles.linkIcon} />
                    {t('footer.support.status')}
                  </a>
                </li>
                <li className={styles.linkItem}>
                  <a 
                    href="/forum" 
                    className={styles.link}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate('/forum');
                    }}
                  >
                    <ExternalLink className={styles.linkIcon} />
                    {t('footer.support.community')}
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal Column */}
            <div className={styles.linkColumn}>
              <h4 className={styles.linkTitle}>
                <FileText className={styles.linkIcon} />
                {t('footer.legal.title')}
              </h4>
              <ul className={styles.linkList}>
                <li className={styles.linkItem}>
                  <a 
                    href="/article" 
                    className={styles.link}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate('/article');
                    }}
                  >
                    <ExternalLink className={styles.linkIcon} />
                    {t('footer.company.blog')}
                  </a>
                </li>
                <li className={styles.linkItem}>
                  <a 
                    href="#" 
                    className={styles.link}
                  >
                    <FileText className={styles.linkIcon} />
                    {t('footer.legal.privacy')}
                  </a>
                </li>
                <li className={styles.linkItem}>
                  <a 
                    href="#" 
                    className={styles.link}
                  >
                    <FileText className={styles.linkIcon} />
                    {t('footer.legal.terms')}
                  </a>
                </li>
                <li className={styles.linkItem}>
                  <a 
                    href="#" 
                    className={styles.link}
                  >
                    <FileText className={styles.linkIcon} />
                    {t('footer.legal.cookies')}
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className={styles.bottomSection}>
          <p className={styles.copyright}>
            © {new Date().getFullYear()} KDBS. {t('footer.legal.rights', { defaultValue: 'All rights reserved.' })}
          </p>
          <div className={styles.socialLinks}>
            <a 
              href="#" 
              className={styles.socialLink}
              aria-label={t('footer.social.facebook')}
            >
              <Facebook className={styles.socialIcon} />
            </a>
            <a 
              href="#" 
              className={styles.socialLink}
              aria-label={t('footer.social.twitter')}
            >
              <Twitter className={styles.socialIcon} />
            </a>
            <a 
              href="#" 
              className={styles.socialLink}
              aria-label={t('footer.social.instagram')}
            >
              <Instagram className={styles.socialIcon} />
            </a>
            <a 
              href="#" 
              className={styles.socialLink}
              aria-label={t('footer.social.linkedin')}
            >
              <Linkedin className={styles.socialIcon} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;