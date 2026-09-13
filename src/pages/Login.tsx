import { Link, useLocation } from 'react-router-dom';
import { safeReturnPath } from '../lib/authFlow';
import { SSOButtons } from '../components/auth/SSOButtons';
import { useTranslation } from 'react-i18next';
import styles from './Auth.module.css';

export const Login = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const next = safeReturnPath(new URLSearchParams(location.search).get('next'));

  return (
    <div className={styles.page}>
      <div className={`glass-panel ${styles.card}`}>
        <h1 className={`${styles.heading} ${styles.centered}`}>{t('login.title')}</h1>
        <p className={`${styles.sub} ${styles.centered}`}>{t('login.subtitle')}</p>

        <SSOButtons />

        <p className={`${styles.switchText} ${styles.centered}`}>
          {t('login.noAccount')}{' '}
          <Link to={'/register?next=' + encodeURIComponent(next)} className={styles.switchLink}>{t('login.createAccount')}</Link>
        </p>
      </div>
    </div>
  );
};
