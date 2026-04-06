import { Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SSOButtons } from '../components/auth/SSOButtons';
import { useTranslation } from 'react-i18next';
import styles from './Auth.module.css';

export const Register = () => {
  const { t } = useTranslation();

  return (
    <div className={styles.page}>
      <div className={`glass-panel ${styles.card}`}>
        <div className={styles.brand}>
          <Zap color="var(--accent-secondary)" fill="var(--accent-secondary)" size={28} />
          <span>VibeMarket</span>
        </div>

        <h1 className={styles.heading}>{t('register.title')}</h1>
        <p className={styles.sub}>{t('register.subtitle')}</p>

        <SSOButtons label="register" />

        <p className={styles.switchText}>
          {t('register.hasAccount')}{' '}
          <Link to="/login" className={styles.switchLink}>{t('register.signIn')}</Link>
        </p>
      </div>
    </div>
  );
};
