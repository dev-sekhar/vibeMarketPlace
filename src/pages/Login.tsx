import { Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SSOButtons } from '../components/auth/SSOButtons';
import { useTranslation } from 'react-i18next';
import styles from './Auth.module.css';

export const Login = () => {
  const { t } = useTranslation();

  return (
    <div className={styles.page}>
      <div className={`glass-panel ${styles.card}`}>
        <div className={styles.brand}>
          <Zap color="var(--accent-secondary)" fill="var(--accent-secondary)" size={28} />
          <span>VibeMarket</span>
        </div>

        <h1 className={styles.heading}>{t('login.title')}</h1>
        <p className={styles.sub}>{t('login.subtitle')}</p>

        <SSOButtons />

        <p className={styles.switchText}>
          {t('login.noAccount')}{' '}
          <Link to="/register" className={styles.switchLink}>{t('login.createAccount')}</Link>
        </p>
      </div>
    </div>
  );
};
